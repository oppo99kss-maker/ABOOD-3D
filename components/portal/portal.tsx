"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { signOut } from "next-auth/react";
import Image from "next/image";
import {
  ArrowUpLeft,
  Box,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ClipboardPaste,
  Clock,
  Download,
  ExternalLink,
  FileText,
  Globe2,
  HardDrive,
  HelpCircle,
  History,
  Info,
  KeyRound,
  LifeBuoy,
  LoaderCircle,
  LogOut,
  Moon,
  Package,
  RotateCcw,
  Search,
  ShieldAlert,
  ShieldCheck,
  ShoppingBag,
  Sliders,
  Sparkles,
  Sun,
  UserRound,
  X,
  BookOpen,
} from "lucide-react";
import { PortalNavigation, type PortalTab } from "./portal-navigation";
import { usePreferences } from "./use-preferences";
import { AdminControlSpace } from "./admin-control-space";
import { notify } from "@/lib/notify";
import type {
  Product,
  Guide,
  SystemSettings,
  Order,
  KeyResetRequest,
} from "@/lib/store";

type Data = {
  products: Product[];
  allProducts: Product[];
  guides: Guide[];
  settings: SystemSettings;
  inventory: Product[];
  dashboardStats: any;
  orders: Order[];
  allGuides: Guide[];
  resetRequests?: KeyResetRequest[];
  customerNotifications?: KeyResetRequest[];
  isAdmin: boolean;
  currentUser?: string;
};

type PortalUser = {
  name: string;
  email: string;
  image?: string | null;
};

const tabs: PortalTab[] = [
  "overview",
  "my-products",
  "redeem",
  "tickets",
  "profile",
  "admin",
];

