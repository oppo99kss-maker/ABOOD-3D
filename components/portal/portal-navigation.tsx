"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import {
  Box,
  Globe2,
  House,
  KeyRound,
  LifeBuoy,
  LogOut,
  Menu,
  Moon,
  ShieldCheck,
  Sun,
  UserRound,
  X,
  type LucideIcon,
} from "lucide-react";
import css from "./portal-navigation.module.css";

export type PortalTab =
  "overview" | "my-products" | "redeem" | "tickets" | "admin" | "profile";

type Props = {
  activeTab: PortalTab;
  onNavigate: (tab: PortalTab) => void;
  lang: "ar" | "en";
  isDark: boolean;
  isAdmin: boolean;
  productCount: number;
  mobileOpen: boolean;
  onMobileChange: (open: boolean) => void;
  onToggleTheme: () => void;
  onToggleLanguage: () => void;
  onLogout: () => void;
  user: { name: string; image?: string | null };
};

export function PortalNavigation({
  activeTab,
  onNavigate,
  lang,
  isDark,
  isAdmin,
  productCount,
  mobileOpen,
  onMobileChange,
  onToggleTheme,
  onToggleLanguage,
  onLogout,
  user,
}: Props) {
  const ar = lang === "ar";
  const trigger = useRef<HTMLButtonElement>(null);
  const close = useRef<HTMLButtonElement>(null);
  const drawer = useRef<HTMLDivElement>(null);
  const items: {
    tab: PortalTab;
    icon: LucideIcon;
    ar: string;
    en: string;
    count?: number;
  }[] = [
    { tab: "overview", icon: House, ar: "الرئيسية", en: "Home" },
    {
      tab: "my-products",
      icon: Box,
      ar: "منتجاتي",
      en: "My products",
      count: productCount,
    },
    { tab: "redeem", icon: KeyRound, ar: "تفعيل مفتاح", en: "Activate key" },
    { tab: "tickets", icon: LifeBuoy, ar: "المساعدة", en: "Help center" },
    { tab: "profile", icon: UserRound, ar: "حسابي", en: "My account" },
    ...(isAdmin
      ? [
          {
            tab: "admin" as const,
            icon: ShieldCheck,
            ar: "الإدارة",
            en: "Admin",
          },
        ]
      : []),
  ];
  useEffect(() => {
    if (!mobileOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    close.current?.focus();
    const keyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onMobileChange(false);
        trigger.current?.focus();
      }
      if (event.key !== "Tab") return;
      const controls = Array.from(
        drawer.current?.querySelectorAll<HTMLElement>(
          "button:not([disabled])",
        ) || [],
      );
      const first = controls[0],
        last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    const desktop = window.matchMedia("(min-width: 900px)");
    const resized = () => {
      if (desktop.matches) onMobileChange(false);
    };
    document.addEventListener("keydown", keyDown);
    desktop.addEventListener("change", resized);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", keyDown);
      desktop.removeEventListener("change", resized);
    };
  }, [mobileOpen, onMobileChange]);
  const navigate = (tab: PortalTab) => {
    onNavigate(tab);
    onMobileChange(false);
  };
  const links = (mobile: boolean) => (
    <nav
      className={mobile ? css.mobileLinks : css.links}
      aria-label={ar ? "القائمة الرئيسية" : "Main navigation"}
    >
      {items.map(({ tab, icon: Icon, ar: arabic, en, count }) => (
        <button
          key={tab}
          type="button"
          aria-label={ar ? arabic : en}
          aria-current={activeTab === tab ? "page" : undefined}
          className={css.navItem}
          data-active={activeTab === tab}
          onClick={() => navigate(tab)}
        >
          <Icon size={17} strokeWidth={1.8} />
          <span>{ar ? arabic : en}</span>
          {count !== undefined && <small>{count}</small>}
        </button>
      ))}
    </nav>
  );
  return (
    <>
      <header className={css.header}>
        <div className={css.inner}>
          <button
            type="button"
            className={css.brand}
            onClick={() => navigate("overview")}
            aria-label={ar ? "SpooFX — الرئيسية" : "SpooFX — Home"}
          >
            <Image src="/brand.svg" width={42} height={42} alt="" />
            <span>
              Spoo<strong>FX</strong>
              <small>CONTROL SPACE</small>
            </span>
          </button>
          {links(false)}
          <div className={css.actions}>
            <button
              className={css.icon}
              type="button"
              onClick={onToggleLanguage}
              aria-label={ar ? "Switch to English" : "التبديل إلى العربية"}
            >
              <Globe2 size={18} />
            </button>
            <button
              className={css.icon}
              type="button"
              onClick={onToggleTheme}
              aria-label={ar ? "تبديل المظهر" : "Toggle theme"}
            >
              {isDark ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <button
              className={css.account}
              type="button"
              onClick={() => navigate("profile")}
            >
              <span className={css.avatar}>
                <UserRound size={16} />
              </span>
              <span>{user.name}</span>
            </button>
            <button
              ref={trigger}
              className={`${css.icon} ${css.menu}`}
              type="button"
              onClick={() => onMobileChange(true)}
              aria-label={ar ? "فتح القائمة" : "Open navigation"}
              aria-expanded={mobileOpen}
            >
              <Menu size={20} />
            </button>
          </div>
        </div>
      </header>
      {mobileOpen && (
        <div className={css.overlay} onClick={() => onMobileChange(false)}>
          <div
            ref={drawer}
            className={css.drawer}
            role="dialog"
            aria-modal="true"
            aria-label={ar ? "القائمة الرئيسية" : "Main navigation"}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={css.drawerTop}>
              <b>
                Spoo<span>FX</span>
              </b>
              <button
                ref={close}
                className={css.icon}
                onClick={() => {
                  onMobileChange(false);
                  trigger.current?.focus();
                }}
                aria-label={ar ? "إغلاق القائمة" : "Close menu"}
              >
                <X size={20} />
              </button>
            </div>
            {links(true)}
            <button className={css.logout} onClick={onLogout}>
              <LogOut size={17} />
              {ar ? "تسجيل الخروج" : "Sign out"}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
