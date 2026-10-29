import { redirect } from "next/navigation";
import type { Profile } from "@/lib/books";
import { supabaseServer } from "@/lib/supabase/server";

// The signed-in user's profile, or null. Returns null when Supabase isn't configured yet, so pages still render.
export async function currentProfile(): Promise<Profile | null> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return null;
  const supabase = await supabaseServer();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return null;
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", data.user.id).single();
  return (profile as Profile) ?? null;
}

export async function requireProfile(lang: string): Promise<Profile> {
  const profile = await currentProfile();
  if (!profile) redirect(`/${lang}/login`);
  return profile;
}

export async function requireAdmin(lang: string): Promise<Profile> {
  const profile = await requireProfile(lang);
  if (!profile.is_admin) redirect(`/${lang}`);
  return profile;
}
