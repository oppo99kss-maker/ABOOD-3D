"use client";
import { ModalBackdrop } from "@/components/ui/modal-backdrop";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import dynamic from "next/dynamic";
import { signOut } from "next-auth/react";
import Image from "next/image";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpLeft,
  Box,
  CheckCircle2,
  ChevronLeft,
  ClipboardPaste,
  Clock,
  Download,
  ExternalLink,
  FileText,
  Globe,
  HardDrive,
  HelpCircle,
  History,
  House,
  Info,
  KeyRound,
  LifeBuoy,
  LoaderCircle,
  Lock,
  LogOut,
  Moon,
  Package,
  RotateCcw,
  Search,
  ShieldAlert,
  ShieldCheck,
  ShoppingBag,
  ShoppingCart,
  Sliders,
  Sparkles,
  Sun,
  UserRound,
  X,
  BookOpen,
  Copy,
} from "lucide-react";
import { type PortalTab } from "./portal-navigation";
import { WorkspaceNavigation } from "./workspace-navigation";
import { ResetRequestUpdates } from "./reset-request-updates";
import { SupportContact } from "./support-contact";
import { WorkspaceOverview } from "./workspace-overview";
import { usePreferences } from "./use-preferences";
import { AdminControlSpace } from "./admin-control-space";
import { notify } from "@/lib/notify";

/** Loaded on demand: the help centre brings its own media-heavy guide library. */
const ProductGuideModal = dynamic(() => import("./product-guide").then(module => module.ProductGuideModal), { ssr: false });
const HelpCenter = dynamic(() => import("./help-center").then((module) => module.HelpCenter), { ssr: false });

