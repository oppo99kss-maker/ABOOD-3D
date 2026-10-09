"use client";
import { useEffect, useState } from "react";
export function usePreferences() {
  const [lang, setLang] = useState<"ar" | "en">("ar");
  const [isDark, setDark] = useState(true);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    try {
      setLang(localStorage.getItem("abood.language") === "en" ? "en" : "ar");
      setDark(localStorage.getItem("abood.theme") !== "light");
    } catch {}
    setReady(true);
  }, []);
  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
    if (ready) {
      try {
        localStorage.setItem("abood.language", lang);
        localStorage.setItem("abood.theme", isDark ? "dark" : "light");
      } catch {}
    }
  }, [lang, isDark, ready]);
  return { lang, isDark, setLang, toggleTheme: () => setDark((v) => !v) };
}
