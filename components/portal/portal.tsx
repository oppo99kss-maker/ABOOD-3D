"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { signOut } from "next-auth/react";
import { ArrowUpLeft, Box, CheckCircle2, Globe2, KeyRound, LifeBuoy, LoaderCircle, Moon, Package, Search, ShieldCheck, Sun, UserRound } from "lucide-react";
import { PortalNavigation, type PortalTab } from "./portal-navigation";
import { usePreferences } from "./use-preferences";
import type { Product } from "@/lib/store";

type Data = { products: Product[]; inventory: Product[]; isAdmin: boolean };
type PortalUser = { name: string; email: string; image?: string | null };
const tabs: PortalTab[] = ["overview", "my-products", "redeem", "tickets", "profile", "admin"];

export function Portal({ user }: { user: PortalUser }) {
  const { lang, isDark, setLang, toggleTheme } = usePreferences();
  const ar = lang === "ar";
  const t = (a: string, e: string) => ar ? a : e;
  const [activeTab, setTab] = useState<PortalTab>("overview");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [key, setKey] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Data>({ products: [], inventory: [], isAdmin: false });
  const [loadError, setLoadError] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [accessUrl, setAccessUrl] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [isVisible, setIsVisible] = useState(true);
  const [durationDays, setDurationDays] = useState(3);
  const [editingId, setEditingId] = useState("");
  const [selectedProduct, setSelectedProduct] = useState("");
  const [keyCount, setKeyCount] = useState(1);
  const [newKeys, setNewKeys] = useState<string[]>([]);

  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/portal", { cache: "no-store" });
      if (!response.ok) throw new Error("Failed to load portal");
      setData(await response.json() as Data);
      setLoadError(false);
    } catch { setLoadError(true); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void refresh(); }, [refresh]);
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
    setTab(tab); setNotice(""); setQuery(""); location.hash = tab;
  }
  async function action(payload: Record<string, unknown>) {
    const response = await fetch("/api/portal", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "SERVICE_UNAVAILABLE");
    return result;
  }
  function errorText(error: unknown) {
    const code = error instanceof Error ? error.message : "SERVICE_UNAVAILABLE";
    if (code === "INVALID_KEY") return t("صيغة المفتاح غير صحيحة.", "The key format is invalid.");
    if (code === "KEY_UNAVAILABLE") return t("المفتاح غير موجود أو تم استخدامه مسبقاً.", "This key does not exist or has already been used.");
    if (code === "INVALID_URL") return t("استخدم رابط HTTPS صحيحاً.", "Use a valid HTTPS URL.");
    if (code === "FORBIDDEN") return t("لا تملك صلاحية تنفيذ هذا الإجراء.", "You do not have permission for this action.");
    return t("تعذّر تنفيذ العملية. حاول مرة أخرى.", "The operation failed. Please try again.");
  }
  async function redeem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (busy) return; setBusy(true); setNotice("");
    try { await action({ action: "redeem", code: key }); setKey(""); await refresh(); setNotice(t("تم تفعيل المفتاح وإضافة المنتج إلى حسابك.", "Key activated. The product is now in your account.")); }
    catch (error) { setNotice(errorText(error)); } finally { setBusy(false); }
  }
  async function saveProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (busy) return; setBusy(true); setNotice("");
    try { await action({ action: editingId ? "updateProduct" : "createProduct", id: editingId, name, description, accessUrl, imageUrl, isVisible }); setName(""); setDescription(""); setAccessUrl(""); setImageUrl(""); setIsVisible(true); setEditingId(""); await refresh(); setNotice(t("تم حفظ المنتج.", "Product saved.")); }
    catch (error) { setNotice(errorText(error)); } finally { setBusy(false); }
  }
  async function createKeys(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (busy) return; setBusy(true); setNotice(""); setNewKeys([]);
    try { const result = await action({ action: "generateKeys", productId: selectedProduct, count: keyCount, durationDays }); setNewKeys(result.keys); await refresh(); setNotice(t("احفظ المفاتيح الآن؛ تظهر مرة واحدة فقط.", "Save these keys now; they are shown only once.")); }
    catch (error) { setNotice(errorText(error)); } finally { setBusy(false); }
  }
  const titles: Record<PortalTab, string> = { overview: t("الرئيسية", "Overview"), "my-products": t("منتجاتي", "My products"), redeem: t("تفعيل مفتاح", "Activate key"), tickets: t("المساعدة", "Help"), profile: t("حسابي", "My account"), admin: t("إدارة المنتجات", "Product management") };
  const visible = data.products.filter((p) => (p.name + p.description).toLowerCase().includes(query.toLowerCase()));
  const activeProducts = useMemo(() => visible.filter((p) => !p.expires_at || new Date(p.expires_at) > new Date()), [visible]);
  const expiredProducts = useMemo(() => visible.filter((p) => p.expires_at && new Date(p.expires_at) <= new Date()), [visible]);
  return <div className="portal-shell" data-theme={isDark ? "dark" : "light"} dir={ar ? "rtl" : "ltr"}>
    <PortalNavigation activeTab={activeTab} onNavigate={navigate} lang={lang} isDark={isDark} isAdmin={data.isAdmin} productCount={data.products.length} mobileOpen={mobileOpen} onMobileChange={setMobileOpen} onToggleTheme={toggleTheme} onToggleLanguage={() => setLang(ar ? "en" : "ar")} onLogout={() => void signOut({ callbackUrl: "/" })} user={{ name: user.name, image: user.image }} />
    <div className="portal-body"><main className="portal-main">
      <div className="page-heading"><div><span className="eyebrow">SpooFX / {activeTab.replace("-", " ").toUpperCase()}</span><h1>{titles[activeTab]}</h1><p>{t("مساحتك الخاصة لإدارة المنتجات والتراخيص.", "Your space for products and licenses.")}</p></div><div className="heading-mark"><Box size={26} /></div></div>
      {loading && <div className="panel empty" role="status"><LoaderCircle className="spin" /><p>{t("جارٍ تحميل بيانات حسابك…", "Loading your account…")}</p></div>}
      {!loading && loadError && <div className="panel empty" role="alert"><h2>{t("تعذّر تحميل البيانات", "Unable to load data")}</h2><p>{t("تحقق من الاتصال ثم حاول مرة أخرى.", "Check your connection and try again.")}</p><button className="secondary-button" onClick={() => void refresh()}>{t("إعادة المحاولة", "Try again")}</button></div>}
      {!loading && !loadError && <>
        {activeTab === "overview" && <><div className="overview-grid"><div className="overview-column">
          <section className="panel welcome"><div className="welcome-content"><span className="eyebrow"><i className="dot" /> SpooFX</span><h2>{t("مرحباً،", "Welcome,")} {user.name} <span className="wave">✦</span></h2><p>{data.products.length ? t("منتجاتك متاحة من مكتبتك.", "Your products are ready in your library.") : t("مكتبتك فارغة حالياً. فعّل مفتاح منتج لإضافته.", "Your library is empty. Activate a product key to add one.")}</p><button className="primary-button" onClick={() => navigate(data.products.length ? "my-products" : "redeem")}>{data.products.length ? <Package size={16} /> : <KeyRound size={16} />}{data.products.length ? t("عرض منتجاتي", "View my products") : t("تفعيل مفتاح", "Activate a key")}<ArrowUpLeft size={15} /></button></div><div className="hero-cube" aria-hidden="true"><div className="cube"><span /><span /><span /></div><div className="orbit" /></div></section>
          <div className="stats-grid"><section className="panel stat"><span className="stat-icon"><Package size={19} /></span><strong>{data.products.length}</strong><p>{t("منتجات في حسابك", "Products in your account")}</p></section><section className="panel stat"><span className="stat-icon"><ShieldCheck size={19} /></span><strong>Google</strong><p>{t("طريقة تسجيل الدخول", "Sign-in method")}</p></section><section className="panel stat"><span className="stat-icon"><UserRound size={19} /></span><strong>{data.isAdmin ? t("مدير", "Admin") : t("عضو", "Member")}</strong><p>{t("صلاحية الحساب", "Account access")}</p></section></div></div>
          <section className="panel quick-actions"><h2>{t("وصول سريع", "Quick access")}</h2>{([ ["my-products", Package, t("منتجاتي", "My products"), t("مكتبتك وتراخيصك", "Your library and licenses")], ["redeem", KeyRound, t("تفعيل مفتاح", "Activate key"), t("أضف منتجاً إلى حسابك", "Add a product to your account")], ["tickets", LifeBuoy, t("المساعدة", "Help"), t("إجابات للأسئلة الشائعة", "Answers to common questions")], ["profile", UserRound, t("حسابي", "My account"), t("بياناتك وتفضيلاتك", "Your details and preferences")] ] as const).map(([tab, Icon, label, desc]) => <button key={tab} onClick={() => navigate(tab)}><span className="quick-icon"><Icon size={18} /></span><span><strong>{label}</strong><small>{desc}</small></span><ArrowUpLeft size={16} /></button>)}</section></div>
          <section className="section-block"><div className="section-title"><h2>{t("مكتبتك", "Your library")}</h2><button className="text-button" onClick={() => navigate("my-products")}>{t("عرض الكل", "View all")} <ArrowUpLeft size={15} /></button></div><ProductList products={data.products.slice(0, 3)} ar={ar} onRedeem={() => navigate("redeem")} /></section></>}
        {activeTab === "my-products" && <section><div className="panel section-toolbar"><div><h2>{t("مكتبة المنتجات", "Product library")}</h2><p>{t("منتجات تم تفعيلها على حسابك فقط", "Only products activated on your account")}</p></div><label className="search"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} aria-label={t("ابحث عن منتج", "Search products")} placeholder={t("ابحث عن منتج…", "Search products…")} /></label></div><ProductSection title={t("منتجات نشطة", "Active products")} products={activeProducts} ar={ar} onRedeem={() => navigate("redeem")} emptySearch={Boolean(query)} emptyText={t("لا توجد منتجات نشطة حالياً", "No active products yet")} />{expiredProducts.length > 0 && <ProductSection title={t("منتجات منتهية", "Expired products")} products={expiredProducts} ar={ar} onRedeem={() => navigate("redeem")} expired />}</section>}
        {activeTab === "redeem" && <div className="form-layout"><section className="panel activation"><span className="large-icon"><KeyRound size={28} /></span><h2>{t("تفعيل مفتاح المنتج", "Activate a product key")}</h2><p>{t("أدخل المفتاح الذي استلمته لإضافة المنتج إلى حسابك.", "Enter the key you received to add the product to your account.")}</p><form onSubmit={redeem}><label htmlFor="license-key">{t("مفتاح الترخيص", "License key")}</label><input id="license-key" dir="ltr" value={key} onChange={(event) => setKey(event.target.value)} placeholder="SPFX-XXXXXX-XXXXXX-XXXXXX-XXXXXX-XXXXXX" required maxLength={40} autoComplete="off" spellCheck={false} /><button className="primary-button" type="submit" disabled={busy}>{busy ? <LoaderCircle className="spin" size={17} /> : <KeyRound size={17} />}{t("تفعيل المفتاح", "Activate key")}</button></form>{notice && <p className="inline-notice" role="status">{notice}</p>}<div className="muted-note"><ShieldCheck size={15} />{t("كل مفتاح صالح للاستخدام مرة واحدة فقط.", "Each key can be used only once.")}</div></section><section className="panel instructions"><h2>{t("كيف تبدأ؟", "How to get started")}</h2>{[t("سجّل دخولك باستخدام قوقل", "Sign in with Google"), t("أدخل مفتاح المنتج", "Enter your product key"), t("افتح منتجك من المكتبة", "Open your product from the library")].map((step, index) => <div key={step}><b>0{index + 1}</b><p>{step}</p></div>)}<button className="text-button" onClick={() => navigate("tickets")}>{t("تحتاج مساعدة؟", "Need help?")} <ArrowUpLeft size={15} /></button></section></div>}
        {activeTab === "tickets" && <section><div className="panel support-hero"><LifeBuoy size={36} /><h2>{t("مساعدة سريعة", "Quick help")}</h2><p>{t("إجابات مباشرة عن الحساب والمنتجات والمفاتيح.", "Direct answers about your account, products, and keys.")}</p></div><div className="faq-list"><details className="panel"><summary>{t("كيف أسجّل دخولي؟", "How do I sign in?")}<span>+</span></summary><p>{t("استخدم زر تسجيل الدخول في الصفحة الرئيسية واختر حساب قوقل.", "Use the sign-in button on the home page and choose your Google account.")}</p></details><details className="panel"><summary>{t("أين أجد منتجاتي؟", "Where are my products?")}<span>+</span></summary><p>{t("تظهر المنتجات التي فعّلت مفاتيحها في صفحة منتجاتي. إذا كانت المكتبة فارغة، فعّل مفتاح المنتج أولاً.", "Products whose keys you activated appear in My products. If your library is empty, activate a product key first.")}</p></details><details className="panel"><summary>{t("لماذا لا يعمل المفتاح؟", "Why doesn't my key work?")}<span>+</span></summary><p>{t("تأكد من إدخال المفتاح كاملاً. المفتاح صالح للاستخدام مرة واحدة، ولا يمكن نقله بين الحسابات عبر هذه البوابة.", "Enter the complete key. Each key can be used once and cannot be moved between accounts in this portal.")}</p></details></div></section>}
        {activeTab === "profile" && <div className="form-layout"><section className="panel profile"><Avatar image={user.image} name={user.name} size={72} /><h2>{user.name}</h2><span className="status-pill">Google</span><dl><div><dt>{t("الاسم", "Name")}</dt><dd>{user.name}</dd></div><div><dt>{t("البريد الإلكتروني", "Email address")}</dt><dd dir="ltr">{user.email}</dd></div><div><dt>{t("المنتجات", "Products")}</dt><dd>{data.products.length}</dd></div></dl><button className="secondary-button" onClick={() => void signOut({ callbackUrl: "/" })}>{t("تسجيل الخروج", "Sign out")}</button></section><section className="panel preferences"><h2>{t("تفضيلات الواجهة", "Display preferences")}</h2><div><span>{t("المظهر", "Appearance")}</span><button className="secondary-button" onClick={toggleTheme}>{isDark ? <Sun size={16} /> : <Moon size={16} />}{isDark ? t("الوضع الفاتح", "Light mode") : t("الوضع الداكن", "Dark mode")}</button></div><div><span>{t("اللغة", "Language")}</span><button className="secondary-button" onClick={() => setLang(ar ? "en" : "ar")}><Globe2 size={16} />{ar ? "English" : "العربية"}</button></div><p>{t("تُحفظ التفضيلات في هذا المتصفح.", "Preferences are saved in this browser.")}</p></section></div>}
        {activeTab === "admin" && data.isAdmin && <section className="admin-space"><div className="admin-grid"><section className="panel admin-form"><h2>{editingId ? t("تعديل منتج", "Edit product") : t("إضافة منتج", "Add product")}</h2><form onSubmit={saveProduct}><label>{t("اسم المنتج", "Product name")}<input value={name} onChange={(e) => setName(e.target.value)} required maxLength={120} /></label><label>{t("الوصف", "Description")}<textarea value={description} onChange={(e) => setDescription(e.target.value)} maxLength={2000} rows={3} /></label><label>{t("رابط الوصول HTTPS (اختياري)", "HTTPS access URL (optional)")}<input type="url" value={accessUrl} onChange={(e) => setAccessUrl(e.target.value)} placeholder="https://example.com/product" /></label><label>{t("صورة المنتج HTTPS (اختياري)", "Product image HTTPS (optional)")}<input type="url" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://.../image.jpg" /></label><label className="switch-row"><span>{t("إظهار المنتج للمستخدمين", "Show product to users")}</span><input type="checkbox" checked={isVisible} onChange={(e) => setIsVisible(e.target.checked)} /></label><div className="form-actions"><button className="primary-button" disabled={busy}>{t("حفظ المنتج", "Save product")}</button>{editingId && <button type="button" className="secondary-button" onClick={() => { setEditingId(""); setName(""); setDescription(""); setAccessUrl(""); setImageUrl(""); setIsVisible(true); }}>{t("إلغاء", "Cancel")}</button>}</div></form></section><section className="panel admin-form"><h2>{t("إنشاء مفاتيح", "Generate keys")}</h2><p>{t("المفاتيح تظهر بعد إنشائها مرة واحدة فقط. احفظها في مكان آمن.", "Keys are shown once after generation. Save them securely.")}</p><form onSubmit={createKeys}><label>{t("المنتج", "Product")}<select value={selectedProduct} onChange={(e) => setSelectedProduct(e.target.value)} required><option value="">{t("اختر منتجاً", "Choose a product")}</option>{data.inventory.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label><label>{t("عدد المفاتيح (1–20)", "Number of keys (1–20)")}<input type="number" min={1} max={20} value={keyCount} onChange={(e) => setKeyCount(Number(e.target.value))} required /></label><label>{t("مدة المفتاح", "Key duration")}<select value={durationDays} onChange={(e) => setDurationDays(Number(e.target.value))}><option value={3}>{t("3 أيام (افتراضي)", "3 days (default)")}</option><option value={1}>{t("يوم واحد", "1 day")}</option><option value={7}>{t("7 أيام", "7 days")}</option><option value={30}>{t("30 يوماً", "30 days")}</option><option value={90}>{t("90 يوماً", "90 days")}</option><option value={365}>{t("سنة", "1 year")}</option></select></label><button className="primary-button" disabled={busy || !data.inventory.length}>{t("إنشاء المفاتيح", "Generate keys")}</button></form>{newKeys.length > 0 && <div className="generated-keys" role="status"><strong>{t("المفاتيح الجديدة — انسخها الآن", "New keys — copy them now")}</strong><pre dir="ltr">{newKeys.join("\n")}</pre><button className="secondary-button" onClick={() => void navigator.clipboard.writeText(newKeys.join("\n"))}>{t("نسخ الكل", "Copy all")}</button></div>}</section></div>{notice && <p className="inline-notice" role="status">{notice}</p>}<div className="section-title"><h2>{t("المنتجات المسجلة", "Saved products")}</h2></div>{data.inventory.length ? <div className="admin-list">{data.inventory.map((p) => <article className="panel admin-row" key={p.id}><div>{p.image_url ? <img className="admin-thumb" src={p.image_url} alt="" /> : <span className="admin-thumb admin-thumb-fallback"><Package size={19} /></span>}<h3>{p.name}</h3><p>{p.description || t("لا يوجد وصف", "No description")}</p><small>{t("مفاتيح متاحة", "Available keys")}: {p.available_keys} · {t("مستخدمة", "Redeemed")}: {p.redeemed_keys}</small></div><button className="secondary-button" onClick={() => { setEditingId(p.id); setName(p.name); setDescription(p.description); setAccessUrl(p.access_url || ""); setImageUrl(p.image_url || ""); setIsVisible(p.is_visible !== false); window.scrollTo({ top: 0, behavior: "smooth" }); }}>{t("تعديل", "Edit")}</button></article>)}</div> : <div className="panel empty"><Package size={28} /><h3>{t("لا توجد منتجات بعد", "No products yet")}</h3><p>{t("أضف أول منتج من النموذج أعلاه.", "Add the first product with the form above.")}</p></div>}</section>}
      </>}
    </main><footer className="portal-footer"><span>© {new Date().getFullYear()} SpooFX</span><span>{t("حسابك ومنتجاتك في مكان واحد", "Your account and products in one place")}</span></footer></div>
  </div>;
}