function DiscordIcon({ size = 17 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.893.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
    </svg>
  );
}
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

  const [data, setData] = useState<Data>({
    products: [],
    allProducts: [],
    guides: [],
    settings: {
      site_name: "SpooFX",
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
          site_name: "SpooFX",
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
    } catch (err: any) {
      notify.error(t("خطأ", "Error"), err.message || t("فشل إرسال طلب الرستات", "Failed to submit reset request"));
    } finally {
      setSubmittingReset(false);
    }
  }

  useEffect(() => {
    const handleFocus = () => void refresh();
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [refresh]);

  function navigate(tab: PortalTab) {
    if (tab === "admin" && !data.isAdmin) return;
    setTab(tab);
    setNotice(null);
    setQuery("");
    if (tab === "my-products" || tab === "overview") {
      void refresh();
    }
  }

  async function action(payload: Record<string, unknown>) {
    const response = await fetch("/api/portal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || result.code || "SERVICE_UNAVAILABLE");
    return result;
  }

  function errorText(error: unknown) {
    const code = error instanceof Error ? error.message : "SERVICE_UNAVAILABLE";
    if (code === "INVALID_KEY") return t("صيغة المفتاح غير صحيحة، يرجى التأكد من الرمز المدخل.", "Invalid key format, please check the entered code.");
    if (code === "KEY_NOT_FOUND" || code === "KEY_UNAVAILABLE") return t("المفتاح غير موجود، تم استخدامه مسبقاً، أو غير متاح.", "This key does not exist, has already been redeemed, or is unavailable.");
    if (code === "KEY_ALREADY_USED") return t("تم استخدام هذا المفتاح مسبقًا.", "This key has already been used.");
    if (code === "PRODUCT_INACTIVE") return t("المنتج غير متاح للتفعيل حاليًا.", "This product is currently unavailable for activation.");
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
      notify.error(t("تعذّر اللصق", "Could not paste"), t("الصق المفتاح يدويًا في الحقل.", "Paste the key manually into the field."));
    }
  }

  const titles: Record<PortalTab, { title: string; desc: string }> = {
    overview: { title: t("الرئيسية", "Overview"), desc: t("نظرة سريعة على حسابك وتراخيصك.", "Quick overview of your licenses.") },
    "my-products": { title: t("منتجاتي", "My Products"), desc: t("تراخيصك ومفاتيحك الرقمية.", "Your digital products and keys.") },
    redeem: { title: t("تفعيل مفتاح", "Activate Key"), desc: t("أدخل مفتاحك لإضافة المنتج إلى مكتبتك.", "Enter your key to unlock products.") },
    tickets: { title: t("المساعدة", "Help"), desc: t("أدلة الاستخدام والأسئلة الشائعة.", "Setup guides and documentation.") },
    profile: { title: t("حسابي", "My Account"), desc: t("إدارة الحساب والتفضيلات والأمان.", "Manage account settings, preferences and security.") },
    admin: { title: t("لوحة التحكم", "Control Panel"), desc: t("مركز إدارة النظام والتحكم الشامل.", "System control space.") },
  };

  const activeProducts = useMemo(() => {
    return data.products.filter((p) => {
      const isExpired = Boolean(p.expires_at && new Date(p.expires_at) <= new Date()) || Boolean(p.license_status && p.license_status !== "ACTIVE");
      if (isExpired) return false;
      if (!query.trim()) return true;
      return (p.name + (p.description || "") + (p.category || "")).toLowerCase().includes(query.toLowerCase());
    });
  }, [data.products, query]);

  const expiredProducts = useMemo(() => {
    return data.products.filter((p) => {
      const isExpired = Boolean(p.expires_at && new Date(p.expires_at) <= new Date()) || Boolean(p.license_status && p.license_status !== "ACTIVE");
      if (!isExpired) return false;
      if (!query.trim()) return true;
      return (p.name + (p.description || "") + (p.category || "")).toLowerCase().includes(query.toLowerCase());
    });
  }, [data.products, query]);

  const activeProductsCount = useMemo(() => {
    return data.products.filter((p) => (!p.license_status || p.license_status === "ACTIVE") && (!p.expires_at || new Date(p.expires_at) > new Date())).length;
  }, [data.products]);


  if (activeTab === "admin" && data.isAdmin) {
    return (
      <div className="portal-admin-wrapper admin-workspace" data-theme={isDark ? "dark" : "light"} dir={ar ? "rtl" : "ltr"}>
        <WorkspaceNavigation activeTab="admin" onNavigate={navigate} lang={lang} isDark={isDark} isAdmin={data.isAdmin} user={user} onToggleTheme={toggleTheme} onToggleLanguage={() => setLang(ar ? "en" : "ar")} onLogout={() => void signOut({ callbackUrl: "/" })} />
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
      </div>
    );
  }

  return (
    <div className="image2-portal-shell" data-theme={isDark ? "dark" : "light"} dir={ar ? "rtl" : "ltr"}>
      <div className="image2-container">
        <WorkspaceNavigation activeTab={activeTab} onNavigate={navigate} lang={lang} isDark={isDark} isAdmin={data.isAdmin} user={user} onToggleTheme={toggleTheme} onToggleLanguage={() => setLang(ar ? "en" : "ar")} onLogout={() => void signOut({ callbackUrl: "/" })} />

        {activeTab !== "overview" && <div className="workspace-page-heading"><p className="workspace-eyebrow">SPOOFX / {t("مساحتك الرقمية", "YOUR WORKSPACE")}</p><h1>{titles[activeTab].title}</h1><p>{titles[activeTab].desc}</p></div>}
        <main id="spoo-workspace-main" tabIndex={-1} className="portal-main" aria-busy={loading}>

          {loading && (
            <div className="workspace-load-state" role="status" aria-live="polite">
              <LoaderCircle className="spin" size={32} />
              <p>{t("جارٍ تحميل حسابك ومنتجاتك…", "Loading your account and products…")}</p>
            </div>
          )}

          {!loading && loadError && (
            <div className="workspace-load-state workspace-load-error" role="alert">
              <span className="workspace-load-symbol" aria-hidden="true"><ShieldAlert size={26} /></span>
              <h2>{t("تعذّر تحميل البيانات", "Unable to load data")}</h2>
              <p>{t("تحقق من اتصالك بالإنترنت ثم أعد المحاولة.", "Check your connection and try again.")}</p>
              <button type="button" className="secondary-button" onClick={() => { setLoading(true); void refresh(); }}>
                <RotateCcw size={16} aria-hidden="true" />
                {t("إعادة المحاولة", "Try again")}
              </button>
            </div>
          )}

          {!loading && !loadError && (
            <div className="workspace-view" key={activeTab}>
              {(activeTab === "overview" || activeTab === "my-products") && <ResetRequestUpdates requests={data.customerNotifications || []} ar={ar} onRefresh={refresh} />}
              {/* ==================================================== */}
              {/* TAB 1: OVERVIEW MATCHING IMAGE 2 EXACTLY */}
              {/* ==================================================== */}
              {activeTab === "overview" && <WorkspaceOverview user={user} ar={ar} activeCount={activeProductsCount} totalCount={data.products.length} isAdmin={data.isAdmin} storeUrl={(data.settings as any)?.store_url || "https://spoofx.rmz.gg/"} onNavigate={navigate} />}

              {activeTab === "my-products" && (
                <div className="products-view-container">
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
                          {t("منتجات غير نشطة", "Inactive Products")}
                          <span className="section-count expired-count">{expiredProducts.length}</span>
                        </h2>
                      </div>
                      <p className="category-subtitle">
                        {t("تراخيص منتهية أو موقوفة حسب حالة النظام.", "Expired or suspended licenses, as reported by the system.")}
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
                  <section className="panel activation redeem-card" aria-labelledby="redeem-title">
                    <header className="redeem-card-header">
                      <div>
                        <span className="redeem-eyebrow">{t("تفعيل الترخيص", "License activation")}</span>
                        <h2 id="redeem-title">{t("استرداد مفتاح", "Redeem a key")}</h2>
                      </div>
                      <span className="workspace-key-icon"><KeyRound size={24} /></span>
                    </header>
                    <p className="workspace-redeem-description">{t("أدخل مفتاح الترخيص لربط منتجك بحسابك الحالي.", "Enter a license key to link your product to this account.")}</p>
                    <form onSubmit={redeem}>
                      <div className="label-with-format">
                        <label htmlFor="license-key">{t("رمز مفتاح الترخيص", "License Key")}</label>

                      </div>
                      <div className="key-input-wrapper">
                        <input
                          id="license-key"
                          dir="ltr"
                          value={key}
                          onChange={(e) => setKey(e.target.value.trim())}
                          placeholder="KEY-XXXX-XXXX-XXXX"
                          required
                          minLength={4}
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
                        {t("تفعيل المفتاح", "Activate key")}
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


                  </section>


                </div>
              )}

              {/* ==================================================== */}
              {/* TAB 4: HELP CENTRE (videos, screenshots & written guides) */}
              {/* ==================================================== */}
              {activeTab === "tickets" && (
                <section className="help-section">
                  <HelpCenter lang={lang} onNavigateTab={navigate} />

                  <SupportContact ar={ar} />

                </section>
              )}

              {/* ==================================================== */}
              {/* TAB 5: PROFILE & ACTIVATION HISTORY */}
              {/* ==================================================== */}
              {activeTab === "profile" && (
                <div className="luxe-profile-container">
                  {/* 1. VIP Identity Hero Banner */}
                  <section className="luxe-profile-hero">
                    <div className="luxe-hero-ambient" />

                    <div className="luxe-hero-main-row">
                      {/* Avatar with luxury ring & active dot */}
                      <div className="luxe-avatar-container">
                        <Avatar image={user.image} name={user.name} size={72} />
                        <span className="luxe-online-pulse" title={t("متصل الآن", "Online Now")} />
                      </div>

                      {/* User Identity Details */}
                      <div className="luxe-identity-details">
                        <div className="luxe-name-badge-row">
                          <h2 className="luxe-user-name">{user.name}</h2>
                          {data.isAdmin ? (
                            <span className="luxe-vip-badge admin">
                              <ShieldCheck size={14} />
                              <span>{t("مدير المنصة", "Platform Admin")}</span>
                            </span>
                          ) : (
                            <span className="luxe-vip-badge client">
                              <UserRound size={14} />
                              <span>{t("عميل SpooFX", "SpooFX Client")}</span>
                            </span>
                          )}
                        </div>

                        <div className="luxe-email-row">
                          <span className="luxe-email-tag" dir="ltr">
                            <svg className="google-icon-svg" width="14" height="14" viewBox="0 0 24 24">
                              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                            </svg>
                            <span>{user.email}</span>
                          </span>
                        </div>
                      </div>

                      {/* Status indicator on end */}
                      <div className="luxe-session-status-tag">
                        <span className="luxe-status-dot" />
                        <span>{t("جلسة نشطة", "Active Session")}</span>
                      </div>
                    </div>

                  </section>

                  {/* 2. Balanced 2-Card Grid */}
                  <div className="luxe-profile-grid">
                    {/* Card 2: Google Account & Session */}
                    <section className="luxe-card">
                      <div className="luxe-card-header">
                        <div className="luxe-card-icon-box google">
                          <svg className="google-icon-svg" width="20" height="20" viewBox="0 0 24 24">
                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                          </svg>
                        </div>
                        <div>
                          <h3 className="luxe-card-title">Google</h3>
                          <p className="luxe-card-sub">{t("حساب Google المرتبط وجلسة تسجيل الدخول", "Connected Google account and active session")}</p>
                        </div>
                      </div>

                      <div className="luxe-options-list">
                        <div className="luxe-option-row">
                          <div className="luxe-option-info">
                            <strong>Google</strong>
                            <span dir="ltr">{user.email}</span>
                          </div>
                          <span className="luxe-verified-badge">
                            <CheckCircle2 size={13} />
                            <span>{t("متصل", "Connected")}</span>
                          </span>
                        </div>

                        <div className="luxe-option-row">
                          <div className="luxe-option-info">
                            <strong>{t("حالة الاتصال", "Connection Status")}</strong>
                            <span>{t("متصل بنجاح عبر حساب Google", "Successfully connected via Google account")}</span>
                          </div>
                          <span className="luxe-secure-badge">
                            <span className="luxe-status-dot" />
                            <span>{t("نشط", "Active")}</span>
                          </span>
                        </div>
                      </div>

                      <div className="luxe-session-action-box">
                        <div className="luxe-session-action-info">
                          <strong>{t("تسجيل الخروج", "Sign Out")}</strong>
                          <span>{t("إنهاء جلستك الحالية على هذا المتصفح بأمان.", "Securely terminate your current session.")}</span>
                        </div>
                        <button
                          type="button"
                          className="luxe-logout-action-btn"
                          onClick={() => void signOut({ callbackUrl: "/" })}
                        >
                          <LogOut size={14} />
                          <span>{t("تسجيل الخروج", "Sign Out")}</span>
                        </button>
                      </div>
                    </section>
                  </div>
                </div>
              )}
            </div>
          )}
        </main>
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

function ProductArtwork({ src, name }: { src?: string | null; name: string }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);
  return src && !failed ? <img src={src} alt={name} loading="lazy" onError={() => setFailed(true)} /> : <div className="product-placeholder-icon"><Package size={38} aria-hidden="true" /></div>;
}

function LicenseCountdown({ expiresAt, ar }: { expiresAt?: string | null; ar: boolean }) {
  const end = expiresAt ? new Date(expiresAt).getTime() : null;
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    setNow(Date.now());
    if (end === null || !Number.isFinite(end) || end <= Date.now()) return;
    const timer = window.setInterval(() => {
      const time = Date.now();
      setNow(time);
      if (time >= end) window.clearInterval(timer);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [end]);
  if (end === null) return <span>{ar ? "ترخيص دائم" : "Lifetime license"}</span>;
  if (!Number.isFinite(end)) return <span>{ar ? "مدة الترخيص غير متاحة" : "License duration unavailable"}</span>;
  const seconds = Math.max(0, Math.floor((end - now) / 1000));
  if (!seconds) return <span className="license-countdown ended">{ar ? "انتهت مدة الترخيص" : "License expired"}</span>;
  const parts = [Math.floor(seconds / 86400), Math.floor(seconds / 3600) % 24, Math.floor(seconds / 60) % 60, seconds % 60];
  const labels = ar ? ["يوم", "ساعة", "دقيقة", "ثانية"] : ["days", "hrs", "min", "sec"];
  return <span className="license-countdown" role="timer" aria-live="off" aria-label={ar ? "الوقت المتبقي للترخيص" : "License time remaining"}><span className="countdown-caption">{ar ? "المتبقي" : "Remaining"}</span><span className="countdown-values">{parts.map((value, index) => <span key={labels[index]}><b>{String(value).padStart(2, "0")}</b><small>{labels[index]}</small></span>)}</span></span>;
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
        const isExpired = Boolean(p.expires_at && new Date(p.expires_at) <= new Date()) || Boolean(p.license_status && p.license_status !== "ACTIVE");
        return (
          <article className={`panel product real-product ${isExpired ? "expired-product" : ""}`} key={p.id}>
            <div className="real-product-art">
              <ProductArtwork src={p.image_url} name={p.name} />
              <div className="product-license-timer"><Clock size={12} aria-hidden="true"/><LicenseCountdown expiresAt={p.expires_at} ar={ar} /></div>
              <span className={`product-status-tag ${isExpired ? "tag-expired" : "tag-active"}`}>
                <i className="status-dot" />
                {p.license_status === "SUSPENDED" ? t("موقوف", "Suspended") : p.license_status === "REVOKED" ? t("ملغى", "Revoked") : isExpired ? t("منتهي", "Expired") : t("نشط", "Active")}
              </span>
            </div>

            <div className="product-copy">
              <h3>{p.name}</h3>
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

              {p.description && <p className="product-summary">{p.description}</p>}

              <div className="product-meta">

                {/* License Key Display on Card */}
                {p.license_key && (
                  <div className="product-key-display-pill">
                    <span className="product-key-label">{t("مفتاح الترخيص", "License key")}</span>
                    <code className="product-key-value" dir="ltr">{p.license_key}</code>
                    <button
                      type="button"
                      className="product-key-copy-action"
                      onClick={async (e) => {
                        e.stopPropagation();
                        try {
                          await navigator.clipboard.writeText(p.license_key!);
                          notify.success(t("تم نسخ المفتاح", "Key copied"), t("المفتاح جاهز للصق.", "Your key is ready to paste."));
                        } catch {
                          notify.error(t("تعذّر النسخ", "Could not copy"), t("يمكنك تحديد المفتاح ونسخه يدويًا.", "Select the key and copy it manually."));
                        }
                      }}
                      title={t("نسخ المفتاح للحافظة", "Copy key to clipboard")}
                    >
                      <Copy size={13} />
                    </button>
                  </div>
                )}

                {(() => {
                  const hasDownload = Boolean(
                    (Array.isArray(p.files) && p.files.length > 0 && p.files.some((f) => f && f.url)) ||
                    (typeof (p.files as any) === "string" && (p.files as any).length > 2 && (p.files as any) !== "[]") ||
                    (p.access_url && (p.access_url.endsWith(".rar") || p.access_url.endsWith(".zip") || p.access_url.endsWith(".exe") || p.access_url.includes("/download"))) ||
                    (p.name?.toLowerCase().includes("spoofx"))
                  );

                  const hasGuide = Boolean(onOpenGuide);

                  const hasReset = !p.expires_at || new Date(p.expires_at) > new Date();

                  return (
                    <div className="product-card-actions">
                      {/* Only show action buttons when functions are actually available */}
                      {(hasDownload || hasGuide || hasReset) && (
                        <div className="product-actions-three-btn-row">
                          {hasDownload && (
                            <button
                              type="button"
                              className="btn-lux-action btn-lux-download"
                              onClick={() => onDownload?.(p)}
                              title={t("تحميل حزمة البرنامج المعتمدة", "Download Software Package")}
                            >
                              <Download size={14} />
                              <span>{t("تحميل", "Download")}</span>
                            </button>
                          )}

                          {hasGuide && (
                            <button
                              type="button"
                              className="btn-lux-action btn-lux-guide"
                              onClick={() => onOpenGuide?.(p)}
                              title={t("دليل تشغيل وشرح المنتج", "Product Setup Guide")}
                            >
                              <BookOpen size={14} />
                              <span>{t("دليل المنتج", "Guide")}</span>
                            </button>
                          )}

                          {hasReset && (
                            <button
                              type="button"
                              className="btn-lux-action btn-lux-reset"
                              onClick={() => onOpenReset?.(p)}
                              title={t("طلب رستات المفتاح (HWID Reset)", "Reset Device Key (HWID)")}
                            >
                              <RotateCcw size={14} />
                              <span>{t("طلب رستات المفتاح", "Request Key Reset")}</span>
                            </button>
                          )}
                        </div>
                      )}


                    </div>
                  );
                })()}
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
    if ((product.name || "").toLowerCase().includes("spoofx") && !parsed.some((f) => (f.name || "").toLowerCase().includes("spoofx.rar") || (f.url || "").includes("Spoofx.rar"))) {
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
    <ModalBackdrop className="modal-backdrop" onClick={onClose}>
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
    </ModalBackdrop>
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

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (isSubmitting) return;
    if (!reason.trim()) {
      setError(t("يرجى كتابة سبب طلب الرستات", "Please provide a reason for the reset request"));
      return;
    }
    setError(null);
    await onSubmit(reason.trim());
  }

  return (
    <ModalBackdrop className="modal-backdrop" onClick={onClose}>
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
                  "اكتب سبب طلبك هنا بكلماتك…",
                  "Describe your reason in your own words…"
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
    </ModalBackdrop>
  );
}

