"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { setCoverImage } from "../../actions";
import { uploadFile } from "./upload";

export function CoverUpload({ bookId, userId, label }: { bookId: string; userId: string; label: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    try {
      const path = await uploadFile("covers", userId, bookId, file, "cover");
      await setCoverImage(bookId, path);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <label className="label mt-3">
      {label}
      <input type="file" accept="image/jpeg,image/png,image/webp" onChange={onChange} disabled={busy} className="mt-1 block w-full text-sm" />
    </label>
  );
}