function Avatar({ image, name, size = 29 }: { image?: string | null; name: string; size?: number }) {
  return image ? <img className="avatar-image" src={image} width={size} height={size} alt={name} referrerPolicy="no-referrer" /> : <span className="avatar-fallback" style={{ width: size, height: size }}><UserRound size={Math.round(size * 0.48)} /></span>;
}

function ProductSection({ title, products, ar, onRedeem, emptySearch = false, emptyText, expired = false }: { title: string; products: Product[]; ar: boolean; onRedeem: () => void; emptySearch?: boolean; emptyText?: string; expired?: boolean }) {
  return <section className={`product-section${expired ? " expired-section" : ""}`}><div className="section-title"><h2>{title}<span className="section-count">{products.length}</span></h2></div><ProductList products={products} ar={ar} onRedeem={onRedeem} emptySearch={emptySearch} emptyText={emptyText} expired={expired} /></section>;
}

function ProductList({ products, ar, onRedeem, emptySearch = false, emptyText, expired = false }: { products: Product[]; ar: boolean; onRedeem: () => void; emptySearch?: boolean; emptyText?: string; expired?: boolean }) {
  if (!products.length) return <div className="panel empty compact-empty"><span className="large-icon"><Package size={28} /></span><h3>{emptySearch ? (ar ? "لا توجد نتائج" : "No results") : (emptyText || (ar ? "لا توجد منتجات في حسابك بعد" : "No products in your account yet"))}</h3><p>{emptySearch ? (ar ? "جرّب اسماً آخر." : "Try another name.") : (!expired && (ar ? "فعّل مفتاح منتج لإضافته إلى مكتبتك." : "Activate a product key to add it to your library."))}</p>{!emptySearch && !expired && <button className="primary-button empty-action" onClick={onRedeem}><KeyRound size={16} />{ar ? "تفعيل مفتاح" : "Activate a key"}</button>}</div>;
  return <div className="product-grid">{products.map((p) => <article className={`panel product real-product${expired ? " expired-product" : ""}`} key={p.id}><div className="real-product-art">{p.image_url ? <img src={p.image_url} alt="" loading="lazy" /> : <Package size={37} />}</div><div className="product-copy"><span className="sample-label">SPOOFX PRODUCT</span><h3>{p.name}</h3><p>{p.description}</p><div className="product-meta"><span><CheckCircle2 size={13} />{expired ? (ar ? "انتهت مدة المفتاح" : "Key expired") : (ar ? "مفعّل على حسابك" : "Activated on your account")}</span>{p.expires_at && <time dateTime={p.expires_at}>{ar ? "ينتهي " : "Expires "}{new Date(p.expires_at).toLocaleDateString(ar ? "ar-SA" : "en-US")}</time>}{p.access_url && !expired && <a className="icon-button" href={p.access_url} target="_blank" rel="noopener noreferrer" aria-label={ar ? `فتح ${p.name}` : `Open ${p.name}`}><ArrowUpLeft size={17} /></a>}</div></div></article>)}</div>;
}
