import type { Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { LoginForm } from "./LoginForm";

export default async function Login({ params }: { params: Promise<{ lang: Locale }> }) {
  const { lang } = await params;
  const t = getDictionary(lang);
  return (
    <div className="mx-auto max-w-sm">
      <h1 className="text-2xl font-bold">{t.login.title}</h1>
      <LoginForm lang={lang} text={t.login} />
    </div>
  );
}
