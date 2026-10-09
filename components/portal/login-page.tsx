"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import {
  ArrowUpLeft,
  Box,
  Globe2,
  KeyRound,
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
          <Link href="/" className={styles.brand} aria-label="ABOOD 3D">
            <img src="/brand.svg" width="42" height="42" alt="" />
            <span dir="ltr">
              ABOOD <b className="gold">3D</b>
              <small>
                {ar ? "منتجاتك، في مكان واحد" : "Your products, together"}
              </small>
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
            {ar ? "بوابتك إلى عالم ABOOD 3D" : "YOUR ABOOD 3D PORTAL"}
          </span>
          <h1 id="login-title">
            {ar ? (
              <>
                فعّل <span>مفتاح الترخيص</span>
                <br />
                وافتح جميع المزايا
              </>
            ) : (
              <>
                Activate <span>your license.</span>
                <br />
                Unlock every feature.
              </>
            )}
          </h1>
          <p className={styles.description}>
            {ar
              ? "سجّل دخولك بحساب قوقل للوصول إلى منتجاتك، أدلة الاستخدام والتحديثات. كل ما تحتاجه، في مكان واحد."
              : "Sign in with Google to access your products, guides and updates. Everything you need, in one place."}
          </p>
          <div className="login-features">
            <div>
              <Box size={23} />
              <strong>{ar ? "منتجاتك" : "Your products"}</strong>
              <small>{ar ? "مكتبة منظمة" : "One library"}</small>
            </div>
            <div>
              <KeyRound size={23} />
              <strong>{ar ? "تراخيصك" : "Your licenses"}</strong>
              <small>{ar ? "وصول مباشر" : "Easy access"}</small>
            </div>
            <div>
              <ShieldCheck size={23} />
              <strong>{ar ? "حساب قوقل" : "Google account"}</strong>
              <small>{ar ? "دخول آمن" : "Secure sign-in"}</small>
            </div>
          </div>
        </section>
        <section className={styles.card} aria-labelledby="sign-in-title">
          <div className={styles.cardLogo}>
            <img src="/brand.svg" width="54" height="54" alt="" />
          </div>
          <h2 id="sign-in-title">{ar ? "تسجيل الدخول" : "Welcome back"}</h2>
          <p>
            {ar
              ? "استخدم حساب قوقل الخاص بك للوصول إلى حسابك وإدارة تراخيصك."
              : "Use your Google account to access your dashboard and manage your licenses."}
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
              <GoogleMark />
            )}
            <span>
              {busy
                ? ar
                  ? "جارٍ تسجيل الدخول…"
                  : "Signing in…"
                : ar
                  ? "المتابعة باستخدام قوقل"
                  : "Continue with Google"}
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
            <span dir="ltr">© {new Date().getFullYear()} ABOOD 3D</span>
          </p>
          <span>
            {ar
              ? "مساحة واحدة. تجربة أبسط."
              : "One space. A simpler experience."}
          </span>
        </div>
      </footer>
    </div>
  );
}
function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" width="21" height="21" aria-hidden="true">
      <rect width="24" height="24" rx="12" fill="white" />
      <path
        d="M18.7 12.2c0-.5 0-.9-.1-1.4H12v2.7h3.8a3.3 3.3 0 0 1-1.4 2.1v1.8h2.3c1.3-1.2 2-3 2-5.2Z"
        fill="#4285F4"
      />
      <path
        d="M12 19c1.9 0 3.5-.6 4.7-1.7l-2.3-1.8c-.6.4-1.4.7-2.4.7-1.8 0-3.4-1.3-4-2.9H5.7v1.8A7 7 0 0 0 12 19Z"
        fill="#34A853"
      />
      <path
        d="M8 13.3a4.3 4.3 0 0 1 0-2.6V8.9H5.7a7 7 0 0 0 0 6.2Z"
        fill="#FBBC05"
      />
      <path
        d="M12 7.8c1 0 1.9.3 2.6 1l2-2A6.7 6.7 0 0 0 12 5a7 7 0 0 0-6.3 3.9L8 10.7c.6-1.7 2.2-2.9 4-2.9Z"
        fill="#EA4335"
      />
    </svg>
  );
}
