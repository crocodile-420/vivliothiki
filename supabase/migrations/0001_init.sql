-- Vivliothiki Books: initial schema.
-- Run in the Supabase SQL editor, or with `supabase db push`.

create type book_status as enum ('draft', 'in_review', 'published', 'rejected');
create type edition_format as enum ('paperback', 'hardcover', 'ebook');
create type fulfillment as enum ('digital', 'stock', 'lulu');
create type order_status as enum ('pending', 'paid', 'in_production', 'shipped', 'cancelled', 'failed');

-- One row per signed-up user. Every user can publish, so every user is an author.
create table profiles (
  id uuid primary key references auth.users on delete cascade,
  display_name text not null default '',
  handle text unique,
  bio text not null default '',
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);

create table books (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references profiles on delete cascade,
  slug text not null unique,
  title text not null,
  subtitle text not null default '',
  description text not null default '',
  language text not null default 'el',
  category text not null default 'other',
  cover_image_path text,
  status book_status not null default 'draft',
  review_note text not null default '',
  created_at timestamptz not null default now(),
  published_at timestamptz
);
create index books_author_idx on books (author_id);
create index books_published_idx on books (status, published_at desc);

-- A book is sold in one or more formats. Print formats carry the Lulu package and print files.
create table editions (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references books on delete cascade,
  format edition_format not null,
  price_cents integer not null check (price_cents >= 0),
  isbn text,
  page_count integer check (page_count > 0),
  pod_package_id text,
  -- What Lulu charges us to print one copy (no shipping), refreshed when the edition is saved.
  print_cost_cents integer,
  interior_path text,
  cover_path text,
  ebook_path text,
  lulu_validation jsonb,
  -- Copies printed locally and held by the platform. Orders ship from stock while it lasts, then from Lulu.
  stock_quantity integer not null default 0 check (stock_quantity >= 0),
  stock_unit_cost_cents integer,
  created_at timestamptz not null default now(),
  unique (book_id, format)
);

create table orders (
  id uuid primary key default gen_random_uuid(),
  stripe_session_id text not null unique,
  email text not null,
  status order_status not null default 'pending',
  shipping_address jsonb,
  amount_total_cents integer not null default 0,
  lulu_print_job_id text,
  lulu_status text,
  tracking_url text,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders on delete cascade,
  edition_id uuid not null references editions,
  author_id uuid not null references profiles,
  quantity integer not null check (quantity > 0),
  unit_price_cents integer not null,
  author_earnings_cents integer not null default 0,
  fulfillment fulfillment not null,
  -- Set when a stock item is posted by hand.
  shipped_at timestamptz,
  tracking_url text,
  download_token uuid not null default gen_random_uuid() unique,
  download_count integer not null default 0
);
create index order_items_author_idx on order_items (author_id);
create index order_items_to_ship_idx on order_items (fulfillment, shipped_at);

-- Takes copies from stock only if enough are left; returns whether it did. Avoids overselling under concurrent orders.
create function take_stock(p_edition uuid, p_quantity integer) returns boolean
language sql as $$
  with taken as (
    update editions set stock_quantity = stock_quantity - p_quantity
    where id = p_edition and stock_quantity >= p_quantity
    returning 1
  )
  select exists (select 1 from taken);
$$;
revoke execute on function take_stock from public, anon, authenticated;

-- Create a profile for every new user.
create function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, display_name) values (new.id, coalesce(split_part(new.email, '@', 1), ''));
  return new;
end;
$$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function handle_new_user();

-- Row level security. Orders are written only by the server (service role).
alter table profiles enable row level security;
alter table books enable row level security;
alter table editions enable row level security;
alter table orders enable row level security;
alter table order_items enable row level security;

create policy "profiles are public" on profiles for select using (true);
create policy "users edit own profile" on profiles for update using (auth.uid() = id)
  with check (auth.uid() = id and is_admin = (select p.is_admin from profiles p where p.id = auth.uid()));

create policy "published books are public" on books for select
  using (status = 'published' or author_id = auth.uid());
create policy "authors create books" on books for insert
  with check (author_id = auth.uid() and status = 'draft');
-- Authors may edit drafts and rejected books, and move them to review. Publishing is admin-only.
create policy "authors edit unpublished books" on books for update
  using (author_id = auth.uid() and status in ('draft', 'rejected'))
  with check (author_id = auth.uid() and status in ('draft', 'rejected', 'in_review'));
create policy "authors delete drafts" on books for delete
  using (author_id = auth.uid() and status = 'draft');

create policy "editions follow book visibility" on editions for select
  using (exists (select 1 from books b where b.id = book_id and (b.status = 'published' or b.author_id = auth.uid())));
create policy "authors manage editions of unpublished books" on editions for all
  using (exists (select 1 from books b where b.id = book_id and b.author_id = auth.uid() and b.status in ('draft', 'rejected')))
  with check (exists (select 1 from books b where b.id = book_id and b.author_id = auth.uid() and b.status in ('draft', 'rejected')));

-- Authors may only write the descriptive columns of an edition. Print cost, stock and validation
-- feed into payouts, so only the server (service role) writes them.
revoke insert, update on editions from authenticated, anon;
grant insert (book_id, format, price_cents, isbn, page_count, pod_package_id, interior_path, cover_path, ebook_path)
  on editions to authenticated;
grant update (book_id, format, price_cents, isbn, page_count, pod_package_id, interior_path, cover_path, ebook_path)
  on editions to authenticated;

-- Storage: public cover thumbnails, private print and ebook files. Each user writes under <user id>/.
insert into storage.buckets (id, name, public) values ('covers', 'covers', true), ('book-files', 'book-files', false);

create policy "users upload own covers" on storage.objects for insert to authenticated
  with check (bucket_id = 'covers' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "users replace own covers" on storage.objects for update to authenticated
  using (bucket_id = 'covers' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "users upload own book files" on storage.objects for insert to authenticated
  with check (bucket_id = 'book-files' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "users replace own book files" on storage.objects for update to authenticated
  using (bucket_id = 'book-files' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "users read own book files" on storage.objects for select to authenticated
  using (bucket_id = 'book-files' and (storage.foldername(name))[1] = auth.uid()::text);
