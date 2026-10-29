"use client";
import { useState } from "react";
import type { Dictionary } from "@/i18n/el";
import { supabaseBrowser } from "@/lib/supabase/browser";

// Passwordless sign-in: Supabase emails a magic link that lands on /auth/callback.
export function LoginForm({ lang, text }: { lang: string; text: Dictionary["login"] }) {
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [detail, setDetail] = useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setState("sending");
    const email = String(new FormData(e.currentTarget).get("email"));
    const { error } = await supabaseBrowser().auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=/${lang}/dashboard` },
    });
    // Supabase's own message ("Email rate limit exceeded", "Invalid API key") says what to fix.
    setDetail(error?.message ?? "");
    setState(error ? "error" : "sent");
  }

  if (state === "sent") return <p className="panel mt-6">{text.sent}</p>;
  return (
    <form onSubmit={onSubmit} className="mt-6 space-y-4">
      <label className="label">
        {text.email}
        <input name="email" type="email" required autoComplete="email" className="field" />
      </label>
      <button className="btn w-full" disabled={state === "sending"}>
        {text.send}
      </button>
      {state === "error" && (
        <p className="text-sm text-red-600">
          {text.error}
          {detail && <span className="mt-1 block text-xs opacity-80">{detail}</span>}
        </p>
      )}
    </form>
  );
}
