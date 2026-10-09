"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import {
  AnimatePresence,
  LayoutGroup,
  motion,
  useReducedMotion,
} from "motion/react";
import {
  ArrowUpLeft,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  Globe,
  LifeBuoy,
  KeyRound,
  House,
  LogOut,
  Menu,
  Moon,
  Package,
  PanelRightClose,
  PanelRightOpen,
  ShieldCheck,
  Sun,
  UserRound,
  X,
  type LucideIcon,
} from "lucide-react";
import css from "./portal-navigation.module.css";

export type PortalTab =
  "overview" | "my-products" | "redeem" | "tickets" | "admin" | "profile";

interface PortalNavigationProps {
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
}

interface NavigationItem {
  tab: PortalTab;
  label: string;
  icon: LucideIcon;
  count?: number;
}

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
}: PortalNavigationProps) {
  const ar = lang === "ar";
  const [collapsed, setCollapsed] = useState(false);
  const [preferenceLoaded, setPreferenceLoaded] = useState(false);
  const [animateCollapse, setAnimateCollapse] = useState(false);
  const [tooltip, setTooltip] = useState<{ label: string; top: number } | null>(
    null,
  );
  const reducedMotion = useReducedMotion();
  const sidebarRef = useRef<HTMLElement>(null);
  const drawerRef = useRef<HTMLElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const Arrow = ar ? ArrowUpLeft : ArrowUpRight;
  const Chevron = ar ? ChevronLeft : ChevronRight;
  const shouldAnimate = animateCollapse && !reducedMotion;
  const layoutTransition = shouldAnimate
    ? { duration: 0.28, ease: "easeOut" as const }
    : { duration: 0 };
  const labelMotion = (compact: boolean, order: number) => ({
    initial: false as const,
    animate: compact ? { opacity: 0, x: ar ? -8 : 8 } : { opacity: 1, x: 0 },
    transition: shouldAnimate
      ? compact
        ? { duration: 0.12 }
        : { duration: 0.24, delay: 0.07 + order * 0.035 }
      : { duration: 0 },
  });

  useEffect(() => {
    try {
      setCollapsed(
        window.localStorage.getItem("abood.sidebar-collapsed") === "true",
      );
    } catch {
      // Keep the default width when storage is unavailable.
    }
    setPreferenceLoaded(true);
  }, []);

  useEffect(() => {
    if (!preferenceLoaded) return;
    try {
      window.localStorage.setItem("abood.sidebar-collapsed", String(collapsed));
    } catch {
      // The sidebar still works when storage is unavailable.
    }
  }, [collapsed, preferenceLoaded]);

  const showTooltip = (label: string, target: HTMLElement) => {
    if (!collapsed || !sidebarRef.current) return;
    const sidebarTop = sidebarRef.current.getBoundingClientRect().top;
    const item = target.getBoundingClientRect();
    setTooltip({ label, top: item.top - sidebarTop + item.height / 2 });
  };

  const toggleCollapsed = () => {
    setTooltip(null);
    setAnimateCollapse(true);
    setCollapsed((current) => !current);
  };

  useEffect(() => {
    if (!mobileOpen) return;
    const trigger = triggerRef.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const shell = drawerRef.current?.closest(".portal-shell");
    const background = Array.from(shell?.children ?? []).filter(
      (element): element is HTMLElement =>
        element instanceof HTMLElement &&
        element !== drawerRef.current &&
        !element.contains(drawerRef.current),
    );
    const previousInert = background.map((element) => element.inert);
    background.forEach((element) => {
      element.inert = true;
    });
    closeRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onMobileChange(false);
      }
      if (event.key !== "Tab") return;
      const controls = Array.from(
        drawerRef.current?.querySelectorAll<HTMLElement>(
          "a[href], button:not([disabled])",
        ) ?? [],
      ).filter((element) => element.getClientRects().length > 0);
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
    const viewport = window.matchMedia("(min-width: 768px)");
    const onResize = () => {
      if (viewport.matches) onMobileChange(false);
    };
    document.addEventListener("keydown", onKeyDown);
    viewport.addEventListener("change", onResize);
    return () => {
      document.body.style.overflow = previousOverflow;
      background.forEach((element, index) => {
        element.inert = previousInert[index];
      });
      document.removeEventListener("keydown", onKeyDown);
      viewport.removeEventListener("change", onResize);
      trigger?.focus();
    };
  }, [mobileOpen, onMobileChange]);

  const navigate = (tab: PortalTab) => {
    setTooltip(null);
    onNavigate(tab);
    onMobileChange(false);
  };

  const groups: { title: string; items: NavigationItem[] }[] = [
    {
      title: ar ? "عام" : "GENERAL",
      items: [
        { tab: "overview", label: ar ? "الرئيسية" : "Overview", icon: House },
        {
          tab: "my-products",
          label: ar ? "منتجاتي" : "My products",
          icon: Package,
          count: productCount,
        },
        {
          tab: "redeem",
          label: ar ? "تفعيل مفتاح" : "Activate a key",
          icon: KeyRound,
        },
      ],
    },
    {
      title: ar ? "المساعدة" : "HELP",
      items: [
        {
          tab: "tickets",
          label: ar ? "مركز المساعدة" : "Help center",
          icon: LifeBuoy,
        },
      ],
    },
    {
      title: ar ? "الحساب" : "ACCOUNT",
      items: [
        {
          tab: "profile",
          label: ar ? "الملف الشخصي" : "Profile",
          icon: UserRound,
        },
      ],
    },
    ...(isAdmin
      ? [
          {
            title: ar ? "الإدارة" : "ADMIN",
            items: [
              {
                tab: "admin" as const,
                label: ar ? "لوحة الإدارة" : "Administration",
                icon: ShieldCheck,
              },
            ],
          },
        ]
      : []),
  ];
  const staggerOrder = (groupIndex: number, itemIndex: number) =>
    groups
      .slice(0, groupIndex)
      .reduce(
        (total, group, index) =>
          total + group.items.length + (index === 1 ? 1 : 0),
        0,
      ) + itemIndex;

  const brand = (
    <>
      <Image src="/brand.svg" width={42} height={42} alt="" />
      <span className={css.brandCopy}>
        <strong translate="no">
          ABOOD <span>3D</span>
        </strong>
        <small>
          {ar ? "بوابة المنتجات والدعم" : "Products & Support Portal"}
        </small>
      </span>
    </>
  );

  const navigation = (compact: boolean, surface: "desktop" | "mobile") => (
    <LayoutGroup id={`portal-navigation-${surface}`}>
      <nav
        className={css.nav}
        aria-label={ar ? "القائمة الرئيسية" : "Main navigation"}
        onScroll={() => setTooltip(null)}
      >
        {groups.map((group, index) => (
          <div className={css.group} key={group.title}>
            <motion.p
              className={css.groupTitle}
              {...labelMotion(compact, index * 2)}
            >
              {group.title}
            </motion.p>
            {group.items.map(({ tab, label, icon: Icon, count }, itemIndex) => (
              <button
                type="button"
                key={tab}
                className={css.item}
                style={{
                  animationDelay: `${130 + staggerOrder(index, itemIndex) * 55}ms`,
                }}
                data-active={activeTab === tab}
                aria-current={activeTab === tab ? "page" : undefined}
                aria-label={label}
                onMouseEnter={(event) =>
                  compact && showTooltip(label, event.currentTarget)
                }
                onMouseLeave={() => setTooltip(null)}
                onFocus={(event) =>
                  compact && showTooltip(label, event.currentTarget)
                }
                onBlur={() => setTooltip(null)}
                onClick={() => navigate(tab)}
              >
                {activeTab === tab && (
                  <motion.span
                    className={css.activeHighlight}
                    layoutId={`portal-navigation-active-${surface}`}
                    initial={false}
                    transition={
                      reducedMotion
                        ? { duration: 0 }
                        : { duration: 0.28, ease: "easeOut" }
                    }
                    aria-hidden="true"
                  />
                )}
                <span className={css.itemIcon}>
                  <Icon size={19} strokeWidth={1.7} />
                </span>
                <motion.span
                  className={css.itemLabel}
                  {...labelMotion(compact, index * 2 + itemIndex + 1)}
                >
                  {label}
                </motion.span>
                {count !== undefined ? (
                  <span className={css.badge}>{count}</span>
                ) : (
                  activeTab === tab && (
                    <Chevron className={css.chevron} size={14} />
                  )
                )}
              </button>
            ))}
          </div>
        ))}
      </nav>
    </LayoutGroup>
  );

  const footer = (compact: boolean) => (
    <div className={css.account}>
      <button
        type="button"
        className={css.user}
        onClick={() => navigate("profile")}
        aria-label={ar ? "فتح الملف الشخصي" : "Open profile"}
        onMouseEnter={(event) =>
          compact && showTooltip(user.name, event.currentTarget)
        }
        onMouseLeave={() => setTooltip(null)}
        onFocus={(event) =>
          compact && showTooltip(user.name, event.currentTarget)
        }
        onBlur={() => setTooltip(null)}
      >
        <Image
          src={"/brand.svg"}
          alt=""
          width={34}
          height={34}
          onError={(event) => {
            event.currentTarget.src = "/brand.svg";
          }}
        />
        <span className={css.userCopy}>
          <strong>{user.name}</strong>
          <small>
            <i />
            {ar ? "حسابك" : "Your account"}
          </small>
        </span>
        <Chevron className={css.chevron} size={15} />
      </button>
      <button
        type="button"
        className={css.logout}
        onClick={onLogout}
        aria-label={ar ? "تسجيل الخروج" : "Sign out"}
        onMouseEnter={(event) =>
          compact &&
          showTooltip(ar ? "تسجيل الخروج" : "Sign out", event.currentTarget)
        }
        onMouseLeave={() => setTooltip(null)}
        onFocus={(event) =>
          compact &&
          showTooltip(ar ? "تسجيل الخروج" : "Sign out", event.currentTarget)
        }
        onBlur={() => setTooltip(null)}
      >
        <LogOut size={17} strokeWidth={1.7} />
        <span>{ar ? "تسجيل الخروج" : "Sign out"}</span>
      </button>
    </div>
  );

  return (
    <>
      <motion.aside
        ref={sidebarRef}
        className={`${css.sidebar} ${collapsed ? css.collapsed : ""}`}
        data-animate={animateCollapse}
        aria-label={ar ? "التنقّل" : "Navigation"}
        initial={false}
        animate={{ width: collapsed ? 76 : 244 }}
        transition={layoutTransition}
      >
        <motion.div
          className={css.brandRow}
          layout
          transition={layoutTransition}
        >
          <motion.button
            type="button"
            className={css.brand}
            layout
            transition={layoutTransition}
            onClick={() => navigate("overview")}
            aria-label={ar ? "ABOOD 3D — الرئيسية" : "ABOOD 3D — Home"}
            onMouseEnter={(event) =>
              collapsed &&
              showTooltip(ar ? "الرئيسية" : "Overview", event.currentTarget)
            }
            onMouseLeave={() => setTooltip(null)}
            onFocus={(event) =>
              collapsed &&
              showTooltip(ar ? "الرئيسية" : "Overview", event.currentTarget)
            }
            onBlur={() => setTooltip(null)}
          >
            {brand}
          </motion.button>
          <motion.button
            type="button"
            className={`${css.collapseButton} ${css.iconButton}`}
            layout
            transition={layoutTransition}
            onClick={toggleCollapsed}
            title={
              collapsed
                ? ar
                  ? "إظهار القائمة"
                  : "Expand navigation"
                : ar
                  ? "طي القائمة"
                  : "Collapse navigation"
            }
            aria-label={
              collapsed
                ? ar
                  ? "إظهار القائمة"
                  : "Expand navigation"
                : ar
                  ? "طي القائمة"
                  : "Collapse navigation"
            }
            aria-pressed={collapsed}
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                key={collapsed ? "expand" : "collapse"}
                className={css.toggleIcon}
                initial={
                  shouldAnimate
                    ? { opacity: 0, rotate: -35, scale: 0.75 }
                    : false
                }
                animate={{ opacity: 1, rotate: 0, scale: 1 }}
                exit={
                  shouldAnimate
                    ? { opacity: 0, rotate: 35, scale: 0.75 }
                    : undefined
                }
                transition={{ duration: shouldAnimate ? 0.14 : 0 }}
              >
                {collapsed ? (
                  <PanelRightOpen size={18} />
                ) : (
                  <PanelRightClose size={18} />
                )}
              </motion.span>
            </AnimatePresence>
          </motion.button>
        </motion.div>
        {navigation(collapsed, "desktop")}
        {footer(collapsed)}
        {collapsed && tooltip && (
          <span
            className={css.tooltip}
            role="tooltip"
            style={{ top: tooltip.top }}
          >
            {tooltip.label}
          </span>
        )}
      </motion.aside>

      {/* Mobile Top Bar */}
      <div className={css.mobileBar}>
        <button
          ref={triggerRef}
          type="button"
          className={css.iconButton}
          onClick={() => onMobileChange(true)}
          aria-label={ar ? "فتح القائمة" : "Open navigation"}
          aria-expanded={mobileOpen}
          aria-controls="portal-navigation-drawer"
        >
          <Menu size={21} />
        </button>

        <button
          type="button"
          className={css.mobileBrand}
          onClick={() => navigate("overview")}
          aria-label={ar ? "ABOOD 3D — الرئيسية" : "ABOOD 3D — Home"}
        >
          {brand}
        </button>

        <div className={css.mobileControls}>
          {/* Polished language switcher with Globe icon */}
          <button
            type="button"
            className={`${css.iconButton} flex items-center gap-1 px-2 text-[11px] font-bold`}
            onClick={onToggleLanguage}
            aria-label={ar ? "Switch to English" : "التبديل إلى العربية"}
          >
            <Globe size={15} />
            <span>{ar ? "EN" : "AR"}</span>
          </button>
          <button
            type="button"
            className={css.iconButton}
            onClick={onToggleTheme}
            aria-label={ar ? "تبديل المظهر" : "Toggle theme"}
          >
            {isDark ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      <div
        className={css.mobileOverlay}
        data-open={mobileOpen}
        aria-hidden={!mobileOpen}
        onClick={() => onMobileChange(false)}
      >
        <aside
          ref={drawerRef}
          id="portal-navigation-drawer"
          className={css.drawer}
          role="dialog"
          aria-modal={mobileOpen}
          inert={!mobileOpen}
          aria-label={ar ? "القائمة الرئيسية" : "Main navigation"}
          onClick={(event) => event.stopPropagation()}
        >
          <div className={css.drawerHeader}>
            <button
              type="button"
              className={css.brand}
              onClick={() => navigate("overview")}
              aria-label={ar ? "ABOOD 3D — الرئيسية" : "ABOOD 3D — Home"}
            >
              {brand}
            </button>
            <button
              ref={closeRef}
              type="button"
              className={css.iconButton}
              onClick={() => onMobileChange(false)}
              aria-label={ar ? "إغلاق القائمة" : "Close navigation"}
            >
              <X size={20} />
            </button>
          </div>
          {navigation(false, "mobile")}
          {footer(false)}
        </aside>
      </div>
    </>
  );
}
