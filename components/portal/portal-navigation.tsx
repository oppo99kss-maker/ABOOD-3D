"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import {
  ArrowUpRight,
  Box,
  ChevronLeft,
  ChevronRight,
  House,
  KeyRound,
  LifeBuoy,
  LogOut,
  Menu,
  PanelRightClose,
  ShieldCheck,
  ShoppingBag,
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
  const [collapsed, setCollapsed] = useState(false);

  const trigger = useRef<HTMLButtonElement>(null);
  const close = useRef<HTMLButtonElement>(null);
  const drawer = useRef<HTMLDivElement>(null);
  const userCardRef = useRef<HTMLButtonElement>(null);

  // Four clean groups specified by user: عام, الدعم, الحساب, الإدارة
  const sections: {
    title: { ar: string; en: string };
    items: {
      tab?: PortalTab;
      href?: string;
      icon: LucideIcon;
      title: { ar: string; en: string };
      count?: number;
      isExternal?: boolean;
    }[];
  }[] = [
    {
      title: { ar: "عام", en: "General" },
      items: [
        {
          tab: "overview",
          icon: House,
          title: { ar: "الرئيسية", en: "Overview" },
        },
        {
          tab: "my-products",
          icon: Box,
          title: { ar: "منتجاتي", en: "My Products" },
          count: productCount,
        },
        {
          tab: "redeem",
          icon: KeyRound,
          title: { ar: "تفعيل مفتاح", en: "Activate Key" },
        },
      ],
    },
    {
      title: { ar: "الدعم", en: "Support" },
      items: [
        {
          tab: "tickets",
          icon: LifeBuoy,
          title: { ar: "مركز المساعدة", en: "Help Center" },
        },
        {
          href: "https://spoofx.rmz.gg/",
          icon: ShoppingBag,
          title: { ar: "المتجر", en: "Store" },
          isExternal: true,
        },
      ],
    },
    {
      title: { ar: "الحساب", en: "Account" },
      items: [
        {
          tab: "profile",
          icon: UserRound,
          title: { ar: "الملف الشخصي", en: "Profile" },
        },
      ],
    },
  ];

  // Mobile drawer keyboard & scroll lock
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
          "button:not([disabled]), a:not([disabled])",
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

  const ArrowIcon = ar ? ChevronLeft : ChevronRight;

  const renderNavList = () => (
    <div className={css.navSectionsContainer}>
      {sections.map((section, sIdx) => (
        <div key={sIdx} className={css.navSectionGroup}>
          {!collapsed && (
            <div className={css.sectionHeaderTitle}>
              <span>{ar ? section.title.ar : section.title.en}</span>
            </div>
          )}

          <div className={css.sectionItemsList}>
            {section.items.map((item, iIdx) => {
              const Icon = item.icon;
              const label = ar ? item.title.ar : item.title.en;

              if (item.isExternal && item.href) {
                return (
                  <a
                    key={iIdx}
                    href={item.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={css.navItemBtn}
                    aria-label={label}
                  >
                    <div className={css.itemIconWrap}>
                      <Icon size={18} strokeWidth={1.8} />
                    </div>
                    {!collapsed && <span className={css.itemLabel}>{label}</span>}
                    {!collapsed && (
                      <ArrowUpRight size={14} className={css.externalArrow} />
                    )}
                    {collapsed && (
                      <span className={css.collapsedTooltip}>
                        {label} ↗
                      </span>
                    )}
                  </a>
                );
              }

              const isActive = activeTab === item.tab;
              return (
                <button
                  key={iIdx}
                  type="button"
                  aria-label={label}
                  aria-current={isActive ? "page" : undefined}
                  className={css.navItemBtn}
                  data-active={isActive}
                  onClick={() => item.tab && navigate(item.tab)}
                >
                  <div className={css.itemIconWrap}>
                    <Icon size={18} strokeWidth={isActive ? 2.2 : 1.8} />
                  </div>
                  {!collapsed && <span className={css.itemLabel}>{label}</span>}
                  {!collapsed && item.count !== undefined && (
                    <span className={css.countBadgePill}>{item.count}</span>
                  )}
                  {!collapsed && isActive && (
                    <ArrowIcon size={14} className={css.activeChevron} />
                  )}
                  {collapsed && (
                    <span className={css.collapsedTooltip}>
                      {label}
                      {item.count !== undefined ? ` (${item.count})` : ""}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );

  const renderAdminSection = (isMobile = false) => {
    if (!isAdmin) return null;
    const isActive = activeTab === "admin";
    const label = ar ? "لوحة التحكم" : "Control Panel";
    return (
      <div className={css.adminDedicatedSection}>
        {(!collapsed || isMobile) && (
          <div className={css.sectionHeaderTitle}>
            <span>{ar ? "لوحة التحكم" : "Control Panel"}</span>
          </div>
        )}
        <div className={css.sectionItemsList}>
          <button
            type="button"
            aria-label={label}
            aria-current={isActive ? "page" : undefined}
            className={`${css.navItemBtn} ${css.adminControlItemBtn}`}
            data-active={isActive}
            onClick={() => navigate("admin")}
          >
            <div className={css.itemIconWrap}>
              <ShieldCheck size={18} strokeWidth={isActive ? 2.2 : 1.8} />
            </div>
            {(!collapsed || isMobile) && (
              <span className={css.itemLabel}>{label}</span>
            )}
            {(!collapsed || isMobile) && isActive && (
              <ArrowIcon size={14} className={css.activeChevron} />
            )}
            {collapsed && !isMobile && (
              <span className={css.collapsedTooltip}>{label}</span>
            )}
          </button>
        </div>
      </div>
    );
  };

  return (
    <>
      {/* ==================================================== */}
      {/* 1. DESKTOP SIDEBAR (Dark Premium: 260px / 76px) */}
      {/* ==================================================== */}
      <aside
        className={`${css.sidebar} ${collapsed ? css.collapsed : ""}`}
        aria-label={ar ? "القائمة الجانبية" : "Sidebar Navigation"}
      >
        {/* Top Header: Brand + Smooth Collapse Toggle */}
        <div className={css.sidebarTopHeader}>
          <button
            type="button"
            className={css.sidebarBrandBtn}
            onClick={() => navigate("overview")}
            aria-label={ar ? "الرئيسية" : "Home"}
          >
            <div className={css.brandLogoFrame}>
              <Image src="/logo.png" width={38} height={38} alt="SpooFX" priority style={{ objectFit: "contain", borderRadius: 8 }} />
            </div>
            {!collapsed && (
              <div className={css.brandTitlesWrap}>
                <strong className={css.brandMainTitle}>SpooFX</strong>
                <span className={css.brandSubtitle}>
                  {ar ? "تسليم ذاتي" : "Instant Delivery"}
                </span>
              </div>
            )}
            {collapsed && (
              <span className={css.collapsedTooltip}>
                SpooFX {ar ? "الرئيسية" : "Home"}
              </span>
            )}
          </button>

          <button
            type="button"
            className={css.collapseSidebarToggle}
            onClick={() => setCollapsed(!collapsed)}
            aria-label={collapsed ? (ar ? "توسيع القائمة" : "Expand") : (ar ? "تصغير القائمة" : "Collapse")}
          >
            <PanelRightClose
              size={17}
              className={ar ? (collapsed ? "rotate-180" : "") : (collapsed ? "" : "rotate-180")}
            />
            {collapsed && (
              <span className={css.collapsedTooltip}>
                {ar ? "توسيع القائمة" : "Expand"}
              </span>
            )}
          </button>
        </div>

        {/* Navigation Sections */}
        {renderNavList()}

        {/* Dedicated Admin Control Panel (independent at bottom with title) */}
        {renderAdminSection(false)}

        {/* Footer Area: Unified Luxury Account Box */}
        <div className={css.sidebarFooterBlock}>
          <div className={css.userProfileBox}>
            <button
              ref={userCardRef}
              type="button"
              className={css.userProfileTop}
              onClick={() => navigate("profile")}
              aria-label={ar ? "الملف الشخصي" : "Profile"}
              title={ar ? "الملف الشخصي" : "Profile"}
            >
              <div className={css.userAvatarImgWrap}>
                {user.image ? (
                  <img
                    className={css.userAvatarImg}
                    src={user.image}
                    width={36}
                    height={36}
                    alt={user.name}
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className={css.userAvatarFallback}>
                    {user.name ? user.name[0].toUpperCase() : "U"}
                  </div>
                )}
              </div>

              {!collapsed && (
                <>
                  <div className={css.userTextInfo}>
                    <strong className={css.userDisplayName}>{user.name}</strong>
                    <div className={css.userConnectedStatus}>
                      <span className={css.greenPulseDot} />
                      <span>{ar ? "حسابك متصل" : "Connected"}</span>
                    </div>
                  </div>
                  <ArrowIcon size={14} className={css.userChevron} />
                </>
              )}

              {collapsed && (
                <span className={css.collapsedTooltip}>
                  {user.name} ({ar ? "الملف الشخصي" : "Profile"})
                </span>
              )}
            </button>

            <div className={css.userBoxDivider} />

            <button
              type="button"
              className={css.userBoxLogoutBtn}
              onClick={onLogout}
              aria-label={ar ? "تسجيل الخروج" : "Sign Out"}
              title={ar ? "تسجيل الخروج" : "Sign Out"}
            >
              <LogOut size={15} className={ar ? "rotate-180" : ""} />
              {!collapsed && <span>{ar ? "تسجيل الخروج" : "Sign Out"}</span>}
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
          className={css.sidebarBrandBtn}
          onClick={() => navigate("overview")}
          aria-label="SpooFX"
        >
          <div className={css.brandLogoFrame}>
            <Image src="/logo.png" width={34} height={34} alt="SpooFX" priority style={{ objectFit: "contain", borderRadius: 8 }} />
          </div>
          <div className={css.brandTitlesWrap}>
            <strong className={css.brandMainTitle}>SpooFX</strong>
            <span className={css.brandSubtitle}>
              {ar ? "تسليم ذاتي" : "Instant Delivery"}
            </span>
          </div>
        </button>

        <div className={css.mobileHeaderActions}>
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
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div className={css.brandLogoFrame}>
                  <Image src="/logo.png" width={34} height={34} alt="SpooFX" priority style={{ objectFit: "contain", borderRadius: 8 }} />
                </div>
                <div className={css.brandTitlesWrap}>
                  <strong className={css.brandMainTitle}>SpooFX</strong>
                  <span className={css.brandSubtitle}>
                    {ar ? "تسليم ذاتي" : "Instant Delivery"}
                  </span>
                </div>
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

            <div className={css.drawerBody}>
              {renderNavList()}
              {renderAdminSection(true)}
            </div>

            <div className={css.drawerFooter}>
              <div className={css.userProfileBox}>
                <button
                  type="button"
                  className={css.userProfileTop}
                  onClick={() => {
                    onMobileChange(false);
                    navigate("profile");
                  }}
                  aria-label={ar ? "الملف الشخصي" : "Profile"}
                >
                  <div className={css.userAvatarImgWrap}>
                    {user.image ? (
                      <img
                        className={css.userAvatarImg}
                        src={user.image}
                        width={34}
                        height={34}
                        alt={user.name}
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className={css.userAvatarFallback}>
                        {user.name ? user.name[0].toUpperCase() : "U"}
                      </div>
                    )}
                  </div>
                  <div className={css.userTextInfo}>
                    <strong className={css.userDisplayName}>{user.name}</strong>
                    <div className={css.userConnectedStatus}>
                      <span className={css.greenPulseDot} />
                      <span>{ar ? "حسابك متصل" : "Connected"}</span>
                    </div>
                  </div>
                  <ArrowIcon size={14} className={css.userChevron} />
                </button>

                <div className={css.userBoxDivider} />

                <button
                  type="button"
                  className={css.userBoxLogoutBtn}
                  onClick={() => {
                    onMobileChange(false);
                    onLogout();
                  }}
                  aria-label={ar ? "تسجيل الخروج" : "Sign Out"}
                >
                  <LogOut size={15} className={ar ? "rotate-180" : ""} />
                  <span>{ar ? "تسجيل الخروج" : "Sign Out"}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
