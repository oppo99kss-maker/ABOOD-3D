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
  | "overview"
  | "my-products"
  | "redeem"
  | "tickets"
  | "admin"
  | "profile";

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
  user: { name: string; email?: string; image?: string | null };
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
      en: "My Products",
      count: productCount,
    },
    { tab: "redeem", icon: KeyRound, ar: "تفعيل مفتاح", en: "Activate Key" },
    { tab: "tickets", icon: LifeBuoy, ar: "المساعدة", en: "Help Center" },
    { tab: "profile", icon: UserRound, ar: "حسابي", en: "My Account" },
    ...(isAdmin
      ? [
          {
            tab: "admin" as const,
            icon: ShieldCheck,
            ar: "الإدارة",
            en: "Admin Space",
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
      const first = controls[0];
      const last = controls[controls.length - 1];
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

  return (
    <>
      {/* ==================================================== */}
      {/* 1. DESKTOP PERMANENT SIDEBAR (قائمة جانبية فخمة ومتساوية) */}
      {/* ==================================================== */}
      <aside
        className={css.sidebar}
        aria-label={ar ? "القائمة الجانبية" : "Sidebar Navigation"}
      >
        {/* Brand Header */}
        <div className={css.sidebarBrandWrap}>
          <button
            type="button"
            className={css.brand}
            onClick={() => navigate("overview")}
            aria-label={ar ? "SpooFX — الرئيسية" : "SpooFX — Home"}
          >
            <div className={css.brandImgWrap}>
              <Image src="/brand.svg" width={38} height={38} alt="SpooFX" priority />
            </div>
            <div className={css.brandText}>
              <span>
                Spoo<strong>FX</strong>
              </span>
              <small>CONTROL SPACE</small>
            </div>
          </button>
        </div>

        {/* Navigation Items (متساوية ومرتبة) */}
        <div className={css.sidebarNavWrap}>
          <div className={css.sidebarSectionTitle}>
            <span>{ar ? "القائمة الرئيسية" : "MAIN NAVIGATION"}</span>
          </div>

          <nav className={css.sidebarNavList}>
            {items.map(({ tab, icon: Icon, ar: arabic, en, count }) => {
              const isActive = activeTab === tab;
              const isAdminTab = tab === "admin";
              return (
                <button
                  key={tab}
                  type="button"
                  aria-label={ar ? arabic : en}
                  aria-current={isActive ? "page" : undefined}
                  className={`${css.sidebarNavItem} ${isAdminTab ? css.sidebarAdminItem : ""}`}
                  data-active={isActive}
                  onClick={() => navigate(tab)}
                >
                  <div className={css.navIconBox}>
                    <Icon size={18} strokeWidth={isActive ? 2.2 : 1.8} />
                  </div>
                  <span className={css.navLabel}>{ar ? arabic : en}</span>
                  {count !== undefined && (
                    <span className={css.navCountBadge}>{count}</span>
                  )}
                  {isAdminTab && (
                    <span className={css.adminBadgePill}>ADMIN</span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Footer & User Card */}
        <div className={css.sidebarFooter}>
          <button
            type="button"
            className={css.userProfileCard}
            onClick={() => navigate("profile")}
            title={ar ? "حسابي والملف الشخصي" : "Profile & Account"}
          >
            <div className={css.userAvatarWrap}>
              {user.image ? (
                <img
                  className={css.avatarImage}
                  src={user.image}
                  width={34}
                  height={34}
                  alt={user.name}
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className={css.avatarFallback}>
                  {user.name ? user.name[0].toUpperCase() : "U"}
                </div>
              )}
              <span className={css.userOnlineDot} />
            </div>
            <div className={css.userInfoText}>
              <strong className={css.userName}>{user.name}</strong>
              <small className={css.userEmail}>
                {user.email || (ar ? "حساب قوقل موثق" : "Google Account")}
              </small>
            </div>
          </button>

          <div className={css.sidebarControlsRow}>
            <button
              type="button"
              className={css.controlBtn}
              onClick={onToggleLanguage}
              title={ar ? "Switch to English" : "التبديل إلى العربية"}
            >
              <Globe2 size={15} />
              <span>{ar ? "English" : "العربية"}</span>
            </button>

            <button
              type="button"
              className={css.controlIconBtn}
              onClick={onToggleTheme}
              title={ar ? "تبديل المظهر" : "Toggle theme"}
            >
              {isDark ? <Sun size={16} /> : <Moon size={16} />}
            </button>

            <button
              type="button"
              className={css.controlLogoutBtn}
              onClick={onLogout}
              title={ar ? "تسجيل الخروج" : "Sign out"}
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* ==================================================== */}
      {/* 2. MOBILE COMPACT HEADER (< 900px) */}
      {/* ==================================================== */}
      <header className={css.mobileHeader}>
        <button
          type="button"
          className={css.brand}
          onClick={() => navigate("overview")}
          aria-label="SpooFX"
        >
          <div className={css.brandImgWrap}>
            <Image src="/brand.svg" width={32} height={32} alt="SpooFX" priority />
          </div>
          <div className={css.brandText}>
            <span>
              Spoo<strong>FX</strong>
            </span>
          </div>
        </button>

        <div className={css.mobileHeaderActions}>
          <button
            className={css.controlIconBtn}
            type="button"
            onClick={onToggleLanguage}
            title={ar ? "Switch to English" : "التبديل إلى العربية"}
          >
            <Globe2 size={16} />
          </button>
          <button
            className={css.controlIconBtn}
            type="button"
            onClick={onToggleTheme}
            title={ar ? "تبديل المظهر" : "Toggle theme"}
          >
            {isDark ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          <button
            ref={trigger}
            className={css.mobileMenuToggle}
            type="button"
            onClick={() => onMobileChange(true)}
            aria-label={ar ? "فتح القائمة" : "Open navigation"}
            aria-expanded={mobileOpen}
          >
            <Menu size={20} />
          </button>
        </div>
      </header>

      {/* ==================================================== */}
      {/* 3. MOBILE SLIDEOUT DRAWER */}
      {/* ==================================================== */}
      {mobileOpen && (
        <div className={css.overlay} onClick={() => onMobileChange(false)}>
          <div
            ref={drawer}
            className={css.drawer}
            role="dialog"
            aria-modal="true"
            aria-label={ar ? "القائمة الرئيسية" : "Main Navigation"}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={css.drawerTop}>
              <div className={css.brandText}>
                <span>
                  Spoo<strong>FX</strong>
                </span>
                <small>CONTROL SPACE</small>
              </div>
              <button
                ref={close}
                className={css.drawerCloseBtn}
                onClick={() => {
                  onMobileChange(false);
                  trigger.current?.focus();
                }}
                aria-label={ar ? "إغلاق القائمة" : "Close menu"}
              >
                <X size={18} />
              </button>
            </div>

            <nav className={css.drawerLinks}>
              {items.map(({ tab, icon: Icon, ar: arabic, en, count }) => {
                const isActive = activeTab === tab;
                const isAdminTab = tab === "admin";
                return (
                  <button
                    key={tab}
                    type="button"
                    aria-label={ar ? arabic : en}
                    aria-current={isActive ? "page" : undefined}
                    className={`${css.sidebarNavItem} ${isAdminTab ? css.sidebarAdminItem : ""}`}
                    data-active={isActive}
                    onClick={() => navigate(tab)}
                  >
                    <div className={css.navIconBox}>
                      <Icon size={18} strokeWidth={isActive ? 2.2 : 1.8} />
                    </div>
                    <span className={css.navLabel}>{ar ? arabic : en}</span>
                    {count !== undefined && (
                      <span className={css.navCountBadge}>{count}</span>
                    )}
                    {isAdminTab && (
                      <span className={css.adminBadgePill}>ADMIN</span>
                    )}
                  </button>
                );
              })}
            </nav>

            <div className={css.drawerFooter}>
              <button
                type="button"
                className={css.userProfileCard}
                onClick={() => navigate("profile")}
              >
                <div className={css.userAvatarWrap}>
                  {user.image ? (
                    <img
                      className={css.avatarImage}
                      src={user.image}
                      width={32}
                      height={32}
                      alt={user.name}
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className={css.avatarFallback}>
                      {user.name ? user.name[0].toUpperCase() : "U"}
                    </div>
                  )}
                  <span className={css.userOnlineDot} />
                </div>
                <div className={css.userInfoText}>
                  <strong className={css.userName}>{user.name}</strong>
                  <small className={css.userEmail}>{user.email || ""}</small>
                </div>
              </button>

              <button className={css.drawerLogoutBtn} onClick={onLogout}>
                <LogOut size={16} />
                <span>{ar ? "تسجيل الخروج" : "Sign out"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
