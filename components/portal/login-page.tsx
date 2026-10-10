"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import {
  AlertCircle,
  LoaderCircle,
  Lock,
  LogIn,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { usePreferences } from "./use-preferences";
import styles from "./login-page.module.css";

export function LoginPage() {
  const { lang, isDark } = usePreferences();
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
              <span className={styles.brandTagline}>
                {ar ? "تسليم ذاتي" : "Instant Delivery"}
              </span>
            </div>
          </Link>
        </div>
      </header>

      {/* Main Showcase & Login Card */}
      <main className={styles.content}>
        {/* Hero Column */}
        <section className={styles.hero} aria-labelledby="login-title">
          <div className={styles.badge}>
            <span className={styles.badgeDot} />
            <span>{ar ? "بوابة SpooFX" : "WELCOME TO SPOOFX"}</span>
          </div>

          <h1 id="login-title" className={styles.heroTitle}>
            {ar ? (
              <>
                حسابك <span className={styles.cyanGlowText}>ومنتجاتك</span>
                <br />
                في مكان واحد
              </>
            ) : (
              <>
                Your Account. <span className={styles.cyanGlowText}>Your Products.</span>
                <br />
                All In One Place.
              </>
            )}
          </h1>

          <p className={styles.description}>
            {ar
              ? "سجّل الدخول للوصول إلى حسابك ومنتجاتك ومفاتيحك بسهولة وسرعة من مكان واحد."
              : "Sign in to access your account, products, and digital license keys in one place."}
          </p>

          <div className={styles.heroFeatures}>
            <div className={styles.featureItem}>
              <span className={styles.featureIconWrap}>
                <ShieldCheck size={16} />
              </span>
              <span>{ar ? "تسجيل دخول رسمي وآمن عبر Google" : "Official secure Google OAuth"}</span>
            </div>
            <div className={styles.featureItem}>
              <span className={styles.featureIconWrap}>
                <Zap size={16} />
              </span>
              <span>{ar ? "وصول فوري لكافة التراخيص والمفاتيح" : "Instant license keys access"}</span>
            </div>
            <div className={styles.featureItem}>
              <span className={styles.featureIconWrap}>
                <Lock size={16} />
              </span>
              <span>{ar ? "حماية وتشفير متكامل للبيانات" : "Encrypted account security"}</span>
            </div>
          </div>
        </section>

        {/* Login Card Column */}
        <section className={styles.card} aria-labelledby="sign-in-title">
          <div className={styles.cardLogo}>
            <img
              src="/logo.png"
              width={96}
              height={96}
              alt="SpooFX Cyber Security"
              className={styles.cardLogoImg}
            />
          </div>

          <h2 id="sign-in-title" className={styles.cardTitle}>
            {ar ? "تسجيل الدخول" : "Welcome back"}
          </h2>

          <p className={styles.cardDesc}>
            {ar
              ? "سجّل دخولك للوصول إلى حسابك ومنتجاتك ومفاتيحك."
              : "Sign in to access your account, products, and license keys."}
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
              <LogIn size={18} className={styles.loginBtnIcon} aria-hidden="true" />
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

          {/* Neatly Spaced Security Note Without Overlapping */}
          <div className={styles.securityNote}>
            <ShieldCheck size={14} className={styles.securityIcon} />
            <span>
              {ar
                ? "لا نطلب كلمة مرور حسابك"
                : "We never ask for your Google password"}
            </span>
          </div>
        </section>
      </main>

      {/* Footer Bar */}
      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <p className={styles.copyrightText}>
            {ar ? "جميع الحقوق محفوظة" : "All rights reserved"}{" "}
            <span dir="ltr">© {new Date().getFullYear()} SpooFX</span>
          </p>
          <span className={styles.taglineText}>
            {ar
              ? "حسابك ومنتجاتك ومفاتيحك، في مكان واحد."
              : "Your account, products, and keys in one place."}
          </span>
        </div>
      </footer>
    </div>
  );
}
