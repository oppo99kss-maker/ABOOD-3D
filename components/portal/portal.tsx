"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import {
  ArrowUpLeft,
  BookOpen,
  Box,
  CheckCircle2,
  ChevronLeft,
  Clock3,
  Globe2,
  KeyRound,
  LifeBuoy,
  Moon,
  Package,
  Search,
  ShieldCheck,
  Sparkles,
  Sun,
  UserRound,
} from "lucide-react";
import { PortalNavigation, type PortalTab } from "./portal-navigation";
import { usePreferences } from "./use-preferences";

const tabs: PortalTab[] = [
  "overview",
  "my-products",
  "redeem",
  "tickets",
  "profile",
  "admin",
];
const sampleProducts = [
  {
    ar: "مجموعة الأشكال",
    en: "Shape collection",
    kind: "SHAPES",
    tone: "violet",
  },
  { ar: "عالم المجسمات", en: "Model collection", kind: "MODELS", tone: "gold" },
  {
    ar: "الخامات والإضاءة",
    en: "Materials & lighting",
    kind: "MATERIALS",
    tone: "rose",
  },
];
export function Portal({
  user,
  preview = false,
}: {
  user: { name: string; email: string };
  preview?: boolean;
}) {
  const { lang, isDark, setLang, toggleTheme } = usePreferences();
  const ar = lang === "ar";
  const t = (a: string, e: string) => (ar ? a : e);
  const [activeTab, setTab] = useState<PortalTab>("overview");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [key, setKey] = useState("");
  const [notice, setNotice] = useState("");
  const [adminTab, setAdminTab] = useState("overview");
  useEffect(() => {
    const update = () => {
      const value = location.hash.slice(1) as PortalTab;
      setTab(
        tabs.includes(value) && (value !== "admin" || preview)
          ? value
          : "overview",
      );
    };
    update();
    window.addEventListener("hashchange", update);
    return () => window.removeEventListener("hashchange", update);
  }, [preview]);
  const navigate = (tab: PortalTab) => {
    setTab(tab);
    setQuery("");
    setNotice("");
    location.hash = tab;
  };
  const title: Record<PortalTab, string> = {
    overview: t("الرئيسية", "Overview"),
    "my-products": t("منتجاتي", "My products"),
    redeem: t("تفعيل مفتاح", "Activate a key"),
    tickets: t("مركز المساعدة", "Help center"),
    profile: t("الملف الشخصي", "Profile"),
    admin: t("لوحة الإدارة", "Administration"),
  };
  const faqs = [
    {
      q: t("كيف أسجّل دخولي؟", "How do I sign in?"),
      a: t(
        "اختر تسجيل الدخول من الصفحة الرئيسية، ثم اختر حساب قوقل. ستعود إلى بوابتك بعد اكتمال تسجيل الدخول.",
        "Choose Sign in on the home page, then select your Google account. You will return to your portal after signing in.",
      ),
    },
    {
      q: t("أين أجد منتجاتي وتراخيصي؟", "Where are my products and licenses?"),
      a: t(
        "ستجدها في صفحة منتجاتي عند ربط خدمة المنتجات الخاصة بهذا الموقع. المعاينة تعرض نماذج توضيحية فقط.",
        "Your products will appear in My products once this site has its own product service. The preview only shows illustrative samples.",
      ),
    },
    {
      q: t("كيف أفعّل مفتاح الترخيص؟", "How do I activate a license?"),
      a: t(
        "من شريط التنقل اختر تفعيل مفتاح. خدمة التفعيل غير متصلة بعد، ولا يتم إرسال أو حفظ المفاتيح المدخلة حالياً.",
        "Choose Activate key from the navigation. Activation is not connected yet, and keys entered here are not sent or saved.",
      ),
    },
    {
      q: t("هل بيانات المعاينة حقيقية؟", "Is preview data real?"),
      a: t(
        "لا. المعاينة مخصصة لاستعراض التصميم والقوائم فقط، ولا تحتوي على حسابات أو مفاتيح أو ملفات منتجات فعلية.",
        "No. The preview demonstrates the design and menus only. It contains no real accounts, keys or product files.",
      ),
    },
  ];
  const exit = () =>
    preview ? location.assign("/") : void signOut({ callbackUrl: "/" });
  return (
    <div
      className="portal-shell"
      data-theme={isDark ? "dark" : "light"}
      dir={ar ? "rtl" : "ltr"}
    >
      <PortalNavigation
        activeTab={activeTab}
        onNavigate={navigate}
        lang={lang}
        isDark={isDark}
        isAdmin={preview}
        productCount={preview ? 3 : 0}
        mobileOpen={mobileOpen}
        onMobileChange={setMobileOpen}
        onToggleTheme={toggleTheme}
        onToggleLanguage={() => setLang(ar ? "en" : "ar")}
        onLogout={exit}
        user={{
          name: preview ? t("زائر المعاينة", "Preview guest") : user.name,
        }}
      />
      <div className="portal-body">
        <main className="portal-main">
          {preview && (
            <div className="preview-banner">
              <span>
                <Sparkles size={16} />
                {t(
                  "معاينة التصميم — البيانات المعروضة توضيحية فقط",
                  "Design preview — all displayed data is illustrative",
                )}
              </span>
              <Link href="/">
                {t("تسجيل الدخول", "Sign in")}
                <ArrowUpLeft size={14} />
              </Link>
            </div>
          )}
          <div className="page-heading">
            <div>
              <span className="eyebrow">
                SpooFX / {activeTab.replace("-", " ").toUpperCase()}
              </span>
              <h1>{title[activeTab]}</h1>
              <p>
                {t(
                  "مساحتك الخاصة، وكل ما تحتاجه في مكان واحد.",
                  "Your own space. Everything you need, together.",
                )}
              </p>
            </div>
            <div className="heading-mark">
              <Box size={26} />
            </div>
          </div>
          {activeTab === "overview" && (
            <>
              <div className="overview-grid">
                <div className="overview-column">
                  <section className="panel welcome">
                    <div className="welcome-content">
                      <span className="eyebrow">
                        <i className="dot" />
                        {t("أهلاً بك في SpooFX", "WELCOME TO SpooFX")}
                      </span>
                      <h2>
                        {t("مرحباً بعودتك،", "Welcome back,")}{" "}
                        {preview ? t("عبود", "Abood") : user.name}{" "}
                        <span className="wave">✦</span>
                      </h2>
                      <p>
                        {t(
                          "منتجاتك وتراخيصك جاهزة للاستكشاف. ابدأ تجربتك من هنا.",
                          "Your products and licenses, all in one place. Start exploring here.",
                        )}
                      </p>
                      <button
                        className="primary-button"
                        onClick={() => navigate("my-products")}
                      >
                        <Package size={16} />
                        {t("استعراض منتجاتي", "Explore my products")}
                        <ArrowUpLeft size={15} />
                      </button>
                    </div>
                    <div className="hero-cube" aria-hidden="true">
                      <div className="cube">
                        <span />
                        <span />
                        <span />
                      </div>
                      <div className="orbit" />
                    </div>
                  </section>
                  <div className="stats-grid">
                    {[
                      {
                        icon: Package,
                        value: preview ? "03" : "0",
                        label: t("منتجات مفعلة", "Active products"),
                      },
                      {
                        icon: ShieldCheck,
                        value: preview
                          ? t("تجريبي", "Preview")
                          : t("متصل", "Connected"),
                        label: t("حالة الحساب", "Account status"),
                      },
                      {
                        icon: Clock3,
                        value: "Google",
                        label: t("طريقة تسجيل الدخول", "Sign-in method"),
                      },
                    ].map(({ icon: Icon, value, label }) => (
                      <section className="panel stat" key={label}>
                        <span className="stat-icon">
                          <Icon size={19} />
                        </span>
                        <strong>{value}</strong>
                        <p>{label}</p>
                      </section>
                    ))}
                  </div>
                </div>
                <section className="panel quick-actions">
                  <h2>{t("وصول سريع", "Quick access")}</h2>
                  {[
                    {
                      tab: "redeem",
                      icon: KeyRound,
                      name: t("تفعيل مفتاح", "Activate a key"),
                      desc: t(
                        "أضف ترخيصاً إلى حسابك",
                        "Add a license to your account",
                      ),
                    },
                    {
                      tab: "my-products",
                      icon: Box,
                      name: t("منتجاتي", "My products"),
                      desc: t(
                        "استعرض مكتبتك وتراخيصك",
                        "Explore your library and licenses",
                      ),
                    },
                    {
                      tab: "tickets",
                      icon: LifeBuoy,
                      name: t("مركز المساعدة", "Help center"),
                      desc: t(
                        "الأسئلة والشروحات",
                        "Answers and product guides",
                      ),
                    },
                    {
                      tab: "profile",
                      icon: UserRound,
                      name: t("الملف الشخصي", "Profile"),
                      desc: t(
                        "معلومات حسابك وتفضيلاتك",
                        "Your account and preferences",
                      ),
                    },
                  ].map(({ tab, icon: Icon, name, desc }) => (
                    <button
                      key={tab}
                      onClick={() => navigate(tab as PortalTab)}
                    >
                      <span className="quick-icon">
                        <Icon size={18} />
                      </span>
                      <span>
                        <strong>{name}</strong>
                        <small>{desc}</small>
                      </span>
                      <ChevronLeft size={16} />
                    </button>
                  ))}
                </section>
              </div>
              <section className="section-block">
                <div className="section-title">
                  <h2>{t("مكتبة المنتجات", "Product library")}</h2>
                  <button
                    className="text-button"
                    onClick={() => navigate("my-products")}
                  >
                    {t("عرض الكل", "View all")}
                    <ArrowUpLeft size={15} />
                  </button>
                </div>
                {preview ? (
                  <ProductCards
                    lang={lang}
                    onOpen={() => navigate("my-products")}
                  />
                ) : (
                  <Empty
                    icon={<Package />}
                    title={t("مكتبتك تبدأ من هنا", "Your library starts here")}
                    description={t(
                      "لم تتم إضافة منتجات إلى هذه البوابة بعد.",
                      "No products have been added to this portal yet.",
                    )}
                  />
                )}
              </section>
            </>
          )}
          {activeTab === "my-products" && (
            <section>
              <div className="panel section-toolbar">
                <div>
                  <h2>{t("مكتبة التراخيص", "License library")}</h2>
                  <p>
                    {preview
                      ? t(
                          "نماذج توضيحية لبطاقات المنتجات",
                          "Illustrative product card samples",
                        )
                      : t(
                          "كل منتجاتك المرتبطة بحسابك",
                          "All the products linked to your account",
                        )}
                  </p>
                </div>
                <label className="search">
                  <Search size={17} />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder={t("ابحث عن منتج…", "Search products…")}
                    aria-label={t("ابحث عن منتج", "Search products")}
                  />
                </label>
              </div>
              {preview ? (
                <ProductCards
                  lang={lang}
                  query={query}
                  onOpen={() =>
                    setNotice(
                      t(
                        "هذا نموذج تصميم فقط. لا توجد ملفات أو تراخيص فعلية مرتبطة به.",
                        "This is a design sample. No real files or licenses are attached.",
                      ),
                    )
                  }
                />
              ) : (
                <Empty
                  icon={<Package />}
                  title={t("لا توجد منتجات بعد", "No products yet")}
                  description={t(
                    "ستظهر منتجاتك هنا عند إضافتها.",
                    "Your products will appear here when added.",
                  )}
                />
              )}{" "}
              {notice && (
                <p className="inline-notice" role="status">
                  {notice}
                </p>
              )}
            </section>
          )}
          {activeTab === "redeem" && (
            <div className="form-layout">
              <section className="panel activation">
                <span className="large-icon">
                  <KeyRound size={28} />
                </span>
                <h2>
                  {t(
                    "فعّل مفتاحك، وابدأ تجربتك",
                    "Activate your key. Get started.",
                  )}
                </h2>
                <p>
                  {t(
                    "أدخل مفتاح الترخيص الخاص بمنتجك لإضافته إلى مكتبتك.",
                    "Enter your product license key to add it to your library.",
                  )}
                </p>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    setNotice(
                      t(
                        "خدمة التفعيل غير متاحة حالياً. لم يتم إرسال المفتاح أو حفظه.",
                        "Activation is not available yet. Your key was not sent or saved.",
                      ),
                    );
                  }}
                >
                  <label htmlFor="license-key">
                    {t("مفتاح الترخيص", "License key")}
                  </label>
                  <input
                    id="license-key"
                    dir="ltr"
                    value={key}
                    onChange={(e) => setKey(e.target.value)}
                    placeholder="XXXX-XXXX-XXXX-XXXX"
                    minLength={8}
                    maxLength={120}
                    required
                    autoComplete="off"
                    spellCheck={false}
                  />
                  <button className="primary-button" type="submit">
                    <KeyRound size={17} />
                    {t("تفعيل المفتاح", "Activate key")}
                  </button>
                </form>
                {notice && (
                  <p className="inline-notice" role="status">
                    {notice}
                  </p>
                )}
                <div className="muted-note">
                  <ShieldCheck size={15} />
                  {t(
                    "المفتاح مرتبط بحسابك الشخصي",
                    "A license belongs to your own account",
                  )}
                </div>
              </section>
              <section className="panel instructions">
                <h2>{t("خطوات بسيطة للبدء", "A few steps to get started")}</h2>
                {[
                  t("سجّل دخولك باستخدام قوقل", "Sign in with Google"),
                  t("أدخل مفتاح ترخيص المنتج", "Enter your product license"),
                  t(
                    "انتقل إلى مكتبتك وابدأ",
                    "Open your library and get started",
                  ),
                ].map((step, i) => (
                  <div key={step}>
                    <b>0{i + 1}</b>
                    <p>{step}</p>
                  </div>
                ))}
                <button
                  className="text-button"
                  onClick={() => navigate("tickets")}
                >
                  {t("تحتاج مساعدة؟", "Need a hand?")}
                  <ArrowUpLeft size={15} />
                </button>
              </section>
            </div>
          )}
          {activeTab === "tickets" && (
            <section>
              <div className="panel support-hero">
                <LifeBuoy size={36} />
                <h2>{t("كيف نقدر نساعدك؟", "How can we help?")}</h2>
                <p>
                  {t(
                    "إجابات واضحة، وخطوات بسيطة لتجربة أفضل.",
                    "Clear answers and simple steps for a better experience.",
                  )}
                </p>
                <label className="search">
                  <Search size={18} />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    aria-label={t("البحث في المساعدة", "Search help")}
                    placeholder={t("ابحث عن سؤالك…", "Search your question…")}
                  />
                </label>
              </div>
              <div className="section-title">
                <h2>
                  <BookOpen size={20} />
                  {t("الأسئلة الشائعة", "Frequently asked questions")}
                </h2>
              </div>
              <div className="faq-list">
                {faqs
                  .filter((f) =>
                    (f.q + f.a).toLowerCase().includes(query.toLowerCase()),
                  )
                  .map((f) => (
                    <details className="panel" key={f.q}>
                      <summary>
                        {f.q}
                        <span>+</span>
                      </summary>
                      <p>{f.a}</p>
                    </details>
                  ))}
                {!faqs.some((f) =>
                  (f.q + f.a).toLowerCase().includes(query.toLowerCase()),
                ) && (
                  <Empty
                    icon={<Search />}
                    title={t("لم نجد نتائج", "No results")}
                    description={t(
                      "جرّب كلمات بحث أخرى.",
                      "Try a different search.",
                    )}
                  />
                )}
              </div>
            </section>
          )}
          {activeTab === "profile" && (
            <div className="form-layout">
              <section className="panel profile">
                <img src="/brand.svg" width="72" height="72" alt="" />
                <h2>
                  {preview ? t("زائر المعاينة", "Preview guest") : user.name}
                </h2>
                <span className="status-pill">
                  {preview
                    ? t("حساب توضيحي", "Illustrative account")
                    : "Google"}
                </span>
                <dl>
                  <div>
                    <dt>{t("الاسم", "Name")}</dt>
                    <dd>
                      {preview
                        ? t("زائر المعاينة", "Preview guest")
                        : user.name}
                    </dd>
                  </div>
                  <div>
                    <dt>{t("البريد الإلكتروني", "Email address")}</dt>
                    <dd dir="ltr">{user.email || "—"}</dd>
                  </div>
                  <div>
                    <dt>{t("تسجيل الدخول", "Sign-in provider")}</dt>
                    <dd>Google</dd>
                  </div>
                </dl>
                <button className="secondary-button" onClick={exit}>
                  {preview
                    ? t("العودة لتسجيل الدخول", "Back to sign in")
                    : t("تسجيل الخروج", "Sign out")}
                </button>
              </section>
              <section className="panel preferences">
                <h2>{t("تفضيلات الواجهة", "Display preferences")}</h2>
                <div>
                  <span>{t("المظهر", "Appearance")}</span>
                  <button className="secondary-button" onClick={toggleTheme}>
                    {isDark ? <Sun size={16} /> : <Moon size={16} />}{" "}
                    {isDark
                      ? t("الوضع الفاتح", "Light mode")
                      : t("الوضع الداكن", "Dark mode")}
                  </button>
                </div>
                <div>
                  <span>{t("اللغة", "Language")}</span>
                  <button
                    className="secondary-button"
                    onClick={() => setLang(ar ? "en" : "ar")}
                  >
                    <Globe2 size={16} />
                    {ar ? "English" : "العربية"}
                  </button>
                </div>
                <p>
                  {t(
                    "تُحفظ التفضيلات على هذا المتصفح.",
                    "Preferences are saved in this browser.",
                  )}
                </p>
              </section>
            </div>
          )}
          {activeTab === "admin" && preview && (
            <section>
              <div
                className="admin-tabs"
                aria-label={t("أقسام الإدارة", "Administration sections")}
              >
                {[
                  ["overview", "نظرة عامة", "Overview"],
                  ["products", "المنتجات والمخزون", "Products & stock"],
                  ["customers", "العملاء", "Customers"],
                  ["help", "مركز المساعدة", "Help center"],
                  ["updates", "تحديثات الموقع", "Site updates"],
                  ["reset", "طلبات الريست", "Reset requests"],
                  ["logs", "سجل النشاط", "Activity log"],
                ].map(([id, a, e]) => (
                  <button
                    key={id}
                    aria-pressed={adminTab === id}
                    onClick={() => setAdminTab(id)}
                  >
                    {t(a, e)}
                  </button>
                ))}
              </div>
              <Empty
                icon={<ShieldCheck />}
                title={t(
                  "معاينة واجهة الإدارة",
                  "Administration design preview",
                )}
                description={t(
                  "تم الاحتفاظ بقوائم الإدارة للاستعراض فقط. لا تحتوي هذه النسخة على عملاء أو مفاتيح أو صلاحيات إدارية فعلية.",
                  "The administration menus are preserved for preview only. This copy contains no customer records, keys or real administrative permissions.",
                )}
              />
            </section>
          )}
        </main>
        <footer className="portal-footer">
          <span>© {new Date().getFullYear()} SpooFX</span>
          <span>
            {t("صُممت لتكون أقرب إليك", "Designed around you")}{" "}
            <span className="gold">✦</span>
          </span>
        </footer>
      </div>
    </div>
  );
}
function Empty({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="panel empty">
      <span className="large-icon">{icon}</span>
      <h3>{title}</h3>
      <p>{description}</p>
    </div>
  );
}
function ProductCards({
  lang,
  query = "",
  onOpen,
}: {
  lang: "ar" | "en";
  query?: string;
  onOpen: () => void;
}) {
  const products = sampleProducts.filter((p) =>
    (p.ar + p.en).toLowerCase().includes(query.toLowerCase()),
  );
  return products.length ? (
    <div className="product-grid">
      {products.map((p, i) => (
        <article className="panel product" key={p.kind}>
          <div className={`product-art ${p.tone}`} aria-hidden="true">
            <span className="art-code">A3D / 0{i + 1}</span>
            <div className="sculpture">
              <span />
              <span />
              <span />
            </div>
            <span className="art-kind">{p.kind}</span>
          </div>
          <div className="product-copy">
            <span className="sample-label">
              {lang === "ar" ? "نموذج توضيحي" : "DESIGN SAMPLE"}
            </span>
            <h3>{lang === "ar" ? p.ar : p.en}</h3>
            <div>
              <span>
                <CheckCircle2 size={13} />
                {lang === "ar" ? "بطاقة منتج" : "Product card"}
              </span>
              <button
                className="icon-button"
                onClick={onOpen}
                aria-label={lang === "ar" ? `عرض ${p.ar}` : `View ${p.en}`}
              >
                <ArrowUpLeft size={17} />
              </button>
            </div>
          </div>
        </article>
      ))}
    </div>
  ) : (
    <Empty
      icon={<Search />}
      title={lang === "ar" ? "لا توجد نتائج" : "No results"}
      description={
        lang === "ar" ? "جرّب اسم منتج آخر." : "Try another product name."
      }
    />
  );
}
