"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import {
  AlertCircle,
  LoaderCircle,
  Globe,
  Sun,
  Moon,
  ArrowUpLeft,
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

      {/* Header Bar */}
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <Link href="/" className={styles.brand} aria-label="SpooFX">
            <div className={styles.brandLogoWrap}>
              <img
                src="/logo.png"
                width={42}
                height={42}
                alt="SpooFX"
                className={styles.brandLogoImg}
              />
            </div>
            <div className={styles.brandTextWrap}>
              <strong className={styles.brandName} dir="ltr">
                Spoo<span className={styles.brandAccent}>FX</span>
              </strong>

            </div>
          </Link>
          <div className={styles.headerActions}>
            <a className={styles.storeLink} href="https://spoofx.rmz.gg/" target="_blank" rel="noopener noreferrer">{ar ? "المتجر" : "Store"}<ArrowUpLeft size={15} /></a>
            <button type="button" onClick={toggleTheme} aria-label={ar ? (isDark ? "الوضع الفاتح" : "الوضع الداكن") : (isDark ? "Light mode" : "Dark mode")} aria-pressed={isDark}>{isDark ? <Sun size={18} /> : <Moon size={18} />}</button>
            <button type="button" onClick={() => setLang(ar ? "en" : "ar")} aria-label={ar ? "Switch to English" : "التبديل للعربية"}><Globe size={16} /><span>{ar ? "EN" : "عربي"}</span></button>
          </div>
        </div>
      </header>

      {/* Main Showcase & Login Card */}
      <main className={styles.content}>
        {/* Login Card Column */}
        <section className={styles.card} aria-labelledby="sign-in-title">
          <div className={styles.cardLogo}>
            <img
              src="/logo.png"
              width={96}
              height={96}
              alt="SpooFX"
              className={styles.cardLogoImg}
            />
          </div>

          <h2 id="sign-in-title" className={styles.cardTitle}>
            {ar ? "تسجيل الدخول" : "Welcome back"}
          </h2>

          <p className={styles.cardDesc}>
            {ar
              ? "تابع بحساب Google للوصول إلى منتجاتك."
              : "Continue with Google to access your products."}
          </p>

          <button
            type="button"
            className={styles.primary}
            disabled={busy}
            aria-busy={busy}
            onClick={connect}
          >
            {busy ? (
              <LoaderCircle size={18} className={styles.spinner} />
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.85z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"/></svg>
            )}
            <span>
              {busy
                ? (ar ? "جارٍ تسجيل الدخول…" : "Signing in…")
                : (ar ? "تسجيل الدخول" : "Sign in")}
            </span>
          </button>

          {error && (
            <div className={`${styles.errorAlert} auth-error`} role="alert">
              <AlertCircle size={15} className={styles.errorIcon} />
              <span>
                {error === "unavailable"
                  ? (ar
                      ? "تسجيل الدخول غير متاح حالياً حتى يكتمل إعداد Google للموقع."
                      : "Sign-in is unavailable until Google is configured for this site.")
                  : (ar
                      ? "تعذر تسجيل الدخول. يرجى المحاولة مرة أخرى."
                      : "Unable to sign in. Please try again.")}
              </span>
            </div>
          )}

        </section>
      </main>
      <aside className={styles.welcomeCopy}>
        <span className={styles.welcomeLine} aria-hidden="true" />
        <h1>{ar ? "سجّل دخولك الآن" : "Your next step starts here"}</h1>
        <p>{ar ? "منتجاتك وتراخيصك الفعّالة، في مكان واحد." : "Your products and active licenses, in one place."}</p>
      </aside>

    </div>
  );
}