export function Portal({ user }: { user: PortalUser }) {
  const { lang, isDark, setLang, toggleTheme } = usePreferences();
  const ar = lang === "ar";
  const t = (arStr: string, enStr: string) => (ar ? arStr : enStr);

  const [activeTab, setTab] = useState<PortalTab>("overview");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [key, setKey] = useState("");
  const [notice, setNotice] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [selectedProductModal, setSelectedProductModal] = useState<Product | null>(null);
  const [guideModalProduct, setGuideModalProduct] = useState<Product | null>(null);
  const [resetModalProduct, setResetModalProduct] = useState<Product | null>(null);
  const [submittingReset, setSubmittingReset] = useState(false);
  const [floatingAlertSeconds, setFloatingAlertSeconds] = useState(25);
  const [floatingAlertDismissed, setFloatingAlertDismissed] = useState(false);
  const [guideSearch, setGuideSearch] = useState("");

  const [data, setData] = useState<Data>({
    products: [],
    allProducts: [],
    guides: [],
    settings: {
      site_name: "SpooFX Control Space",
      description: "",
      maintenance_mode: false,
      maintenance_message: "",
      allow_new_activations: true,
      low_stock_threshold: 5,
    },
    inventory: [],
    dashboardStats: null,
    orders: [],
    allGuides: [],
    resetRequests: [],
    customerNotifications: [],
    isAdmin: false,
  });

  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/portal", { cache: "no-store" });
      if (!response.ok) throw new Error("Failed to load portal");
      const json = await response.json();
      setData({
        products: json.products || [],
        allProducts: json.allProducts || json.inventory || [],
        guides: json.guides || [],
        settings: json.settings || {
          site_name: "SpooFX Control Space",
          description: "",
          maintenance_mode: false,
          maintenance_message: "",
          allow_new_activations: true,
          low_stock_threshold: 5,
        },
        inventory: json.inventory || [],
        dashboardStats: json.dashboardStats || null,
        orders: json.orders || [],
        allGuides: json.allGuides || [],
        resetRequests: json.resetRequests || [],
        customerNotifications: json.customerNotifications || [],
        isAdmin: Boolean(json.isAdmin),
        currentUser: json.currentUser || user.email,
      });
      setLoadError(false);
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [user.email]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // Keep navigation clean at the browser URL root without appending hashes or section names
  useEffect(() => {
    if (typeof window !== "undefined" && window.location.hash) {
      window.history.replaceState(null, "", window.location.pathname + window.location.search);
    }
  }, []);

  // 25-Second floating alert timer on site entry
  useEffect(() => {
    if (floatingAlertDismissed) return;
    const timer = setInterval(() => {
      setFloatingAlertSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setFloatingAlertDismissed(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [floatingAlertDismissed]);

  const handleDismissFloatingAlert = useCallback(() => {
    setFloatingAlertDismissed(true);
    const activeNotif = data.customerNotifications?.[0];
    if (activeNotif && !activeNotif.customer_notified) {
      void fetch("/api/portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "dismissNotification",
          id: activeNotif.id,
        }),
      });
    }
  }, [data.customerNotifications]);

  function handleDownloadProduct(p: Product) {
    let downloadUrl = "/downloads/Spoofx.rar";
    if (Array.isArray(p.files) && p.files.length > 0 && p.files[0]?.url) {
      downloadUrl = p.files[0].url;
    } else if (typeof p.files === "string") {
      try {
        const parsed = JSON.parse(p.files);
        if (Array.isArray(parsed) && parsed[0]?.url) downloadUrl = parsed[0].url;
      } catch {}
    }
    const a = document.createElement("a");
    a.href = downloadUrl;
    a.download = "Spoofx.rar";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    notify.success(t("بدء التحميل", "Download Started"), t(`جاري تحميل حزمة ${p.name}...`, `Downloading ${p.name} package...`));
  }

  async function handleSubmitResetRequest(productId: string, productName: string, reason: string) {
    setSubmittingReset(true);
    try {
      const res = await fetch("/api/portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "requestKeyReset",
          productId,
          productName,
          reason,
        }),
      });
      const resJson = await res.json();
      if (!res.ok) throw new Error(resJson.message || resJson.error || "Failed to submit request");
      notify.success(
        t("تم إرسال طلب الرستات", "Request Sent"),
        t("تم إرسال طلب رستات المفتاح للإدارة بنجاح وسيتم الرد قريباً", "Reset request sent to admin for review")
      );
      setResetModalProduct(null);
      await refresh();
      setFloatingAlertSeconds(25);
      setFloatingAlertDismissed(false);
    } catch (err: any) {
      notify.error(t("خطأ", "Error"), err.message || t("فشل إرسال طلب الرستات", "Failed to submit reset request"));
    } finally {
      setSubmittingReset(false);
    }
  }

  function navigate(tab: PortalTab) {
    if (tab === "admin" && !data.isAdmin) return;
    setTab(tab);
    setNotice(null);
    setQuery("");
  }

  async function action(payload: Record<string, unknown>) {
    const response = await fetch("/api/portal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || result.message || "SERVICE_UNAVAILABLE");
    return result;
  }

  function errorText(error: unknown) {
    const code = error instanceof Error ? error.message : "SERVICE_UNAVAILABLE";
    if (code === "INVALID_KEY") return t("صيغة المفتاح غير صحيحة، يرجى التأكد من الرمز المدخل.", "Invalid key format, please check the entered code.");
    if (code === "KEY_UNAVAILABLE") return t("المفتاح غير موجود، تم استخدامه مسبقاً، أو غير متاح.", "This key does not exist, has already been redeemed, or is unavailable.");
    if (code === "KEY_BLOCKED") return t("هذا المفتاح تم حظره لأسباب أمنية. تواصل مع الدعم الفني.", "This key has been blocked for security reasons. Contact support.");
    if (code === "KEY_EXPIRED") return t("هذا المفتاح انتهت صلاحيته.", "This key has expired.");
    if (code === "REDEMPTIONS_DISABLED") return t("التفعيل متوقف مؤقتاً لأعمال الصيانة.", "Redemptions are temporarily suspended for maintenance.");
    if (code === "INVALID_URL") return t("استخدم رابط HTTPS صحيحاً.", "Use a valid HTTPS URL.");
    if (code === "FORBIDDEN") return t("لا تملك صلاحية تنفيذ هذا الإجراء.", "You do not have permission for this action.");
    return t("تعذّر تنفيذ العملية. حاول مرة أخرى.", "The operation failed. Please try again.");
  }

  async function redeem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || !key.trim()) return;
    setBusy(true);
    try {
      const res = await action({ action: "redeem", code: key.trim() });
      setKey("");
      await refresh();
      notify.success(
        t("تم التفعيل", "Activated"),
        t(`المنتج جاهز في مكتبتك (${res.product?.name || ""})`, `Product (${res.product?.name || ""}) added to library`)
      );
    } catch (error) {
      notify.error(t("تعذر التفعيل", "Activation Failed"), errorText(error));
    } finally {
      setBusy(false);
    }
  }

  async function handlePaste() {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setKey(text.trim());
      }
    } catch {
      // clipboard permission denied
    }
  }

  const titles: Record<PortalTab, { title: string; desc: string }> = {
    overview: { title: t("الرئيسية", "Overview"), desc: t("نظرة سريعة على حسابك وتراخيصك.", "Quick overview of your licenses.") },
    "my-products": { title: t("منتجاتي", "My Products"), desc: t("تراخيصك ومفاتيحك الرقمية.", "Your digital products and keys.") },
    redeem: { title: t("تفعيل مفتاح", "Activate Key"), desc: t("أدخل مفتاحك لإضافة المنتج إلى مكتبتك.", "Enter your key to unlock products.") },
    tickets: { title: t("المساعدة", "Help"), desc: t("أدلة الاستخدام والأسئلة الشائعة.", "Setup guides and documentation.") },
    profile: { title: t("حسابي", "My Account"), desc: t("بيانات الحساب وسجل التفعيلات.", "Profile and activation history.") },
    admin: { title: t("الإدارة", "Admin Space"), desc: t("مركز إدارة النظام.", "System control space.") },
  };

  const activeProducts = useMemo(() => {
    return data.products.filter((p) => {
      const isExpired = p.expires_at && new Date(p.expires_at) <= new Date();
      if (isExpired) return false;
      if (!query.trim()) return true;
      return (p.name + (p.description || "") + (p.category || "")).toLowerCase().includes(query.toLowerCase());
    });
  }, [data.products, query]);

  const expiredProducts = useMemo(() => {
    return data.products.filter((p) => {
      const isExpired = p.expires_at && new Date(p.expires_at) <= new Date();
      if (!isExpired) return false;
      if (!query.trim()) return true;
      return (p.name + (p.description || "") + (p.category || "")).toLowerCase().includes(query.toLowerCase());
    });
  }, [data.products, query]);

  const activeProductsCount = useMemo(() => {
    return data.products.filter((p) => !p.expires_at || new Date(p.expires_at) > new Date()).length;
  }, [data.products]);

  const filteredGuides = useMemo(() => {
    if (!guideSearch) return data.guides;
    return data.guides.filter((g) =>
      (g.title + (g.title_en || "") + g.content + (g.content_en || "") + (g.category || "")).toLowerCase().includes(guideSearch.toLowerCase())
    );
  }, [data.guides, guideSearch]);

  return (
    <div className="portal-shell" data-theme={isDark ? "dark" : "light"} dir={ar ? "rtl" : "ltr"}>
      <PortalNavigation
        activeTab={activeTab}
        onNavigate={navigate}
        lang={lang}
        isDark={isDark}
        isAdmin={data.isAdmin}
        productCount={data.products.length}
        mobileOpen={mobileOpen}
        onMobileChange={setMobileOpen}
        onToggleTheme={toggleTheme}
        onToggleLanguage={() => setLang(ar ? "en" : "ar")}
        onLogout={() => void signOut({ callbackUrl: "/" })}
        user={{ name: user.name, email: user.email, image: user.image }}
      />

      <div className="portal-body">
        {/* Announcement / Maintenance Banner if set */}
        {(data.settings.maintenance_mode || data.settings.maintenance_message) && (
          <div className="global-announcement-banner">
            <Info size={16} />
            <span>{data.settings.maintenance_message || (ar ? "النظام في وضع الصيانة حالياً" : "System is currently in maintenance mode")}</span>
          </div>
        )}

        {activeTab === "admin" && data.isAdmin ? (
          <AdminControlSpace
            products={data.allProducts && data.allProducts.length > 0 ? data.allProducts : (data.inventory && data.inventory.length > 0 ? data.inventory : data.products)}
            inventory={data.inventory}
            dashboardStats={data.dashboardStats}
            orders={data.orders}
            allGuides={data.allGuides}
            settings={data.settings}
            resetRequests={data.resetRequests || []}
            currentUser={data.currentUser || user.email}
            lang={lang}
            isDark={isDark}
            onRefresh={refresh}
            onExitAdmin={() => navigate("overview")}
            onToggleTheme={toggleTheme}
            onToggleLanguage={() => setLang(ar ? "en" : "ar")}
          />
        ) : (
          <>
            {/* 25-Second Floating Alert on Customer Site Entry */}
            {!floatingAlertDismissed && (
              <aside className="portal-floating-alert-25s" role="alert" aria-live="polite">
                <div className="alert-content-row">
                  <div className="alert-badge-icon">
                    {(() => {
                      const notif = data.customerNotifications?.[0];
                      if (notif?.status === "APPROVED") return <CheckCircle2 size={20} className="text-success" />;
                      if (notif?.status === "REJECTED") return <ShieldAlert size={20} className="text-danger" />;
                      if (notif?.status === "PENDING") return <Clock size={20} className="text-warning" />;
                      return <Sparkles size={20} className="text-cyan" />;
                    })()}
                  </div>

                  <div className="alert-text-body">
                    {(() => {
                      const notif = data.customerNotifications?.[0];
                      if (notif) {
                        if (notif.status === "APPROVED") {
                          return (
                            <>
                              <div className="alert-headline">
                                <strong>{t("تمت الموافقة على طلب رستات المفتاح!", "Key Reset Request Approved!")}</strong>
                                <span className="alert-chip approved">{t("معتمد", "Approved")}</span>
                              </div>
                              <p>
                                {t(
                                  `تمت الموافقة على طلب رستات المفتاح لمنتج "${notif.product_name}". يمكنك الآن إعادة استخدام المفتاح على جهازك الجديد.`,
                                  `Your key reset request for "${notif.product_name}" was approved. You can now use the key on your new device.`
                                )}
                                {notif.admin_notes && (
                                  <span className="alert-admin-note">
                                    {" "}• {t("ملاحظة الإدارة:", "Admin note:")} {notif.admin_notes}
                                  </span>
                                )}
                              </p>
                            </>
                          );
                        }
                        if (notif.status === "REJECTED") {
                          return (
                            <>
                              <div className="alert-headline">
                                <strong>{t("تم رفض طلب رستات المفتاح", "Key Reset Request Rejected")}</strong>
                                <span className="alert-chip rejected">{t("مرفوض", "Rejected")}</span>
                              </div>
                              <p>
                                {t(
                                  `تم رفض طلب رستات المفتاح لمنتج "${notif.product_name}".`,
                                  `Your key reset request for "${notif.product_name}" was rejected.`
                                )}
                                {notif.admin_notes && (
                                  <span className="alert-admin-note">
                                    {" "}• {t("ملاحظة الإدارة:", "Admin note:")} {notif.admin_notes}
                                  </span>
                                )}
                              </p>
                            </>
                          );
                        }
                        return (
                          <>
                            <div className="alert-headline">
                              <strong>{t("طلب رستات المفتاح قيد المراجعة", "Key Reset Request Pending")}</strong>
                              <span className="alert-chip pending">{t("قيد التدقيق", "In Review")}</span>
                            </div>
                            <p>
                              {t(
                                `طلبك لإعادة تعيين مفتاح "${notif.product_name}" قيد المراجعة حالياً من قبل الإدارة وسيتم الرد قريباً.`,
                                `Your key reset request for "${notif.product_name}" is currently under review by our admin team.`
                              )}
                            </p>
                          </>
                        );
                      }
                      return (
                        <>
                          <div className="alert-headline">
                            <strong>{t("مرحباً بك في منصة SpooFX الرقمية", "Welcome to SpooFX Control Space")}</strong>
                            <span className="alert-chip system">{t("إشعار العميل", "Member Alert")}</span>
                          </div>
                          <p>
                            {t(
                              "يمكنك تحميل البرنامج المحدث، تصفح دليل المنتج وشرح الفيديو، أو إرسال طلب رستات مفتاح (HWID) بسهولة من بطاقات منتجاتك.",
                              "You can download software, browse video guides, or request a HWID key reset directly from your product cards."
                            )}
                          </p>
                        </>
                      );
                    })()}
                  </div>

                  <div className="alert-actions-side">
                    <div className="alert-timer-tag" title={t("يختفي تلقائياً بعد 25 ثانية", "Auto-dismisses in 25 seconds")}>
                      <Clock size={12} />
                      <span>{floatingAlertSeconds} {t("ثانية", "s")}</span>
                    </div>
                    <button
                      type="button"
                      className="alert-dismiss-btn"
                      onClick={handleDismissFloatingAlert}
                      title={t("إغلاق الإشعار (X)", "Dismiss (X)")}
                      aria-label="Close alert"
                    >
                      <X size={16} />
                    </button>
                  </div>
                </div>

                <div className="alert-progress-track">
                  <div
                    className="alert-progress-bar-fill"
                    style={{ width: `${Math.max(0, Math.min(100, (floatingAlertSeconds / 25) * 100))}%` }}
                  />
                </div>
              </aside>
            )}

            <main className="portal-main">
          {/* Header Bar */}
          <div className="page-heading">
            <div className="page-heading-info">
              <h1>{titles[activeTab].title}</h1>
              {activeTab !== "overview" && titles[activeTab].desc && (
                <p>{titles[activeTab].desc}</p>
              )}
            </div>

            <div className="portal-top-controls">
              <button
                type="button"
                className="top-ctrl-pill-btn"
                onClick={() => setLang(lang === "ar" ? "en" : "ar")}
                title={t("تغيير اللغة", "Toggle Language")}
              >
                <Globe2 size={14} />
                <span>{lang === "ar" ? "EN" : "عربي"}</span>
              </button>

              <button
                type="button"
                className="top-ctrl-pill-btn"
                onClick={toggleTheme}
                title={t("تغيير المظهر", "Toggle Theme")}
              >
                {isDark ? <Sun size={15} /> : <Moon size={15} />}
              </button>
            </div>
          </div>

          {loading && (
            <div className="panel empty" role="status">
              <LoaderCircle className="spin" size={32} />
              <p>{t("جارٍ تحميل حسابك ومنتجاتك…", "Loading your account and products…")}</p>
            </div>
          )}

          {!loading && loadError && (
            <div className="panel empty" role="alert">
              <h2>{t("تعذّر تحميل البيانات", "Unable to load data")}</h2>
              <p>{t("تحقق من اتصالك بالإنترنت ثم أعد المحاولة.", "Check your connection and try again.")}</p>
              <button className="secondary-button" onClick={() => void refresh()}>
                {t("إعادة المحاولة", "Try again")}
              </button>
            </div>
          )}

          {!loading && !loadError && (
            <>
              {/* ==================================================== */}
              {/* TAB 1: OVERVIEW */}
              {/* ==================================================== */}
              {activeTab === "overview" && (
                <div className="ref-overview-wrapper">
                  <div className="ref-overview-main-grid">
                    {/* Primary Column (Hero + Metrics) */}
                    <div className="ref-overview-primary-col">
                      {/* Hero Welcome Card */}
                      <section className="ref-hero-card">
                        <div className="ref-hero-info">
                          <div className="ref-hero-status-tag">
                            <span className="ref-hero-pulse-dot" />
                            <span>{t("حسابك متصل", "Account Connected")}</span>
                          </div>
                          <h2>
                            {t("مرحباً بعودتك،", "Welcome back,")} {user.name}!
                          </h2>
                          <p>
                            {data.products.length > 0
                              ? t(
                                  `لديك ${data.products.length} منتجات مفعلة بحسابك.`,
                                  `You have ${data.products.length} active products in your account.`
                                )
                              : t(
                                  "مكتبتك الرقمية جاهزة. أدخل مفتاح الترخيص لتفعيل منتجك فوراً.",
                                  "Your digital library is ready. Enter your key to activate."
                                )}
                          </p>
                        </div>
                        <div className="ref-hero-avatar-wrap">
                          {user.image ? (
                            <img
                              src={user.image}
                              alt={user.name}
                              className="ref-hero-avatar-img"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <div className="ref-hero-avatar-fallback">
                              {user.name ? user.name[0].toUpperCase() : "U"}
                            </div>
                          )}
                        </div>
                      </section>

                      {/* 3 Metric Stat Cards */}
                      <div className="ref-metric-cards-grid">
                        {/* Card 1: Active Products */}
                        <div className="ref-metric-card">
                          <div className="ref-metric-icon-wrap">
                            <Box size={18} />
                          </div>
                          <strong className="ref-metric-value">{data.products.length}</strong>
                          <span className="ref-metric-label">{t("منتجات مفعلة", "Active Products")}</span>
                        </div>

                        {/* Card 2: Account Status */}
                        <div className="ref-metric-card">
                          <div className="ref-metric-icon-wrap">
                            <Clock size={18} />
                          </div>
                          <strong className="ref-metric-value">{t("فعال", "Active")}</strong>
                          <span className="ref-metric-label">{t("حالة الحساب", "Account Status")}</span>
                        </div>

                        {/* Card 3: Member Since */}
                        <div className="ref-metric-card">
                          <div className="ref-metric-icon-wrap">
                            <Clock size={18} />
                          </div>
                          <strong className="ref-metric-value">
                            {new Date().toLocaleDateString(ar ? "ar-SA" : "en-US", { month: "long", year: "numeric" })}
                          </strong>
                          <span className="ref-metric-label">{t("عضو منذ", "Member Since")}</span>
                        </div>
                      </div>
                    </div>

                    {/* Secondary Column: Quick Actions Card */}
                    <div className="ref-overview-secondary-col">
                      <section className="ref-quick-actions-card">
                        <h3 className="ref-quick-actions-title">{t("إجراءات سريعة", "Quick Actions")}</h3>
                        <div className="ref-quick-actions-list">
                          {/* 1. My Products */}
                          <button
                            type="button"
                            className="ref-quick-action-row"
                            onClick={() => navigate("my-products")}
                          >
                            <div className="ref-action-lead">
                              <span className="ref-action-icon-pill">
                                <Box size={16} />
                              </span>
                              <span className="ref-action-text">{t("منتجاتي", "My Products")}</span>
                            </div>
                            <ChevronLeft size={16} className={`ref-action-arrow ${!ar ? "rotate-180" : ""}`} />
                          </button>

                          {/* 2. Activate Key */}
                          <button
                            type="button"
                            className="ref-quick-action-row"
                            onClick={() => navigate("redeem")}
                          >
                            <div className="ref-action-lead">
                              <span className="ref-action-icon-pill">
                                <KeyRound size={16} />
                              </span>
                              <span className="ref-action-text">{t("تفعيل مفتاح", "Activate Key")}</span>
                            </div>
                            <ChevronLeft size={16} className={`ref-action-arrow ${!ar ? "rotate-180" : ""}`} />
                          </button>

                          {/* 3. Store */}
                          <a
                            href="https://spoofx.rmz.gg/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="ref-quick-action-row"
                          >
                            <div className="ref-action-lead">
                              <span className="ref-action-icon-pill">
                                <ShoppingBag size={16} />
                              </span>
                              <span className="ref-action-text">{t("المتجر", "Store")}</span>
                            </div>
                            <ChevronLeft size={16} className={`ref-action-arrow ${!ar ? "rotate-180" : ""}`} />
                          </a>

                          {/* 4. Help Center */}
                          <button
                            type="button"
                            className="ref-quick-action-row"
                            onClick={() => navigate("tickets")}
                          >
                            <div className="ref-action-lead">
                              <span className="ref-action-icon-pill">
                                <LifeBuoy size={16} />
                              </span>
                              <span className="ref-action-text">{t("مركز المساعدة", "Help Center")}</span>
                            </div>
                            <ChevronLeft size={16} className={`ref-action-arrow ${!ar ? "rotate-180" : ""}`} />
                          </button>
                        </div>
                      </section>
                    </div>
                  </div>

                  {/* Bottom Luxury Banner Card */}
                  <section className="ref-bottom-brand-banner">
                    <div className="ref-brand-banner-lead">
                      <div className="ref-brand-banner-icon">
                        <Image src="/brand.svg" width={30} height={30} alt="SpooFX" />
                      </div>
                      <div className="ref-brand-banner-meta">
                        <strong className="ref-brand-banner-name">SpooFX</strong>
                        <span className="ref-brand-banner-desc">
                          {t("منتجاتك وتراخيصك في مكان واحد", "Your products and licenses in one place")}
                        </span>
                      </div>
                    </div>

                    <div className="ref-brand-banner-badge">
                      <ShieldCheck size={16} />
                      <span>{t("وثيقة العمل الحر / موثق رسمياً", "Verified Digital Identity")}</span>
                    </div>
                  </section>

                  {/* Copyright Footer */}
                  <footer className="ref-overview-copyright">
                    <p>{t("جميع الحقوق محفوظة © 2026 SpooFX", "All rights reserved © 2026 SpooFX")}</p>
                  </footer>
                </div>
              )}

              {/* ==================================================== */}
              {/* TAB 2: MY PRODUCTS */}
              {/* ==================================================== */}
              {activeTab === "my-products" && (
                <div className="products-view-container">
                  {/* Search Toolbar */}
                  {data.products.length > 0 && (
                    <div className="panel products-search-bar">
                      <label className="search full-search">
                        <Search size={16} />
                        <input
                          value={query}
                          onChange={(e) => setQuery(e.target.value)}
                          aria-label={t("ابحث في منتجاتك", "Search products")}
                          placeholder={t("ابحث في منتجاتك بالاسم أو الفئة…", "Search products by name or category…")}
                        />
                      </label>
                      {query && (
                        <button className="text-button" onClick={() => setQuery("")}>
                          {t("مسح", "Clear")}
                        </button>
                      )}
                    </div>
                  )}

                  {/* SECTION 1: منتجاتي النشطة */}
                  <section className="product-category-section">
                    <div className="category-section-header">
                      <div className="category-header-title">
                        <span className="category-badge active">
                          <CheckCircle2 size={16} />
                        </span>
                        <h2>
                          {t("منتجاتي النشطة", "My Active Products")}
                          <span className="section-count active-count">{activeProducts.length}</span>
                        </h2>
                      </div>
                      <p className="category-subtitle">
                        {t("التراخيص الفعالة المتاحة للاستخدام المباشر.", "Active licenses available for immediate access.")}
                      </p>
                    </div>

                    <ProductGrid
                      products={activeProducts}
                      ar={ar}
                      onRedeem={() => navigate("redeem")}
                      onOpenDetails={(p) => setSelectedProductModal(p)}
                      onOpenGuide={(p) => setGuideModalProduct(p)}
                      onOpenReset={(p) => setResetModalProduct(p)}
                      onDownload={(p) => handleDownloadProduct(p)}
                      emptySearch={Boolean(query)}
                      customEmptyTitle={t("لا توجد منتجات نشطة حالياً", "No active products currently")}
                      customEmptyDesc={t("أدخل مفتاح الترخيص لإضافة منتج نشط إلى حسابك.", "Enter a license key to activate a product.")}
                    />
                  </section>

                  {/* SPACING & DIVIDER */}
                  <div className="products-section-divider" />

                  {/* SECTION 2: منتجاتي المنتهية (أسفل الصفحة) */}
                  <section className="product-category-section expired-section">
                    <div className="category-section-header">
                      <div className="category-header-title">
                        <span className="category-badge expired">
                          <Clock size={16} />
                        </span>
                        <h2>
                          {t("منتجاتي المنتهية", "My Expired Products")}
                          <span className="section-count expired-count">{expiredProducts.length}</span>
                        </h2>
                      </div>
                      <p className="category-subtitle">
                        {t("تراخيص سابقة انتهت مدة صلاحيتها.", "Previous licenses that have expired.")}
                      </p>
                    </div>

                    {expiredProducts.length > 0 ? (
                      <ProductGrid
                        products={expiredProducts}
                        ar={ar}
                        onRedeem={() => navigate("redeem")}
                        onOpenDetails={(p) => setSelectedProductModal(p)}
                        onOpenGuide={(p) => setGuideModalProduct(p)}
                        onOpenReset={(p) => setResetModalProduct(p)}
                        onDownload={(p) => handleDownloadProduct(p)}
                        emptySearch={Boolean(query)}
                      />
                    ) : (
                      <div className="panel empty-subtle-box">
                        <Clock size={18} />
                        <span>{t("لا توجد لديك تراخيص منتهية الصلاحية.", "You have no expired licenses.")}</span>
                      </div>
                    )}
                  </section>
                </div>
              )}

              {/* ==================================================== */}
              {/* TAB 3: REDEEM KEY */}
              {/* ==================================================== */}
              {activeTab === "redeem" && (
                <div className="form-layout">
                  <section className="panel activation">
                    <span className="large-icon">
                      <KeyRound size={28} />
                    </span>
                    <h2>{t("تفعيل مفتاح ترخيص رقمي", "Activate License Key")}</h2>
                    <p>{t("أدخل رمز المفتاح الذي حصلت عليه بعد الشراء لإضافة المنتج إلى مكتبتك فوراً.", "Enter the key code received upon purchase to unlock the product immediately.")}</p>

                    <form onSubmit={redeem}>
                      <div className="label-with-format">
                        <label htmlFor="license-key">{t("رمز مفتاح الترخيص", "License Key")}</label>
                        <span className="key-format-tag" dir="ltr" style={{ direction: "ltr", unicodeBidi: "isolate" }}>
                          KEY-XXXX-XXXX-XXXX
                        </span>
                      </div>
                      <div className="key-input-wrapper">
                        <input
                          id="license-key"
                          dir="ltr"
                          value={key}
                          onChange={(e) => setKey(e.target.value.trim())}
                          placeholder="KEY-XXXX-XXXX-XXXX"
                          required
                          maxLength={48}
                          autoComplete="off"
                          spellCheck={false}
                          className="key-field"
                        />
                        <button
                          type="button"
                          className="paste-input-btn"
                          onClick={() => void handlePaste()}
                          title={t("لصق من الحافظة", "Paste from clipboard")}
                        >
                          <ClipboardPaste size={16} />
                          <span>{t("لصق", "Paste")}</span>
                        </button>
                      </div>

                      <button className="primary-button submit-redeem" type="submit" disabled={busy || !key.trim()}>
                        {busy ? <LoaderCircle className="spin" size={17} /> : <KeyRound size={17} />}
                        {t("تفعيل وإضافة المنتج", "Redeem & Add Product")}
                      </button>
                    </form>

                    {notice && (
                      <div className={`inline-notice ${notice.type === "success" ? "success-notice" : "error-notice"}`} role="status">
                        {notice.type === "success" ? <CheckCircle2 size={18} /> : <ShieldAlert size={18} />}
                        <div>
                          <strong>{notice.type === "success" ? t("تم التفعيل بنجاح!", "Activation Successful!") : t("خطأ في التفعيل", "Redemption Error")}</strong>
                          <p>{notice.message}</p>
                        </div>
                        {notice.type === "success" && (
                          <button className="text-button" onClick={() => navigate("my-products")}>
                            {t("فتح المكتبة", "Open Library")} <ArrowUpLeft size={14} />
                          </button>
                        )}
                      </div>
                    )}

                    <div className="muted-note">
                      <ShieldCheck size={15} />
                      {t("المفاتيح الرقمية مشفرة وصالحة للاستخدام مرة واحدة فقط.", "Digital keys are encrypted and strictly single-use.")}
                    </div>
                  </section>

                  {/* Instructions Sidebar */}
                  <section className="panel instructions">
                    <h2>{t("خطوات التشغيل السريع", "Quick Steps")}</h2>
                    {[
                      t("تسجيل الدخول بحساب Google المعتمد", "Sign in with verified Google account"),
                      t("إدخال مفتاح الترخيص بصيغة KEY-XXXX-XXXX-XXXX", "Enter your license key in KEY-XXXX-XXXX-XXXX format"),
                      t("فتح صفحة منتجاتي لتحميل الملفات والتعليمات", "Open My Products to download software & guides"),
                    ].map((step, index) => (
                      <div key={step}>
                        <b>0{index + 1}</b>
                        <p>{step}</p>
                      </div>
                    ))}

                    <div className="support-callout">
                      <p>{t("هل واجهت مشكلة في المفتاح؟", "Need assistance with your license?")}</p>
                      <button className="secondary-button" onClick={() => navigate("tickets")}>
                        <LifeBuoy size={15} />
                        {t("زيارة مركز المساعدة", "Help Center")}
                      </button>
                    </div>
                  </section>
                </div>
              )}

              {/* ==================================================== */}
              {/* TAB 4: HELP & GUIDES */}
              {/* ==================================================== */}
              {activeTab === "tickets" && (
                <section className="help-section">
                  <div className="panel support-hero">
                    <LifeBuoy size={42} />
                    <h2>{t("مركز المساعدة والأدلة الفنية", "Help & Knowledge Base")}</h2>
                    <p>{t("شروحات مفصلة، خطوات التثبيت، والحلول السريعة لأكثر المشاكل شيوعاً.", "Detailed guides, installation steps, and quick solutions to common issues.")}</p>
                    <label className="search help-search">
                      <Search size={18} />
                      <input
                        value={guideSearch}
                        onChange={(e) => setGuideSearch(e.target.value)}
                        placeholder={t("ابحث في شروحات المنصة والمشاكل الشائعة…", "Search articles and setup guides…")}
                      />
                    </label>
                  </div>

                  {filteredGuides.length > 0 ? (
                    <div className="faq-list">
                      {filteredGuides.map((guide) => (
                        <details className="panel guide-faq-item" key={guide.id}>
                          <summary>
                            <span className="faq-title-wrap">
                              <span className="guide-cat-tag">{guide.category}</span>
                              <strong>{ar ? guide.title : (guide.title_en || guide.title)}</strong>
                            </span>
                            <ChevronDown size={18} className="faq-chevron" />
                          </summary>
                          <div className="guide-content-body">
                            <p>{ar ? guide.content : (guide.content_en || guide.content)}</p>
                          </div>
                        </details>
                      ))}
                    </div>
                  ) : (
                    <div className="panel empty compact-empty">
                      <HelpCircle size={28} />
                      <h3>{t("لا توجد مقالات مطابقة لبحثك", "No guides match your search")}</h3>
                      <p>{t("جرّب البحث بكلمات أخرى أو تواصل مباشرة مع الدعم الفني.", "Try different search terms or reach out to support.")}</p>
                    </div>
                  )}

                  {/* Support Footer Note */}
                  <div className="panel support-contact-card">
                    <div>
                      <h3>{t("هل ما زلت بحاجة إلى مساعدة مخصصة؟", "Still need personalized assistance?")}</h3>
                      <p>{t("فريق الدعم الفني متواجد لمساعدتك في حل أي مشكلة أو استبدال مفتاح غير صالح.", "Our technical team is available to assist you or replace malfunctioning keys.")}</p>
                    </div>
                    <a href="mailto:support@spoofx.com" className="primary-button">
                      {t("مراسلة الدعم الفني", "Contact Support")}
                      <ArrowUpLeft size={16} />
                    </a>
                  </div>
                </section>
              )}

              {/* ==================================================== */}
              {/* TAB 5: PROFILE & ACTIVATION HISTORY */}
              {/* ==================================================== */}
              {activeTab === "profile" && (
                <div className="profile-page-wrapper">
                  {/* Top VIP Profile Hero Card */}
                  <section className="panel profile-hero-card">
                    <div className="profile-hero-user">
                      <Avatar image={user.image} name={user.name} size={64} />
                      <div className="profile-hero-details">
                        <div className="profile-name-row">
                          <h2>{user.name}</h2>
                          {data.isAdmin ? (
                            <span className="role-tag admin">{t("مدير منصة", "Platform Admin")}</span>
                          ) : (
                            <span className="role-tag client">{t("عميل موثق", "Verified Client")}</span>
                          )}
                          <span className="status-pill verified-pill">
                            <CheckCircle2 size={12} /> Google Verified
                          </span>
                        </div>
                        <p className="profile-hero-email" dir="ltr">{user.email}</p>
                      </div>
                    </div>

                    <div className="profile-hero-metrics">
                      <div className="hero-stat-pill">
                        <span>{t("المنتجات المسجلة", "Registered Products")}</span>
                        <strong>{data.products.length}</strong>
                      </div>
                      <div className="hero-stat-pill">
                        <span>{t("حالة الحساب", "Account Status")}</span>
                        <strong className="text-success">{t("نشط وموثق", "Active")}</strong>
                      </div>
                    </div>

                    <div className="profile-hero-actions">
                      <button className="secondary-button logout-btn" onClick={() => void signOut({ callbackUrl: "/" })}>
                        <LogOut size={15} />
                        {t("تسجيل الخروج", "Sign Out")}
                      </button>
                    </div>
                  </section>

                  {/* Balanced 2-Column Content Grid */}
                  <div className="profile-content-grid">
                    {/* Preferences Card */}
                    <section className="panel preferences-card">
                      <div className="card-header-row">
                        <div className="card-header-icon blue">
                          <Sliders size={18} />
                        </div>
                        <div>
                          <h3>{t("تفضيلات الواجهة", "Display Preferences")}</h3>
                          <small>{t("المظهر العام وخيارات اللغة", "Theme mode and language settings")}</small>
                        </div>
                      </div>

                      <div className="pref-items-list">
                        <div className="pref-row">
                          <div>
                            <strong>{t("المظهر العام", "Theme Mode")}</strong>
                            <small>{isDark ? t("الوضع الداكن الفخم", "Dark Luxury Theme") : t("الوضع الفاتح", "Light Theme")}</small>
                          </div>
                          <button className="secondary-button pref-toggle-btn" onClick={toggleTheme}>
                            {isDark ? <Sun size={15} /> : <Moon size={15} />}
                            {isDark ? t("الوضع الفاتح", "Light") : t("الوضع الداكن", "Dark")}
                          </button>
                        </div>

                        <div className="pref-row">
                          <div>
                            <strong>{t("لغة الواجهة", "Language")}</strong>
                            <small>{ar ? "العربية (RTL)" : "English (LTR)"}</small>
                          </div>
                          <button className="secondary-button pref-toggle-btn" onClick={() => setLang(ar ? "en" : "ar")}>
                            <Globe2 size={15} />
                            {ar ? "English" : "العربية"}
                          </button>
                        </div>

                        <div className="pref-row">
                          <div>
                            <strong>{t("الأمان والتوثيق", "Security")}</strong>
                            <small>{t("مصادقة Google OAuth مشفرة", "Encrypted Google OAuth 2.0")}</small>
                          </div>
                          <span className="security-verified-tag">
                            <ShieldCheck size={14} /> {t("محمي وموثق", "Secured")}
                          </span>
                        </div>
                      </div>

                      <p className="pref-note">{t("تفضيلاتك تُحفظ تلقائياً في المتصفح.", "Preferences are preserved locally in your browser.")}</p>
                    </section>

                    {/* Subscriptions & Activations History */}
                    <section className="panel history-card">
                      <div className="card-header-row">
                        <div className="card-header-icon green">
                          <History size={18} />
                        </div>
                        <div>
                          <h3>{t("سجل الاشتراكات والتراخيص", "Subscription History")}</h3>
                          <small>{t("التراخيص المرتبطة بحسابك", "Licenses tied to your account")}</small>
                        </div>
                        {data.products.length > 0 && (
                          <span className="history-count-badge">{data.products.length}</span>
                        )}
                      </div>

                      {data.products.length > 0 ? (
                        <div className="profile-products-compact-list">
                          {data.products.map((p) => {
                            const isExpired = p.expires_at && new Date(p.expires_at) <= new Date();
                            return (
                              <div className="compact-product-item" key={p.id}>
                                <div className="compact-product-icon">
                                  {p.image_url ? (
                                    <img src={p.image_url} alt="" />
                                  ) : (
                                    <Package size={18} />
                                  )}
                                </div>
                                <div className="compact-product-info">
                                  <strong>{p.name}</strong>
                                  <div className="compact-product-sub">
                                    <span className={`status-badge-inline ${isExpired ? "expired" : "active"}`}>
                                      <i className="dot" />
                                      {isExpired ? t("منتهي", "Expired") : t("نشط", "Active")}
                                    </span>
                                    <span>
                                      {p.expires_at ? (
                                        <time dateTime={p.expires_at}>
                                          {new Date(p.expires_at).toLocaleDateString(ar ? "ar-SA" : "en-US")}
                                        </time>
                                      ) : (
                                        t("دائم", "Lifetime")
                                      )}
                                    </span>
                                  </div>
                                </div>
                                <button
                                  className="btn-action compact-btn"
                                  onClick={() => setSelectedProductModal(p)}
                                  title={t("عرض التفاصيل", "View Details")}
                                >
                                  <FileText size={14} />
                                  <span>{t("التفاصيل", "Details")}</span>
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="profile-compact-empty">
                          <div className="empty-key-icon">
                            <KeyRound size={22} />
                          </div>
                          <h4>{t("لا توجد اشتراكات مسجلة بعد", "No active subscriptions yet")}</h4>
                          <p>{t("قم بتفعيل مفتاح ترخيص رقمي ليظهر في مكتبتك وسجل حسابك.", "Activate a key to link your first product.")}</p>
                          <button className="primary-button empty-activate-btn" onClick={() => navigate("redeem")}>
                            <KeyRound size={15} />
                            {t("تفعيل مفتاح ترخيص", "Activate a Key")}
                          </button>
                        </div>
                      )}
                    </section>
                  </div>
                </div>
              )}
            </>
          )}
        </main>

        <footer className="portal-footer">
          <div className="footer-left">
            <span>© {new Date().getFullYear()} SpooFX Control Space. All rights reserved.</span>
          </div>
          <div className="footer-right">
            <span>{t("بوابة التراخيص الرقمية وإدارة العملاء", "Digital Licensing & Customer Portal")}</span>
          </div>
        </footer>
      </>
    )}
      </div>

      {/* ==================================================== */}
      {/* PRODUCT DETAILS & FILES MODAL */}
      {/* ==================================================== */}
      {selectedProductModal && (
        <ProductDetailModal
          product={selectedProductModal}
          ar={ar}
          onClose={() => setSelectedProductModal(null)}
        />
      )}

      {/* ==================================================== */}
      {/* PRODUCT GUIDE & VIDEO TUTORIAL MODAL */}
      {/* ==================================================== */}
      {guideModalProduct && (
        <ProductGuideModal
          product={guideModalProduct}
          ar={ar}
          onClose={() => setGuideModalProduct(null)}
          onDownload={() => handleDownloadProduct(guideModalProduct)}
          onOpenReset={() => {
            const p = guideModalProduct;
            setGuideModalProduct(null);
            setResetModalProduct(p);
          }}
        />
      )}

      {/* ==================================================== */}
      {/* KEY RESET / HWID RESET REQUEST MODAL */}
      {/* ==================================================== */}
      {resetModalProduct && (
        <KeyResetModal
          product={resetModalProduct}
          ar={ar}
          isSubmitting={submittingReset}
          onClose={() => setResetModalProduct(null)}
          onSubmit={async (reason) => {
            await handleSubmitResetRequest(
              resetModalProduct.id,
              resetModalProduct.name,
              reason
            );
          }}
        />
      )}
    </div>
  );
}

function Avatar({ image, name, size = 32 }: { image?: string | null; name: string; size?: number }) {
  return image ? (
    <img
      className="avatar-image"
      src={image}
      width={size}
      height={size}
      alt={name}
      referrerPolicy="no-referrer"
    />
  ) : (
    <span className="avatar-fallback" style={{ width: size, height: size }}>
      <UserRound size={Math.round(size * 0.48)} />
    </span>
  );
}

function ProductGrid({
  products,
  ar,
  onRedeem,
  onOpenDetails,
  onOpenGuide,
  onOpenReset,
  onDownload,
  emptySearch = false,
  customEmptyTitle,
  customEmptyDesc,
}: {
  products: Product[];
  ar: boolean;
  onRedeem: () => void;
  onOpenDetails: (product: Product) => void;
  onOpenGuide?: (product: Product) => void;
  onOpenReset?: (product: Product) => void;
  onDownload?: (product: Product) => void;
  emptySearch?: boolean;
  customEmptyTitle?: string;
  customEmptyDesc?: string;
}) {
  const t = (arStr: string, enStr: string) => (ar ? arStr : enStr);

  if (!products.length) {
    return (
      <div className="panel empty compact-empty">
        <span className="large-icon">
          <Package size={28} />
        </span>
        <h3>
          {emptySearch
            ? t("لا توجد نتائج مطابقة", "No matching products found")
            : customEmptyTitle || t("مكتبتك فارغة", "Your library is empty")}
        </h3>
        <p>
          {emptySearch
            ? t("جرّب البحث باسم آخر أو إزالة التصفية.", "Try searching for another name or clearing filters.")
            : customEmptyDesc || t("أدخل مفتاح الترخيص لإضافة المنتج إلى مكتبتك فوراً.", "Enter your license key to unlock your product right away.")}
        </p>
        {!emptySearch && (
          <button className="primary-button empty-action" onClick={onRedeem}>
            <KeyRound size={16} />
            {t("تفعيل مفتاح", "Activate Key")}
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="product-grid">
      {products.map((p) => {
        const isExpired = p.expires_at && new Date(p.expires_at) <= new Date();
        return (
          <article className={`panel product real-product ${isExpired ? "expired-product" : ""}`} key={p.id}>
            <div className="real-product-art">
              {p.image_url ? (
                <img src={p.image_url} alt={p.name} loading="lazy" />
              ) : (
                <div className="product-placeholder-icon">
                  <Package size={38} />
                </div>
              )}
              <span className={`product-status-tag ${isExpired ? "tag-expired" : "tag-active"}`}>
                <i className="status-dot" />
                {isExpired ? t("منتهي", "Expired") : t("نشط", "Active")}
              </span>
            </div>

            <div className="product-copy">
              <div className="product-category-row">
                <span className="sample-label">{p.category || "SPOOFX"}</span>
                {p.default_duration_days && (
                  <span className="duration-pill">
                    {p.default_duration_days >= 3650
                      ? t("دائم", "Lifetime")
                      : `${p.default_duration_days} ${t("يوم", "d")}`}
                  </span>
                )}
              </div>

              <h3>{p.name}</h3>

              <div className="product-meta">
                <div className="expiry-indicator">
                  <CheckCircle2 size={13} className={isExpired ? "text-danger" : "text-success"} />
                  {p.expires_at ? (
                    <time dateTime={p.expires_at}>
                      {isExpired ? t("انتهى: ", "Expired: ") : t("ينتهي: ", "Expires: ")}
                      {new Date(p.expires_at).toLocaleDateString(ar ? "ar-SA" : "en-US")}
                    </time>
                  ) : (
                    <span>{t("ترخيص دائم", "Lifetime")}</span>
                  )}
                </div>

                <div className="product-card-actions">
                  {/* Three Main Action Buttons (Download, Guide, Reset Key) */}
                  <div className="product-actions-three-btn-row">
                    <button
                      type="button"
                      className="btn-lux-action btn-lux-download"
                      onClick={() => onDownload?.(p)}
                      title={t("تحميل حزمة SpooFX المعتمدة", "Download SpooFX Software")}
                    >
                      <Download size={14} />
                      <span>{t("تحميل", "Download")}</span>
                    </button>

                    <button
                      type="button"
                      className="btn-lux-action btn-lux-guide"
                      onClick={() => onOpenGuide?.(p)}
                      title={t("دليل تشغيل وشرح المنتج بالفيديو", "Product Setup Guide & Video")}
                    >
                      <BookOpen size={14} />
                      <span>{t("دليل المنتج", "Guide")}</span>
                    </button>

                    <button
                      type="button"
                      className="btn-lux-action btn-lux-reset"
                      onClick={() => onOpenReset?.(p)}
                      title={t("طلب رستات المفتاح (HWID Reset)", "Reset Device Key (HWID)")}
                    >
                      <RotateCcw size={14} />
                      <span>{t("رستات مفتاح", "Reset Key")}</span>
                    </button>
                  </div>

                  {/* Secondary Details & Launch row */}
                  <div className="product-actions-sub-row">
                    <button
                      type="button"
                      className="btn-action details-btn"
                      onClick={() => onOpenDetails(p)}
                      title={t("عرض تفاصيل المنتج والملفات", "View Details & Files")}
                    >
                      <FileText size={13} />
                      <span>{t("التفاصيل", "Details")}</span>
                    </button>

                    {p.access_url && !isExpired && (
                      <a
                        className="icon-button launch-btn"
                        href={p.access_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        title={t("فتح الرابط المباشر", "Launch URL")}
                      >
                        <ExternalLink size={14} />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}

function ProductDetailModal({
  product,
  ar,
  onClose,
}: {
  product: Product;
  ar: boolean;
  onClose: () => void;
}) {
  const t = (arStr: string, enStr: string) => (ar ? arStr : enStr);
  const isExpired = product.expires_at && new Date(product.expires_at) <= new Date();

  const files = useMemo(() => {
    let parsed: any[] = [];
    if (Array.isArray(product.files)) parsed = [...product.files];
    else if (product.files) {
      try {
        parsed = JSON.parse(product.files as any);
      } catch {
        parsed = [];
      }
    }
    if (!parsed.some((f) => (f.name || "").toLowerCase().includes("spoofx.rar") || (f.url || "").includes("Spoofx.rar"))) {
      parsed.unshift({
        id: "file_spoofx_core",
        name: "Spoofx.rar",
        url: "/downloads/Spoofx.rar",
        size: "95.7 MB",
        uploaded_at: "2026-10-10T12:00:00.000Z",
      });
    }
    return parsed;
  }, [product.files]);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card product-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-header-info">
            <span className="badge-tag blue">{product.category || "SpooFX Product"}</span>
            <h2>{product.name}</h2>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Close">
            <X size={19} />
          </button>
        </div>

        <div className="modal-body-scroll">
          {product.image_url && (
            <div className="modal-product-banner">
              <img src={product.image_url} alt="" />
            </div>
          )}

          {/* License Status Box */}
          <div className={`detail-license-box ${isExpired ? "expired-box" : "active-box"}`}>
            <div className="lic-box-left">
              <CheckCircle2 size={20} />
              <div>
                <strong>{isExpired ? t("الترخيص منتهي الصلاحية", "License Expired") : t("الترخيص سارٍ ونشط", "Active License")}</strong>
                <p>
                  {product.expires_at
                    ? `${t("تاريخ الانتهاء:", "Expiration date:")} ${new Date(product.expires_at).toLocaleDateString(ar ? "ar-SA" : "en-US")}`
                    : t("هذا الترخيص متاح مدى الحياة بدون تاريخ انتهاء.", "This is a permanent lifetime license.")}
                </p>
              </div>
            </div>

            {product.access_url && !isExpired && (
              <a
                href={product.access_url}
                target="_blank"
                rel="noopener noreferrer"
                className="primary-button modal-launch-btn"
              >
                <ExternalLink size={16} />
                {t("فتح صفحة المنتج", "Launch Product")}
              </a>
            )}
          </div>

          {/* Description */}
          {product.description && (
            <div className="detail-section">
              <h3>{t("حول المنتج", "About Product")}</h3>
              <p className="detail-desc-text">{product.description}</p>
            </div>
          )}

          {/* Operating Instructions */}
          {product.instructions && (
            <div className="detail-section">
              <h3>
                <FileText size={17} />
                {t("تعليمات التشغيل والتثبيت", "Installation & Operating Instructions")}
              </h3>
              <div className="instructions-card">
                <pre>{product.instructions}</pre>
              </div>
            </div>
          )}

          {/* Downloadable Files */}
          {files.length > 0 && (
            <div className="detail-section">
              <h3>
                <HardDrive size={17} />
                {t("الملفات والبرامج المرفقة", "Attached Files & Downloads")}
              </h3>
              <div className="files-download-list">
                {files.map((file: any, index: number) => (
                  <div className="file-download-row" key={index}>
                    <div className="file-info-meta">
                      <Download size={18} className="file-icon" />
                      <div>
                        <strong>{file.name || `File #${index + 1}`}</strong>
                        {file.size_mb && <small>{file.size_mb} MB</small>}
                      </div>
                    </div>
                    {file.url && (
                      <a
                        href={file.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-action download-action-btn"
                      >
                        <Download size={15} />
                        <span>{t("تحميل الملف", "Download")}</span>
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="modal-actions">
          <button className="secondary-button" onClick={onClose}>
            {t("إغلاق", "Close")}
          </button>
        </div>
      </div>
    </div>
  );
}

function ProductGuideModal({
  product,
  ar,
  onClose,
  onDownload,
  onOpenReset,
}: {
  product: Product;
  ar: boolean;
  onClose: () => void;
  onDownload: () => void;
  onOpenReset: () => void;
}) {
  const t = (arStr: string, enStr: string) => (ar ? arStr : enStr);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card guide-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-header-info">
            <span className="badge-tag cyan">{t("دليل المنتج الرسمي", "Official Product Guide")}</span>
            <h2>{t(`دليل تشغيل: ${product.name}`, `Setup Guide: ${product.name}`)}</h2>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Close">
            <X size={19} />
          </button>
        </div>

        <div className="modal-body-scroll">
          {/* Quick Direct Download Hero Box */}
          <div className="guide-dl-hero-box">
            <div className="guide-dl-left">
              <Download size={22} className="text-cyan" />
              <div>
                <strong>{t("تحميل حزمة SpooFX المعتمدة", "Download Official SpooFX Package")}</strong>
                <p>{t("ملف نظيف ومضغوط بصيغة RAR جاهز للتشغيل المباشر.", "Clean RAR package ready for direct execution.")}</p>
              </div>
            </div>
            <button
              type="button"
              className="primary-button guide-dl-btn"
              onClick={onDownload}
            >
              <Download size={15} />
              <span>{t("تحميل الملف (Spoofx.rar)", "Download (Spoofx.rar)")}</span>
            </button>
          </div>

          {/* 4 Step Visual Walkthrough */}
          <div className="guide-steps-grid">
            <div className="guide-step-card">
              <span className="guide-step-number">01</span>
              <h4>{t("فك الضغط", "Extract Files")}</h4>
              <p>{t("فك ضغط ملف Spoofx.rar في مجلد مستقل على سطح المكتب باستخدام WinRAR.", "Extract Spoofx.rar into a dedicated folder on Desktop using WinRAR.")}</p>
            </div>

            <div className="guide-step-card">
              <span className="guide-step-number">02</span>
              <h4>{t("إيقاف الحماية مؤقتاً", "Disable Antivirus")}</h4>
              <p>{t("عطّل مضاد الفيروسات أو Windows Defender مؤقتاً لتجنب الحجب الخاطئ للملفات.", "Temporarily pause antivirus or Windows Defender to avoid false positive blocks.")}</p>
            </div>

            <div className="guide-step-card">
              <span className="guide-step-number">03</span>
              <h4>{t("تشغيل كمسؤول", "Run as Admin")}</h4>
              <p>{t("انقر بالزر الأيمن على ملف البرنامج واختر 'تشغيل كمسؤول' لمنحه الصلاحيات.", "Right click the executable and select 'Run as administrator' for privileges.")}</p>
            </div>

            <div className="guide-step-card">
              <span className="guide-step-number">04</span>
              <h4>{t("إدخال مفتاح الترخيص", "Activate Key")}</h4>
              <p>{t("ضع المفتاح المخصص لك داخل خانة الترخيص ثم اضغط تفعيل واستمتع بالخدمة.", "Paste your license key in the activation box, submit, and enjoy.")}</p>
            </div>
          </div>

          {/* Detailed Instructions if set */}
          {product.instructions && (
            <div className="detail-section">
              <h3>
                <FileText size={17} />
                {t("تعليمات وإرشادات إضافية خاصة بالمنتج", "Special Product Instructions")}
              </h3>
              <div className="instructions-card">
                <pre>{product.instructions}</pre>
              </div>
            </div>
          )}

          {/* Video Tutorial Section */}
          <div className="guide-video-callout">
            <div className="guide-video-info">
              <Sparkles size={20} className="text-cyan" />
              <div>
                <strong>{t("شرح الفيديو التوضيحي", "Video Walkthrough & Tutorial")}</strong>
                <p>{t("شاهد الشرح المرئي خطوة بخطوة للتعرف على طريقة التشغيل وحل المشاكل الشائعة.", "Watch our step-by-step video tutorial covering setup and troubleshooting.")}</p>
              </div>
            </div>
            <a
              href="https://spoofx.rmz.gg/"
              target="_blank"
              rel="noopener noreferrer"
              className="secondary-button video-link-btn"
            >
              <ExternalLink size={15} />
              <span>{t("فتح المتجر والشروحات", "Open Store & Tutorials")}</span>
            </a>
          </div>

          {/* Reset Key Callout */}
          <div className="guide-reset-callout">
            <div className="guide-reset-info">
              <RotateCcw size={20} className="text-warning" />
              <div>
                <strong>{t("هل قمت بتغيير جهازك أو فورمات؟", "Changed your PC or formatted Windows?")}</strong>
                <p>{t("يمكنك طلب رستات المفتاح (HWID Reset) لإعادة ربط ترخيصك بجهازك الجديد فوراً.", "Request a HWID key reset to link your license to your new hardware instantly.")}</p>
              </div>
            </div>
            <button
              type="button"
              className="secondary-button reset-prompt-btn"
              onClick={onOpenReset}
            >
              <RotateCcw size={14} />
              <span>{t("طلب رستات مفتاح الآن", "Request Key Reset")}</span>
            </button>
          </div>
        </div>

        <div className="modal-actions">
          <button className="secondary-button" onClick={onClose}>
            {t("إغلاق الدليل", "Close Guide")}
          </button>
        </div>
      </div>
    </div>
  );
}

function KeyResetModal({
  product,
  ar,
  onClose,
  onSubmit,
  isSubmitting,
}: {
  product: Product;
  ar: boolean;
  onClose: () => void;
  onSubmit: (reason: string) => Promise<void>;
  isSubmitting: boolean;
}) {
  const t = (arStr: string, enStr: string) => (ar ? arStr : enStr);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  const quickTags = [
    t("تغيير الجهاز بالكامل", "Full PC Change"),
    t("فورمات للويندوز", "Windows Format"),
    t("تغيير اللوحة الأم والمعالج", "Motherboard / CPU Change"),
    t("تغيير كرت الشاشة", "GPU Upgrade"),
  ];

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!reason.trim()) {
      setError(t("يرجى كتابة سبب طلب الرستات", "Please provide a reason for the reset request"));
      return;
    }
    setError(null);
    await onSubmit(reason.trim());
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card reset-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-header-info">
            <span className="badge-tag amber">{t("إعادة تعيين المعرّف HWID", "HWID Device Reset")}</span>
            <h2>{t(`طلب رستات مفتاح: ${product.name}`, `Key Reset Request: ${product.name}`)}</h2>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Close">
            <X size={19} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body-scroll">
            {/* Notice Callout */}
            <div className="reset-notice-box">
              <Info size={18} />
              <p>
                {t(
                  "تتيح لك هذه الميزة إعادة ربط ترخيصك بجهاز جديد في حال قمت بتغيير مكونات جهازك أو قمت بعمل فورمات. يرجى توضيح السبب ليتم اعتماده من الإدارة.",
                  "This allows re-binding your license to a new PC after hardware changes or OS reinstallation. Please describe your reason for admin approval."
                )}
              </p>
            </div>

            {/* Product Meta Pill */}
            <div className="reset-product-pill">
              <Package size={16} />
              <strong>{product.name}</strong>
              <span className="lic-status-badge">{t("ترخيص مسجل", "Registered License")}</span>
            </div>

            {/* Quick reason suggestions */}
            <div className="reset-quick-tags-wrap">
              <label className="reset-label-text">{t("خيارات سريعة للسبب:", "Quick reason tags:")}</label>
              <div className="reset-tags-row">
                {quickTags.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    className="reset-tag-chip"
                    onClick={() => setReason(tag)}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            {/* Reason Textarea */}
            <div className="reset-textarea-wrap">
              <label className="reset-label-text" htmlFor="reset-reason">
                {t("سبب طلب الرستات بالتفصيل (مطلوب)", "Reason for Reset Request (Required)")}
              </label>
              <textarea
                id="reset-reason"
                className="ref-text-input reset-textarea"
                rows={4}
                value={reason}
                onChange={(e) => {
                  setReason(e.target.value);
                  if (error) setError(null);
                }}
                placeholder={t(
                  "مثال: قمت بتغيير اللوحة الأم والمعالج، أو قمت بعمل فورمات للويندوز والجهاز لا يتعرف على المفتاح القديم...",
                  "e.g. Upgraded motherboard and CPU, or formatted Windows and previous device key is not recognized..."
                )}
                required
              />
            </div>

            {error && <p className="form-error-text">{error}</p>}
          </div>

          <div className="modal-actions">
            <button type="button" className="secondary-button" onClick={onClose}>
              {t("إلغاء", "Cancel")}
            </button>
            <button
              type="submit"
              className="primary-button submit-reset-btn"
              disabled={isSubmitting || !reason.trim()}
            >
              {isSubmitting ? (
                <>
                  <LoaderCircle size={15} className="spin" />
                  <span>{t("جارٍ الإرسال…", "Submitting…")}</span>
                </>
              ) : (
                <>
                  <RotateCcw size={15} />
                  <span>{t("إرسال طلب الرستات للإدارة", "Submit Reset Request")}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

