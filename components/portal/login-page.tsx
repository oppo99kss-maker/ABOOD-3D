"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import {
  ArrowUpLeft,
  Globe2,
  LogIn,
  LoaderCircle,
  Moon,
  ShieldCheck,
  Sun,
} from "lucide-react";
import { usePreferences } from "./use-preferences";
import styles from "./login-page.module.css";

export function LoginPage() {
  const { lang, isDark, setLang, toggleTheme } = usePreferences();
  const ar = lang === "ar";
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<"unavailable" | "failed" | null>(null);
  useEffect(() => {
    if (new URLSearchParams(window.location.search).has("error"))
      setError("failed");
  }, []);
  async function connect() {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/auth-status", { cache: "no-store" });
      if (!response.ok) throw new Error("Unable to check sign-in");
      const status = await response.json();
      if (!status.configured) {
        setError("unavailable");
        return;
      }
      await signIn("google", { callbackUrl: "/portal" });
    } catch {
      setError("failed");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div
      className={styles.page}
      data-theme={isDark ? "dark" : "light"}
      dir={ar ? "rtl" : "ltr"}
      lang={lang}
    >
      <div className={styles.ambient} aria-hidden="true" />
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <Link href="/" className={styles.brand} aria-label="SpooFX">
            <img src="/brand.svg" width="42" height="42" alt="" />
            <span dir="ltr">
              Spoo<b className="gold">FX</b>
              <small>{ar ? "بوابتك إلى حسابك" : "Your account portal"}</small>
            </span>
          </Link>
          <div className={styles.tools}>
            <button
              className={styles.control}
              onClick={() => setLang(ar ? "en" : "ar")}
              aria-label={ar ? "Switch to English" : "التبديل إلى العربية"}
            >
              <Globe2 size={17} />
              <span>{ar ? "English" : "العربية"}</span>
            </button>
            <button
              className={`${styles.control} ${styles.theme}`}
              onClick={toggleTheme}
              aria-label={ar ? "تبديل المظهر" : "Toggle theme"}
            >
              {isDark ? <Sun size={19} /> : <Moon size={19} />}
            </button>
          </div>
        </div>
      </header>
      <main className={styles.content}>
        <section className={styles.hero} aria-labelledby="login-title">
          <span className={styles.badge}>
            <i />
            {ar ? "بوابة SpooFX" : "WELCOME TO SPOOFX"}
          </span>
          <h1 id="login-title">
            {ar ? (
              <>
                حسابك <span>ومنتجاتك</span>
                <br />
                في مكان واحد
              </>
            ) : (
              <>
                Your account. <span>Your products.</span>
                <br />
                All in one place.
              </>
            )}
          </h1>
          <p className={styles.description}>
            {ar
              ? "سجّل الدخول للوصول إلى حسابك ومنتجاتك ومفاتيحك بسهولة من مكان واحد."
              : "Sign in to access your account, products, and license keys in one place."}
          </p>
        </section>
        <section className={styles.card} aria-labelledby="sign-in-title">
          <div className={styles.cardLogo}>
            <img src="/brand.svg" width="54" height="54" alt="" />
          </div>
          <h2 id="sign-in-title">{ar ? "تسجيل الدخول" : "Welcome back"}</h2>
          <p>
            {ar
              ? "سجّل دخولك للوصول إلى حسابك ومنتجاتك ومفاتيحك."
              : "Sign in to access your account, products, and license keys."}
          </p>
          <button
            className={styles.primary}
            disabled={busy}
            aria-busy={busy}
            onClick={connect}
          >
            {busy ? (
              <LoaderCircle size={20} className={styles.spinner} />
            ) : (
              <LogIn size={21} aria-hidden="true" />
            )}
            <span>
              {busy
                ? ar
                  ? "جارٍ تسجيل الدخول…"
                  : "Signing in…"
                : ar
                  ? "تسجيل الدخول"
                  : "Sign in"}
            </span>
          </button>
          {error && (
            <p className="auth-error" role="alert">
              {error === "unavailable"
                ? ar
                  ? "تسجيل الدخول غير متاح حالياً. يمكنك استعراض البوابة من المعاينة أدناه."
                  : "Sign-in is not available yet. You can explore the preview below."
                : ar
                  ? "تعذر تسجيل الدخول. حاول مرة أخرى."
                  : "Unable to sign in. Please try again."}
            </p>
          )}
          <div className={styles.divider}>
            <span>{ar ? "اكتشف البوابة" : "EXPLORE"}</span>
          </div>
          <p className={styles.storePrompt}>
            {ar
              ? "تعرّف على الواجهة قبل تسجيل الدخول"
              : "Take a look around before signing in"}
          </p>
          <Link className={styles.store} href="/preview">
            {ar ? "معاينة البوابة" : "Preview the portal"}
            <ArrowUpLeft size={17} />
          </Link>
          <span className="login-note">
            <ShieldCheck size={13} />
            {ar
              ? "لا نطلب كلمة مرور حسابك"
              : "We never ask for your Google password"}
          </span>
        </section>
      </main>
      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <p>
            {ar ? "جميع الحقوق محفوظة" : "All rights reserved"}{" "}
            <span dir="ltr">© {new Date().getFullYear()} SpooFX</span>
          </p>
          <span>
            {ar
              ? "حسابك ومنتجاتك ومفاتيحك، في مكان واحد."
              : "Your account, products, and keys in one place."}
          </span>
        </div>
      </footer>
    </div>
  );
}
