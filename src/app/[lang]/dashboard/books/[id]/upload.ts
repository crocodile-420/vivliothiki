"use client";
import { supabaseBrowser } from "@/lib/supabase/browser";

// Uploads straight from the browser to storage, so large PDFs never pass through our server.
// Paths start with the user's id, which the storage policies require.
export async function uploadFile(bucket: "covers" | "book-files", userId: string, bookId: string, file: File, name: string) {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "bin";
  const path = `${userId}/${bookId}/${name}-${Date.now()}.${ext}`;
  const { error } = await supabaseBrowser().storage.from(bucket).upload(path, file, { upsert: true, contentType: file.type });
  if (error) throw new Error(error.message);
  return path;
}
