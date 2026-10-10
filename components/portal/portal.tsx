"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { signOut } from "next-auth/react";
import {
  ArrowUpLeft,
  Box,
  CheckCircle2,
  ChevronDown,
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
  Search,
  ShieldAlert,
  ShieldCheck,
  Sliders,
  Sun,
  UserRound,
  X,
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
} from "@/lib/store";

type Data = {
  products: Product[];
  guides: Guide[];
  settings: SystemSettings;
  inventory: Product[];
  dashboardStats: any;
  orders: Order[];
  allGuides: Guide[];
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
  const [guideSearch, setGuideSearch] = useState("");

  const [data, setData] = useState<Data>({
    products: [],
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
    isAdmin: false,
  });

  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/portal", { cache: "no-store" });
      if (!response.ok) throw new Error("Failed to load portal");
      const json = await response.json();
      setData({
        products: json.products || [],
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

  useEffect(() => {
    const update = () => {
      const tab = location.hash.slice(1) as PortalTab;
      setTab(tabs.includes(tab) && (tab !== "admin" || data.isAdmin) ? tab : "overview");
    };
    update();
    window.addEventListener("hashchange", update);
    return () => window.removeEventListener("hashchange", update);
  }, [data.isAdmin]);

  function navigate(tab: PortalTab) {
    if (tab === "admin" && !data.isAdmin) return;
    setTab(tab);
    setNotice(null);
    setQuery("");
    location.hash = tab;
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

  // If Admin tab is selected and user is admin, render the full Control Space
  if (activeTab === "admin" && data.isAdmin) {
    return (
      <div className="portal-shell admin-immersive-shell" data-theme={isDark ? "dark" : "light"} dir={ar ? "rtl" : "ltr"}>
        <AdminControlSpace
          products={data.products}
          inventory={data.inventory}
          dashboardStats={data.dashboardStats}
          orders={data.orders}
          allGuides={data.allGuides}
          settings={data.settings}
          currentUser={data.currentUser || user.email}
          lang={lang}
          isDark={isDark}
          onRefresh={refresh}
          onExitAdmin={() => navigate("my-products")}
          onToggleTheme={toggleTheme}
          onToggleLanguage={() => setLang(ar ? "en" : "ar")}
        />
      </div>
    );
  }

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
        user={{ name: user.name, image: user.image }}
      />

      <div className="portal-body">
        {/* Announcement / Maintenance Banner if set */}
        {(data.settings.maintenance_mode || data.settings.maintenance_message) && (
          <div className="global-announcement-banner">
            <Info size={16} />
            <span>{data.settings.maintenance_message || (ar ? "النظام في وضع الصيانة حالياً" : "System is currently in maintenance mode")}</span>
          </div>
        )}

        <main className="portal-main">
          {/* Header */}
          <div className="page-heading">
            <div>
              <h1>{titles[activeTab].title}</h1>
              <p>{titles[activeTab].desc}</p>
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
                <>
                  <div className="overview-grid">
                    <div className="overview-column">
                      {/* Hero Welcome Card */}
                      <section className="panel welcome">
                        <div className="welcome-content">
                          <span className="eyebrow">
                            <i className="dot" /> SpooFX Member Space
                          </span>
                          <h2>
                            {t("أهلاً بك،", "Welcome,")} {user.name} <span className="wave">✦</span>
                          </h2>
                          <p>
                            {data.products.length
                              ? t(
                                  `لديك ${data.products.length} منتج مسجل في مكتبتك الرقمية.`,
                                  `You have ${data.products.length} products in your digital library.`
                                )
                              : t(
                                  "مكتبتك فارغة حالياً. أدخل مفتاح الترخيص لتفعيل منتجك فوراً.",
                                  "Your library is empty. Enter your license key to activate."
                                )}
                          </p>
                          <div className="hero-button-row">
                            <button
                              className="primary-button"
                              onClick={() => navigate(data.products.length ? "my-products" : "redeem")}
                            >
                              {data.products.length ? <Package size={16} /> : <KeyRound size={16} />}
                              {data.products.length ? t("استعراض مكتبتي", "View My Library") : t("تفعيل مفتاح ترخيص", "Activate a Key")}
                              <ArrowUpLeft size={15} />
                            </button>
                            {data.isAdmin && (
                              <button className="secondary-button" onClick={() => navigate("admin")}>
                                <ShieldCheck size={16} />
                                {t("لوحة الإدارة", "Admin Space")}
                              </button>
                            )}
                          </div>
                        </div>
                      </section>

                      {/* Stat Metrics */}
                      <div className="stats-grid">
                        <section className="panel stat">
                          <span className="stat-icon">
                            <Package size={18} />
                          </span>
                          <strong>{data.products.length}</strong>
                          <p>{t("المنتجات", "Products")}</p>
                        </section>
                        <section className="panel stat">
                          <span className="stat-icon">
                            <CheckCircle2 size={18} />
                          </span>
                          <strong>{activeProductsCount}</strong>
                          <p>{t("تراخيص نشطة", "Active licenses")}</p>
                        </section>
                        <section className="panel stat">
                          <span className="stat-icon">
                            <ShieldCheck size={18} />
                          </span>
                          <strong>{data.isAdmin ? t("مدير", "Admin") : t("عميل موثق", "Verified")}</strong>
                          <p>{t("الرتبة", "Role")}</p>
                        </section>
                      </div>
                    </div>

                    {/* Quick Access Menu */}
                    <section className="panel quick-actions">
                      <h2>{t("الوصول السريع", "Quick Access")}</h2>
                      {[
                        { tab: "my-products" as const, icon: Package, label: t("مكتبة المنتجات", "My Products"), desc: t("ملفاتك وتراخيصك النشطة", "Your files and active licenses") },
                        { tab: "redeem" as const, icon: KeyRound, label: t("تفعيل مفتاح", "Activate Key"), desc: t("أضف ترخيصاً جديداً إلى حسابك", "Add a new license to account") },
                        { tab: "tickets" as const, icon: LifeBuoy, label: t("مركز المساعدة", "Help & Guides"), desc: t("تعليمات الاستخدام والأسئلة", "Setup guides & common FAQs") },
                        { tab: "profile" as const, icon: UserRound, label: t("الملف الشخصي", "Account Profile"), desc: t("سجل التفعيلات وإعدادات الحساب", "Activation history & preferences") },
                      ].map((item) => {
                        const Icon = item.icon;
                        return (
                          <button key={item.tab} onClick={() => navigate(item.tab)}>
                            <span className="quick-icon">
                              <Icon size={18} />
                            </span>
                            <span>
                              <strong>{item.label}</strong>
                              <small>{item.desc}</small>
                            </span>
                            <ArrowUpLeft size={16} />
                          </button>
                        );
                      })}
                    </section>
                  </div>
                </>
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
                          KEY-******-*****
                        </span>
                      </div>
                      <div className="key-input-wrapper">
                        <input
                          id="license-key"
                          dir="ltr"
                          value={key}
                          onChange={(e) => setKey(e.target.value.trim())}
                          placeholder="KEY-******-*****"
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
                      t("إدخال مفتاح الترخيص بصيغة KEY-******-*****", "Enter your license key in KEY-******-***** format"),
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
  emptySearch = false,
  customEmptyTitle,
  customEmptyDesc,
}: {
  products: Product[];
  ar: boolean;
  onRedeem: () => void;
  onOpenDetails: (product: Product) => void;
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
                  <button
                    className="btn-action details-btn"
                    onClick={() => onOpenDetails(p)}
                    title={t("عرض التفاصيل والملفات", "View Details & Files")}
                  >
                    <FileText size={14} />
                    <span>{t("التفاصيل", "Details")}</span>
                  </button>

                  {p.access_url && !isExpired && (
                    <a
                      className="icon-button launch-btn"
                      href={p.access_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      title={t("فتح الرابط", "Launch")}
                    >
                      <ExternalLink size={15} />
                    </a>
                  )}
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
