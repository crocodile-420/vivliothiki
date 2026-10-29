-- Vivliothiki Books: selling a book through other stores and marketplaces.
-- Run in the Supabase SQL editor after 0001_init.sql.

-- requested: the author asked for it. listed: live on that channel. withdrawing: the author asked us
-- to take a live listing down. paused: taken down for now. rejected: the channel won't take this book
-- (the note says why).
create type channel_status as enum ('requested', 'listed', 'withdrawing', 'paused', 'rejected');

create table book_channels (
  book_id uuid not null references books on delete cascade,
  -- A key from src/lib/channels.ts, such as 'amazon' or 'google_shopping'.
  channel text not null check (channel ~ '^[a-z_]{2,30}$'),
  status channel_status not null default 'requested',
  listing_url text,
  note text not null default '',
  requested_at timestamptz not null default now(),
  listed_at timestamptz,
  primary key (book_id, channel)
);

alter table book_channels enable row level security;

-- Readers see live listings of published books; authors see every row of their own books.
create policy "channels follow book visibility" on book_channels for select
  using (exists (
    select 1 from books b where b.id = book_id
      and ((b.status = 'published' and status = 'listed') or b.author_id = auth.uid())
  ));
-- Authors may ask for a channel, and drop it while it isn't live. Taking a live listing down goes
-- through the platform (service role), which marks it 'withdrawing' for an admin.
create policy "authors request channels" on book_channels for insert
  with check (status = 'requested' and exists (select 1 from books b where b.id = book_id and b.author_id = auth.uid()));
create policy "authors drop channels that aren't live" on book_channels for delete
  using (status in ('requested', 'paused', 'rejected') and exists (select 1 from books b where b.id = book_id and b.author_id = auth.uid()));
revoke insert, update on book_channels from authenticated, anon;
grant insert (book_id, channel) on book_channels to authenticated;
