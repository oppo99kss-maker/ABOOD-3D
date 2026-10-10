"use client";

import { useState, useMemo, type FormEvent } from "react";
import {
  AlertTriangle,
  ArrowRight,
  ArrowUpLeft,
  Box,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock,
  Copy,
  Database,
  Download,
  ExternalLink,
  Eye,
  EyeOff,
  FileCode,
  FileText,
  Filter,
  Flame,
  Globe2,
  HardDrive,
  HelpCircle,
  History,
  KeyRound,
  LayoutDashboard,
  LifeBuoy,
  ListFilter,
  LoaderCircle,
  Menu,
  Moon,
  Package,
  Plus,
  RefreshCw,
  Search,
  Settings,
  Shield,
  ShieldAlert,
  ShieldCheck,
  ShoppingBag,
  Sliders,
  Sun,
  Trash2,
  Upload,
  UserCheck,
  UserPlus,
  UserRound,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import type {
  Product,
  LicenseKey,
  Order,
  Compensation,
  AuditLog,
  Guide,
  SystemSettings,
} from "@/lib/store";

export type AdminSection =
  | "dashboard"
  | "products"
  | "inventory"
  | "customers"
  | "orders"
  | "compensations"
  | "logs"
  | "guides"
  | "settings";

type Props = {
  products: Product[];
  inventory: Product[];
  dashboardStats: any;
  orders: Order[];
  allGuides: Guide[];
  settings: SystemSettings;
  currentUser: string;
  lang: "ar" | "en";
  isDark: boolean;
  onRefresh: () => Promise<void>;
  onExitAdmin: () => void;
};

export function AdminControlSpace({
  products,
  inventory,
  dashboardStats,
  orders: initialOrders,
  allGuides: initialGuides,
  settings: initialSettings,
  currentUser,
  lang,
  isDark,
  onRefresh,
  onExitAdmin,
}: Props) {
  const ar = lang === "ar";
  const t = (arStr: string, enStr: string) => (ar ? arStr : enStr);

  const [activeSection, setActiveSection] = useState<AdminSection>("dashboard");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // Products state
  const [productSearch, setProductSearch] = useState("");
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productForm, setProductForm] = useState({
    name: "",
    nameEn: "",
    description: "",
    category: "General",
    accessUrl: "",
    imageUrl: "",
    instructions: "",
    defaultDurationDays: 30,
    isVisible: true,
    isActive: true,
  });

  // Inventory state
  const [selectedProductId, setSelectedProductId] = useState<string>(products[0]?.id || "");
  const [inventoryKeys, setInventoryKeys] = useState<LicenseKey[]>([]);
  const [loadingInventory, setLoadingInventory] = useState(false);
  const [generateCount, setGenerateCount] = useState(10);
  const [generateDuration, setGenerateDuration] = useState(30);
  const [newlyGenerated, setNewlyGenerated] = useState<string[]>([]);
  const [importKeysText, setImportKeysText] = useState("");
  const [importDuration, setImportDuration] = useState(30);

  // Customers state
  const [customers, setCustomers] = useState<any[]>([]);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [customerSearch, setCustomerSearch] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null);
  const [showCustomerDrawer, setShowCustomerDrawer] = useState(false);
  const [customerDetails, setCustomerDetails] = useState<any | null>(null);

  // Customer Modals
  const [showGrantModal, setShowGrantModal] = useState(false);
  const [grantProductId, setGrantProductId] = useState("");
  const [grantDuration, setGrantDuration] = useState(30);
  const [grantReason, setGrantReason] = useState("");

  const [showExtendModal, setShowExtendModal] = useState(false);
  const [extendLicenseId, setExtendLicenseId] = useState("");
  const [extendDays, setExtendDays] = useState(30);

  // Orders state
  const [ordersList, setOrdersList] = useState<Order[]>(initialOrders || []);
  const [showCreateOrderModal, setShowCreateOrderModal] = useState(false);
  const [orderForm, setOrderForm] = useState({
    customerEmail: "",
    customerName: "",
    productId: products[0]?.id || "",
    quantity: 1,
    totalAmount: 0,
    paymentMethod: "Store Payment",
    notes: "",
  });

  // Compensations state
  const [showCompensationModal, setShowCompensationModal] = useState(false);
  const [compForm, setCompForm] = useState({
    customerEmail: "",
    originalProductId: products[0]?.id || "",
    compensationType: "REPLACEMENT_KEY" as Compensation["compensation_type"],
    details: "",
    reason: "",
  });

  // Logs state
  const [logs, setLogs] = useState<AuditLog[]>(dashboardStats?.recentActivity || []);
  const [logsCategory, setLogsCategory] = useState<string>("");
  const [loadingLogs, setLoadingLogs] = useState(false);

  // Settings state
  const [settingsState, setSettingsState] = useState<SystemSettings>(initialSettings);
  const [dbStatus, setDbStatus] = useState<"ok" | "checking" | "error">("ok");

  // Notification helper
  function notify(message: string, type: "success" | "error" = "success") {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  }

  // API Call helper
  async function apiAction(payload: Record<string, unknown>) {
    setBusy(true);
    try {
      const res = await fetch("/api/portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error || "OPERATION_FAILED");
      return data;
    } finally {
      setBusy(false);
    }
  }

  // Load Inventory for selected product
  async function loadInventory(pId: string) {
    if (!pId) return;
    setLoadingInventory(true);
    try {
      const res = await fetch(`/api/portal?view=admin-inventory&productId=${pId}`);
      if (res.ok) {
        const data = await res.json();
        setInventoryKeys(data.keys || []);
      }
    } catch {
      notify(t("فشل تحميل المفاتيح", "Failed to load keys"), "error");
    } finally {
      setLoadingInventory(false);
    }
  }

  // Load Customers
  async function loadCustomers(search = "") {
    setLoadingCustomers(true);
    try {
      const res = await fetch(`/api/portal?view=admin-customers&search=${encodeURIComponent(search)}`);
      if (res.ok) {
        const data = await res.json();
        setCustomers(data.customers || []);
      }
    } catch {
      notify(t("فشل تحميل العملاء", "Failed to load customers"), "error");
    } finally {
      setLoadingCustomers(false);
    }
  }

  // Load Customer Details
  async function openCustomerDetails(email: string) {
    try {
      const res = await fetch(`/api/portal?view=admin-customer-details&email=${encodeURIComponent(email)}`);
      if (res.ok) {
        const data = await res.json();
        setCustomerDetails(data);
        setSelectedCustomer(email);
        setShowCustomerDrawer(true);
      }
    } catch {
      notify(t("فشل تحميل تفاصيل العميل", "Failed to load customer profile"), "error");
    }
  }

  // Load Audit Logs
  async function loadLogs(category = "") {
    setLoadingLogs(true);
    try {
      const res = await fetch(`/api/portal?view=admin-logs${category ? `&category=${category}` : ""}`);
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
      }
    } catch {
      notify(t("فشل تحميل السجلات", "Failed to load logs"), "error");
    } finally {
      setLoadingLogs(false);
    }
  }

  // Handlers
  async function handleSaveProduct(e: FormEvent) {
    e.preventDefault();
    try {
      if (editingProduct) {
        await apiAction({
          action: "updateProduct",
          id: editingProduct.id,
          ...productForm,
        });
        notify(t("تم تحديث المنتج بنجاح", "Product updated successfully"));
      } else {
        await apiAction({
          action: "createProduct",
          ...productForm,
        });
        notify(t("تم إنشاء المنتج بنجاح", "Product created successfully"));
      }
      setShowProductModal(false);
      setEditingProduct(null);
      await onRefresh();
    } catch (err: any) {
      notify(err.message, "error");
    }
  }

  async function handleArchiveProduct(id: string, archive: boolean) {
    try {
      await apiAction({ action: "archiveProduct", id, archive });
      notify(archive ? t("تمت أرشفة المنتج", "Product archived") : t("تمت استعادة المنتج", "Product restored"));
      await onRefresh();
    } catch (err: any) {
      notify(err.message, "error");
    }
  }

  async function handleGenerateKeys(e: FormEvent) {
    e.preventDefault();
    if (!selectedProductId) return;
    try {
      const res = await apiAction({
        action: "generateKeys",
        productId: selectedProductId,
        count: generateCount,
        durationDays: generateDuration,
      });
      setNewlyGenerated(res.keys || []);
      notify(t(`تم توليد ${res.count} مفتاح بنجاح!`, `Generated ${res.count} keys successfully!`));
      await loadInventory(selectedProductId);
      await onRefresh();
    } catch (err: any) {
      notify(err.message, "error");
    }
  }

  async function handleImportKeys(e: FormEvent) {
    e.preventDefault();
    if (!selectedProductId || !importKeysText.trim()) return;
    const lines = importKeysText.split("\n").map((l) => l.trim()).filter(Boolean);
    try {
      const res = await apiAction({
        action: "importKeys",
        productId: selectedProductId,
        rawKeys: lines,
        durationDays: importDuration,
      });
      notify(t(`تم استيراد ${res.importedCount} مفتاحاً (${res.duplicates.length} مكرر)`, `Imported ${res.importedCount} keys (${res.duplicates.length} duplicates)`));
      setImportKeysText("");
      await loadInventory(selectedProductId);
      await onRefresh();
    } catch (err: any) {
      notify(err.message, "error");
    }
  }

  async function handleGrantLicense(e: FormEvent) {
    e.preventDefault();
    if (!selectedCustomer || !grantProductId) return;
    try {
      await apiAction({
        action: "grantDirectLicense",
        customerEmail: selectedCustomer,
        productId: grantProductId,
        durationDays: grantDuration,
        reason: grantReason,
      });
      notify(t("تم منح الترخيص للعميل بنجاح!", "License granted successfully!"));
      setShowGrantModal(false);
      setGrantReason("");
      await openCustomerDetails(selectedCustomer);
      await onRefresh();
    } catch (err: any) {
      notify(err.message, "error");
    }
  }

  async function handleExtendLicense(e: FormEvent) {
    e.preventDefault();
    if (!extendLicenseId) return;
    try {
      await apiAction({
        action: "extendLicense",
        licenseId: extendLicenseId,
        additionalDays: extendDays,
      });
      notify(t("تم تمديد الترخيص بنجاح!", "License extended successfully!"));
      setShowExtendModal(false);
      if (selectedCustomer) await openCustomerDetails(selectedCustomer);
      await onRefresh();
    } catch (err: any) {
      notify(err.message, "error");
    }
  }

  async function handleSuspendLicense(licenseId: string) {
    if (!confirm(t("هل أنت متأكد من رغبتك بإيقاف هذا الترخيص؟", "Are you sure you want to revoke this license?"))) return;
    try {
      await apiAction({ action: "suspendLicense", licenseId });
      notify(t("تم إلغاء الترخيص", "License revoked"));
      if (selectedCustomer) await openCustomerDetails(selectedCustomer);
      await onRefresh();
    } catch (err: any) {
      notify(err.message, "error");
    }
  }

  async function handleIssueKey(orderId: string) {
    try {
      const res = await apiAction({ action: "issueKeyToOrder", orderId });
      notify(t(`تم تخصيص المفتاح (${res.maskedCode}) للطلب بنجاح!`, `Allocated key (${res.maskedCode}) successfully!`));
      const ordersRes = await fetch("/api/portal?view=admin-orders");
      if (ordersRes.ok) {
        const data = await ordersRes.json();
        setOrdersList(data.orders || []);
      }
      await onRefresh();
    } catch (err: any) {
      notify(err.message, "error");
    }
  }

  async function handleCreateCompensation(e: FormEvent) {
    e.preventDefault();
    try {
      await apiAction({
        action: "createCompensation",
        ...compForm,
      });
      notify(t("تم تسجيل التعويض بنجاح!", "Compensation recorded successfully!"));
      setShowCompensationModal(false);
      setCompForm({
        customerEmail: "",
        originalProductId: products[0]?.id || "",
        compensationType: "REPLACEMENT_KEY",
        details: "",
        reason: "",
      });
      await onRefresh();
    } catch (err: any) {
      notify(err.message, "error");
    }
  }

  async function handleCheckDatabase() {
    setDbStatus("checking");
    try {
      const res = await fetch("/api/health");
      if (res.ok) {
        setDbStatus("ok");
        notify(t("الاتصال بقاعدة البيانات ممتاز ومستقر (Postgres Live)", "Database connection is healthy and responsive"));
      } else {
        setDbStatus("error");
        notify(t("تعذر فحص قاعدة البيانات", "Database health check failed"), "error");
      }
    } catch {
      setDbStatus("error");
      notify(t("فشل الاتصال بالخادم", "Connection to server failed"), "error");
    }
  }

  const navItems = [
    { id: "dashboard", icon: LayoutDashboard, ar: "لوحة التحكم", en: "Dashboard" },
    { id: "products", icon: Package, ar: "إدارة المنتجات", en: "Products", count: products.length },
    { id: "inventory", icon: KeyRound, ar: "مخزون المفاتيح", en: "Inventory" },
    { id: "customers", icon: Users, ar: "إدارة العملاء", en: "Customers" },
    { id: "orders", icon: ShoppingBag, ar: "الطلبات والتسليم", en: "Orders", count: ordersList.length },
    { id: "compensations", icon: ShieldCheck, ar: "التعويضات", en: "Compensations" },
    { id: "logs", icon: History, ar: "مركز السجلات", en: "Audit Logs" },
    { id: "settings", icon: Settings, ar: "حالة النظام والإعدادات", en: "Settings & Health" },
  ];

  const filteredProducts = useMemo(() => {
    return products.filter((p) =>
      (p.name + (p.description || "") + (p.category || "")).toLowerCase().includes(productSearch.toLowerCase())
    );
  }, [products, productSearch]);

  return (
    <div className="admin-space-root" data-theme={isDark ? "dark" : "light"} dir={ar ? "rtl" : "ltr"}>
      {/* Toast Notification */}
      {toast && (
        <div className={`admin-toast ${toast.type}`}>
          {toast.type === "success" ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Admin Sidebar */}
      <aside className={`admin-sidebar ${sidebarCollapsed ? "collapsed" : ""} ${mobileSidebarOpen ? "mobile-open" : ""}`}>
        <div className="sidebar-header">
          <div className="sidebar-brand">
            <span className="brand-logo"><Flame size={22} /></span>
            {!sidebarCollapsed && (
              <div className="brand-text">
                <strong>SpooFX</strong>
                <small>{t("لوحة التحكم الإدارية", "Control Space")}</small>
              </div>
            )}
          </div>
          <button
            className="collapse-btn"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            aria-label="Toggle Sidebar"
          >
            <Sliders size={16} />
          </button>
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = activeSection === item.id;
            return (
              <button
                key={item.id}
                className={`sidebar-link ${active ? "active" : ""}`}
                onClick={() => {
                  setActiveSection(item.id as AdminSection);
                  setMobileSidebarOpen(false);
                  if (item.id === "inventory" && selectedProductId) loadInventory(selectedProductId);
                  if (item.id === "customers") loadCustomers();
                  if (item.id === "logs") loadLogs();
                }}
              >
                <Icon size={19} />
                {!sidebarCollapsed && <span className="link-label">{t(item.ar, item.en)}</span>}
                {!sidebarCollapsed && item.count !== undefined && <span className="badge-count">{item.count}</span>}
              </button>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <button className="exit-admin-btn" onClick={onExitAdmin} title={t("العودة لبوابة العملاء", "Back to Portal")}>
            <ArrowRight size={17} className={ar ? "rotate-180" : ""} />
            {!sidebarCollapsed && <span>{t("بوابة العملاء", "Client Portal")}</span>}
          </button>
        </div>
      </aside>

      {/* Main Admin Content */}
      <div className="admin-main-wrapper">
        {/* Top Header */}
        <header className="admin-topbar">
          <div className="topbar-left">
            <button className="mobile-menu-btn" onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}>
              <Menu size={20} />
            </button>
            <div className="breadcrumbs">
              <span>SpooFX Space</span>
              <span className="sep">/</span>
              <strong className="current-crumb">
                {t(navItems.find((i) => i.id === activeSection)?.ar || "", navItems.find((i) => i.id === activeSection)?.en || "")}
              </strong>
            </div>
          </div>

          <div className="topbar-right">
            <button className="topbar-btn" onClick={() => onRefresh()} title={t("تحديث البيانات", "Refresh Data")}>
              <RefreshCw size={17} className={busy ? "spin" : ""} />
            </button>
            <div className="admin-user-pill">
              <ShieldCheck size={16} className="admin-badge-icon" />
              <span>{currentUser}</span>
            </div>
          </div>
        </header>

        {/* Section View */}
        <main className="admin-content-area">
          {/* ==================================================== */}
          {/* SECTION 1: DASHBOARD OVERVIEW */}
          {/* ==================================================== */}
          {activeSection === "dashboard" && (
            <div className="admin-view-block">
              <div className="admin-hero-card">
                <div>
                  <span className="eyebrow-pill"><Shield size={14} /> SpooFX Admin Engine</span>
                  <h1>{t("مركز إدارة منصة SpooFX", "SpooFX Control Space")}</h1>
                  <p>{t("نظرة شاملة ومباشرة على المخزون والتراخيص والطلبات وسجلات العمليات.", "Real-time overview of inventory, licenses, customer entitlements, and security logs.")}</p>
                </div>
                <div className="hero-quick-actions">
                  <button className="hero-btn primary" onClick={() => { setActiveSection("products"); setShowProductModal(true); }}>
                    <Plus size={16} /> {t("إضافة منتج جديد", "Add Product")}
                  </button>
                  <button className="hero-btn secondary" onClick={() => { setActiveSection("inventory"); }}>
                    <KeyRound size={16} /> {t("توليد مفاتيح للمخزون", "Generate Keys")}
                  </button>
                </div>
              </div>

              {/* KPI Cards */}
              <div className="kpi-grid">
                <div className="kpi-card">
                  <div className="kpi-icon blue"><Package size={22} /></div>
                  <div className="kpi-info">
                    <span className="kpi-label">{t("إجمالي المنتجات", "Total Products")}</span>
                    <strong className="kpi-val">{dashboardStats?.products?.total_products ?? products.length}</strong>
                    <small>{t("المنتجات النشطة", "Active")}: {dashboardStats?.products?.active_products ?? products.filter((p) => p.is_active).length}</small>
                  </div>
                </div>

                <div className="kpi-card">
                  <div className="kpi-icon green"><KeyRound size={22} /></div>
                  <div className="kpi-info">
                    <span className="kpi-label">{t("المفاتيح المتاحة", "Available Keys")}</span>
                    <strong className="kpi-val">{dashboardStats?.keys?.available_keys ?? 0}</strong>
                    <small>{t("إجمالي المفاتيح", "Total")}: {dashboardStats?.keys?.total_keys ?? 0}</small>
                  </div>
                </div>

                <div className="kpi-card">
                  <div className="kpi-icon purple"><UserCheck size={22} /></div>
                  <div className="kpi-info">
                    <span className="kpi-label">{t("العملاء المستفيدون", "Registered Customers")}</span>
                    <strong className="kpi-val">{dashboardStats?.customers?.total_customers ?? 0}</strong>
                    <small>{t("التفعيلات اليوم", "Activations today")}: {dashboardStats?.activationsToday ?? 0}</small>
                  </div>
                </div>

                <div className="kpi-card">
                  <div className="kpi-icon orange"><ShoppingBag size={22} /></div>
                  <div className="kpi-info">
                    <span className="kpi-label">{t("الطلبات المنفذة", "Orders Fulfilled")}</span>
                    <strong className="kpi-val">{dashboardStats?.orders?.fulfilled_orders ?? 0}</strong>
                    <small>{t("إجمالي الطلبات", "Total orders")}: {dashboardStats?.orders?.total_orders ?? ordersList.length}</small>
                  </div>
                </div>
              </div>

              {/* Recent Activity stream */}
              <div className="recent-activity-panel">
                <div className="panel-heading-row">
                  <div>
                    <h2>{t("أحدث العمليات وسجلات النظام", "Recent Activity & Audit Stream")}</h2>
                    <p>{t("سجل مباشر للعمليات الإدارية وتفعيلات المفاتيح والطلبات.", "Live event trail for administrative operations and key redemptions.")}</p>
                  </div>
                  <button className="btn-ghost" onClick={() => { setActiveSection("logs"); loadLogs(); }}>
                    {t("عرض السجل الكامل", "View Full Log")} <ArrowUpLeft size={15} />
                  </button>
                </div>

                <div className="activity-list">
                  {dashboardStats?.recentActivity?.length ? (
                    dashboardStats.recentActivity.map((log: AuditLog) => (
                      <div className="activity-item" key={log.id}>
                        <div className="activity-meta">
                          <span className={`cat-pill ${log.category.toLowerCase()}`}>{log.category}</span>
                          <strong>{log.action}</strong>
                        </div>
                        <div className="activity-details">
                          <span>{log.actor_email}</span>
                          <time>{new Date(log.created_at).toLocaleString(ar ? "ar-SA" : "en-US")}</time>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="empty-notice">{t("لا توجد أحداث مسجلة بعد.", "No recent activity yet.")}</div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ==================================================== */}
          {/* SECTION 2: PRODUCTS MANAGEMENT */}
          {/* ==================================================== */}
          {activeSection === "products" && (
            <div className="admin-view-block">
              <div className="section-toolbar-row">
                <div className="toolbar-search">
                  <Search size={18} />
                  <input
                    type="text"
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    placeholder={t("بحث في المنتجات بالاسم أو التصنيف...", "Search products by name or category...")}
                  />
                </div>
                <button
                  className="btn-primary"
                  onClick={() => {
                    setEditingProduct(null);
                    setProductForm({
                      name: "",
                      nameEn: "",
                      description: "",
                      category: "General",
                      accessUrl: "",
                      imageUrl: "",
                      instructions: "",
                      defaultDurationDays: 30,
                      isVisible: true,
                      isActive: true,
                    });
                    setShowProductModal(true);
                  }}
                >
                  <Plus size={16} /> {t("إضافة منتج جديد", "Add New Product")}
                </button>
              </div>

              {/* Products Table */}
              <div className="admin-table-container">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>{t("المنتج", "Product")}</th>
                      <th>{t("التصنيف", "Category")}</th>
                      <th>{t("المدة الافتراضية", "Duration")}</th>
                      <th>{t("المخزون المتاح", "Available")}</th>
                      <th>{t("المفعل", "Redeemed")}</th>
                      <th>{t("الحالة", "Status")}</th>
                      <th>{t("الإجراءات", "Actions")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProducts.map((p) => (
                      <tr key={p.id}>
                        <td>
                          <div className="table-product-cell">
                            {p.image_url ? (
                              <img src={p.image_url} alt="" className="table-thumb" />
                            ) : (
                              <div className="table-thumb-fallback"><Package size={18} /></div>
                            )}
                            <div>
                              <strong>{p.name}</strong>
                              <small>{p.id.slice(0, 8)}...</small>
                            </div>
                          </div>
                        </td>
                        <td><span className="badge-tag">{p.category || "General"}</span></td>
                        <td>{p.default_duration_days >= 3650 ? t("مدى الحياة", "Lifetime") : `${p.default_duration_days} ${t("يوم", "Days")}`}</td>
                        <td><strong className="stock-count">{p.available_keys ?? 0}</strong></td>
                        <td>{p.redeemed_keys ?? 0}</td>
                        <td>
                          {p.is_archived ? (
                            <span className="status-badge gray">{t("مؤرشف", "Archived")}</span>
                          ) : p.is_visible ? (
                            <span className="status-badge green">{t("ظاهر", "Visible")}</span>
                          ) : (
                            <span className="status-badge orange">{t("مخفي", "Hidden")}</span>
                          )}
                        </td>
                        <td>
                          <div className="action-buttons-group">
                            <button
                              className="btn-action"
                              title={t("تعديل", "Edit")}
                              onClick={() => {
                                setEditingProduct(p);
                                setProductForm({
                                  name: p.name,
                                  nameEn: p.name_en || "",
                                  description: p.description || "",
                                  category: p.category || "General",
                                  accessUrl: p.access_url || "",
                                  imageUrl: p.image_url || "",
                                  instructions: p.instructions || "",
                                  defaultDurationDays: p.default_duration_days || 30,
                                  isVisible: p.is_visible !== false,
                                  isActive: p.is_active !== false,
                                });
                                setShowProductModal(true);
                              }}
                            >
                              <Sliders size={15} />
                            </button>
                            <button
                              className="btn-action"
                              title={t("عرض المخزون", "View Inventory")}
                              onClick={() => {
                                setSelectedProductId(p.id);
                                setActiveSection("inventory");
                                loadInventory(p.id);
                              }}
                            >
                              <KeyRound size={15} />
                            </button>
                            <button
                              className="btn-action danger"
                              title={p.is_archived ? t("استعادة", "Restore") : t("أرشفة", "Archive")}
                              onClick={() => handleArchiveProduct(p.id, !p.is_archived)}
                            >
                              {p.is_archived ? <Eye size={15} /> : <EyeOff size={15} />}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ==================================================== */}
          {/* SECTION 3: INVENTORY & KEYS */}
          {/* ==================================================== */}
          {activeSection === "inventory" && (
            <div className="admin-view-block">
              {/* Product Selector */}
              <div className="inventory-header-card">
                <div className="selector-group">
                  <label htmlFor="inv-product-select">{t("اختر المنتج لإدارة مخزونه:", "Select Product to Manage Inventory:")}</label>
                  <select
                    id="inv-product-select"
                    value={selectedProductId}
                    onChange={(e) => {
                      setSelectedProductId(e.target.value);
                      loadInventory(e.target.value);
                    }}
                  >
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
                <div className="inv-stats-pills">
                  <span>{t("المفاتيح في المخزون:", "In Stock:")} <strong>{inventoryKeys.filter((k) => k.status === "AVAILABLE").length}</strong></span>
                  <span>{t("المفاتيح المفعلة:", "Redeemed:")} <strong>{inventoryKeys.filter((k) => k.status === "REDEEMED").length}</strong></span>
                </div>
              </div>

              {/* Generator & Importer Cards */}
              <div className="admin-forms-columns">
                {/* 1. Generator */}
                <div className="admin-card-panel">
                  <h3><KeyRound size={18} /> {t("توليد دفعة مفاتيح آمنة", "Generate Cryptographic Keys")}</h3>
                  <p>{t("يتم إنشاء المفاتيح عشوائياً وتشفيرها بالـ HMAC لتأكيد الأمان.", "Generates cryptographically random keys and stores their HMAC digests.")}</p>

                  <form onSubmit={handleGenerateKeys}>
                    <div className="form-field">
                      <label htmlFor="key-count-input">{t("عدد المفاتيح (1 - 500)", "Number of Keys (1 - 500)")}</label>
                      <input
                        id="key-count-input"
                        type="number"
                        min={1}
                        max={500}
                        value={generateCount}
                        onChange={(e) => setGenerateCount(Number(e.target.value))}
                        required
                      />
                    </div>
                    <div className="form-field">
                      <label htmlFor="key-duration-select">{t("مدة صلاحية المفتاح", "Key Duration")}</label>
                      <select id="key-duration-select" value={generateDuration} onChange={(e) => setGenerateDuration(Number(e.target.value))}>
                        <option value={1}>{t("يوم واحد (1 Day)", "1 Day")}</option>
                        <option value={3}>{t("3 أيام (3 Days)", "3 Days")}</option>
                        <option value={7}>{t("أسبوع (7 Days)", "7 Days")}</option>
                        <option value={30}>{t("شهر (30 Days)", "30 Days")}</option>
                        <option value={90}>{t("3 أشهر (90 Days)", "90 Days")}</option>
                        <option value={365}>{t("سنة (1 Year)", "1 Year")}</option>
                        <option value={3650}>{t("مدى الحياة (Lifetime)", "Lifetime")}</option>
                      </select>
                    </div>
                    <button className="btn-primary" type="submit" disabled={busy || !selectedProductId}>
                      {busy ? <LoaderCircle className="spin" size={16} /> : <Plus size={16} />}
                      {t("توليد المفاتيح الآن", "Generate Keys Now")}
                    </button>
                  </form>

                  {newlyGenerated.length > 0 && (
                    <div className="generated-keys-box">
                      <div className="box-header">
                        <strong>{t(`المفاتيح المولدة حديثاً (${newlyGenerated.length}) — انسخها الآن!`, `Newly generated (${newlyGenerated.length}) — Copy now!`)}</strong>
                        <button
                          className="btn-ghost small"
                          onClick={() => {
                            navigator.clipboard.writeText(newlyGenerated.join("\n"));
                            notify(t("تم نسخ جميع المفاتيح إلى الحافظة!", "Copied all keys to clipboard!"));
                          }}
                        >
                          <Copy size={14} /> {t("نسخ الكل", "Copy All")}
                        </button>
                      </div>
                      <textarea readOnly rows={5} value={newlyGenerated.join("\n")} dir="ltr" />
                    </div>
                  )}
                </div>

                {/* 2. Custom Key Importer */}
                <div className="admin-card-panel">
                  <h3><Upload size={18} /> {t("استيراد مفاتيح جاهزة", "Import Custom Keys")}</h3>
                  <p>{t("الصق قائمة المفاتيح سطر بسطر (TXT أو CSV). سيتم فحص التكرار تلقائياً.", "Paste keys line by line (TXT or CSV). Duplicates will be safely ignored.")}</p>

                  <form onSubmit={handleImportKeys}>
                    <div className="form-field">
                      <label htmlFor="import-keys-area">{t("المفاتيح (مفتاح في كل سطر)", "Keys (one per line)")}</label>
                      <textarea
                        id="import-keys-area"
                        rows={6}
                        value={importKeysText}
                        onChange={(e) => setImportKeysText(e.target.value)}
                        placeholder="SPFX-AAAAAA-BBBBBB-CCCCCC...&#10;SPFX-111111-222222-333333..."
                        dir="ltr"
                        required
                      />
                    </div>
                    <div className="form-field">
                      <label htmlFor="import-duration-select">{t("مدة المفاتيح المستوردة", "Duration of Imported Keys")}</label>
                      <select id="import-duration-select" value={importDuration} onChange={(e) => setImportDuration(Number(e.target.value))}>
                        <option value={30}>{t("30 يوماً", "30 Days")}</option>
                        <option value={7}>{t("7 أيام", "7 Days")}</option>
                        <option value={90}>{t("90 يوماً", "90 Days")}</option>
                        <option value={365}>{t("سنة", "1 Year")}</option>
                        <option value={3650}>{t("مدى الحياة", "Lifetime")}</option>
                      </select>
                    </div>
                    <button className="btn-secondary" type="submit" disabled={busy || !selectedProductId || !importKeysText.trim()}>
                      <Upload size={16} /> {t("استيراد المفاتيح", "Import Keys")}
                    </button>
                  </form>
                </div>
              </div>

              {/* Keys Inventory Table */}
              <div className="admin-table-container">
                <div className="table-top-bar">
                  <h3>{t("المفاتيح المسجلة للمنتج", "Registered Keys for Product")}</h3>
                  <button className="btn-ghost small" onClick={() => loadInventory(selectedProductId)}>
                    <RefreshCw size={14} className={loadingInventory ? "spin" : ""} /> {t("تحديث", "Refresh")}
                  </button>
                </div>

                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>{t("رمز المفتاح المقنّع", "Masked Key")}</th>
                      <th>{t("الحالة", "Status")}</th>
                      <th>{t("المدة", "Duration")}</th>
                      <th>{t("تاريخ الإنشاء", "Created At")}</th>
                      <th>{t("المستفيد / الحساب", "Customer")}</th>
                      <th>{t("تاريخ التفعيل", "Redeemed At")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inventoryKeys.length ? (
                      inventoryKeys.map((k) => (
                        <tr key={k.id}>
                          <td><code className="key-code">{k.masked_code || `SPFX-******-${k.code_suffix}`}</code></td>
                          <td>
                            <span className={`status-badge ${k.status === "AVAILABLE" ? "green" : k.status === "REDEEMED" ? "blue" : "orange"}`}>
                              {k.status}
                            </span>
                          </td>
                          <td>{k.duration_days >= 3650 ? t("مدى الحياة", "Lifetime") : `${k.duration_days} ${t("يوم", "Days")}`}</td>
                          <td>{new Date(k.created_at).toLocaleDateString(ar ? "ar-SA" : "en-US")}</td>
                          <td>{k.redeemed_by || k.issued_to || "-"}</td>
                          <td>{k.redeemed_at ? new Date(k.redeemed_at).toLocaleDateString(ar ? "ar-SA" : "en-US") : "-"}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="table-empty-cell">
                          {loadingInventory ? t("جارٍ تحميل المفاتيح...", "Loading keys...") : t("لا توجد مفاتيح مسجلة لهذا المنتج بعد.", "No keys found for this product.")}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ==================================================== */}
          {/* SECTION 4: CUSTOMERS MANAGEMENT */}
          {/* ==================================================== */}
          {activeSection === "customers" && (
            <div className="admin-view-block">
              <div className="section-toolbar-row">
                <div className="toolbar-search">
                  <Search size={18} />
                  <input
                    type="text"
                    value={customerSearch}
                    onChange={(e) => {
                      setCustomerSearch(e.target.value);
                      loadCustomers(e.target.value);
                    }}
                    placeholder={t("بحث في العملاء بالبريد الإلكتروني...", "Search customers by email address...")}
                  />
                </div>
                <button className="btn-secondary" onClick={() => loadCustomers(customerSearch)}>
                  <RefreshCw size={15} className={loadingCustomers ? "spin" : ""} /> {t("تحديث القائمة", "Refresh")}
                </button>
              </div>

              {/* Customers Table */}
              <div className="admin-table-container">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>{t("العميل (البريد الإلكتروني)", "Customer (Email)")}</th>
                      <th>{t("المنتجات المملوكة", "Products")}</th>
                      <th>{t("التراخيص النشطة", "Active Licenses")}</th>
                      <th>{t("تاريخ أول انضمام", "Joined Date")}</th>
                      <th>{t("آخر نشاط", "Last Activity")}</th>
                      <th>{t("الإجراءات", "Actions")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {customers.length ? (
                      customers.map((c) => (
                        <tr key={c.email}>
                          <td>
                            <div className="table-customer-cell">
                              <span className="customer-avatar-badge">{c.email.slice(0, 2).toUpperCase()}</span>
                              <strong>{c.email}</strong>
                            </div>
                          </td>
                          <td><span className="badge-tag">{c.products_count}</span></td>
                          <td><strong className="stock-count">{c.active_licenses}</strong></td>
                          <td>{c.first_joined ? new Date(c.first_joined).toLocaleDateString(ar ? "ar-SA" : "en-US") : "-"}</td>
                          <td>{c.last_activity ? new Date(c.last_activity).toLocaleDateString(ar ? "ar-SA" : "en-US") : "-"}</td>
                          <td>
                            <button
                              className="btn-primary small"
                              onClick={() => openCustomerDetails(c.email)}
                            >
                              <UserRound size={14} /> {t("عرض الملف الإداري", "View Profile")}
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="table-empty-cell">
                          {loadingCustomers ? t("جارٍ التحميل...", "Loading...") : t("لا يوجد عملاء مطابقين للبحث.", "No customers found.")}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ==================================================== */}
          {/* SECTION 5: ORDERS & FULFILLMENT */}
          {/* ==================================================== */}
          {activeSection === "orders" && (
            <div className="admin-view-block">
              <div className="section-toolbar-row">
                <h3>{t("سجل الطلبات والتسليم", "Orders & Fulfillment Center")}</h3>
                <button
                  className="btn-primary"
                  onClick={() => setShowCreateOrderModal(true)}
                >
                  <Plus size={16} /> {t("إنشاء طلب جديد", "Create New Order")}
                </button>
              </div>

              <div className="admin-table-container">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>{t("رقم الطلب", "Order #")}</th>
                      <th>{t("العميل", "Customer")}</th>
                      <th>{t("المنتج", "Product")}</th>
                      <th>{t("الكمية", "Qty")}</th>
                      <th>{t("الحالة", "Status")}</th>
                      <th>{t("المفاتيح المسلّمة", "Assigned Keys")}</th>
                      <th>{t("التاريخ", "Date")}</th>
                      <th>{t("الإجراءات", "Actions")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ordersList.length ? (
                      ordersList.map((o) => (
                        <tr key={o.id}>
                          <td><strong>{o.order_number}</strong></td>
                          <td>
                            <div>
                              <span>{o.customer_email}</span>
                              {o.customer_name && <small className="block-muted">{o.customer_name}</small>}
                            </div>
                          </td>
                          <td>{o.product_name || o.product_id}</td>
                          <td>{o.quantity}</td>
                          <td>
                            <span className={`status-badge ${o.status === "FULFILLED" ? "green" : o.status === "PAID" ? "blue" : "orange"}`}>
                              {o.status}
                            </span>
                          </td>
                          <td>
                            {o.assigned_keys?.length ? (
                              <div className="keys-chips-list">
                                {o.assigned_keys.map((k, i) => (
                                  <code key={i} className="chip-key">{k}</code>
                                ))}
                              </div>
                            ) : (
                              <span className="text-muted">{t("لم يُسلّم بعد", "None")}</span>
                            )}
                          </td>
                          <td>{new Date(o.created_at).toLocaleDateString(ar ? "ar-SA" : "en-US")}</td>
                          <td>
                            {o.status !== "FULFILLED" ? (
                              <button
                                className="btn-primary small"
                                onClick={() => handleIssueKey(o.id)}
                                disabled={busy}
                              >
                                <KeyRound size={13} /> {t("تخصيص وتسليم مفتاح", "Issue Key")}
                              </button>
                            ) : (
                              <span className="check-done"><Check size={16} /> {t("مكتمل", "Fulfilled")}</span>
                            )}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={8} className="table-empty-cell">
                          {t("لا توجد طلبات مسجلة بعد.", "No orders recorded yet.")}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ==================================================== */}
          {/* SECTION 6: COMPENSATIONS */}
          {/* ==================================================== */}
          {activeSection === "compensations" && (
            <div className="admin-view-block">
              <div className="section-toolbar-row">
                <div>
                  <h3>{t("نظام التعويضات والاستبدال", "Customer Compensations System")}</h3>
                  <p>{t("إصدار مفاتيح بديلة أو تمديد تراخيص للعملاء مع توثيق الأسباب والموظف المسؤول.", "Grant replacement keys or license extensions with full administrative accountability.")}</p>
                </div>
                <button
                  className="btn-primary"
                  onClick={() => setShowCompensationModal(true)}
                >
                  <Plus size={16} /> {t("تسجيل تعويض جديد", "Issue Compensation")}
                </button>
              </div>

              <div className="admin-table-container">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>{t("الرقم المرجعي", "Reference #")}</th>
                      <th>{t("العميل", "Customer")}</th>
                      <th>{t("نوع التعويض", "Type")}</th>
                      <th>{t("التفاصيل", "Details")}</th>
                      <th>{t("السبب الإداري", "Reason")}</th>
                      <th>{t("الموظف المنفذ", "Issued By")}</th>
                      <th>{t("التاريخ", "Date")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dashboardStats?.compensations?.length ? (
                      dashboardStats.compensations.map((c: Compensation) => (
                        <tr key={c.id}>
                          <td><strong>{c.reference_number}</strong></td>
                          <td>{c.customer_email}</td>
                          <td><span className="badge-tag">{c.compensation_type}</span></td>
                          <td>{c.details}</td>
                          <td>{c.reason}</td>
                          <td><small>{c.issued_by}</small></td>
                          <td>{new Date(c.created_at).toLocaleDateString(ar ? "ar-SA" : "en-US")}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={7} className="table-empty-cell">
                          {t("لا توجد سجلات تعويض حتى الآن.", "No compensation records found.")}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ==================================================== */}
          {/* SECTION 7: AUDIT LOGS */}
          {/* ==================================================== */}
          {activeSection === "logs" && (
            <div className="admin-view-block">
              <div className="section-toolbar-row">
                <div className="log-filters-group">
                  <span className="filter-label"><Filter size={15} /> {t("التصنيف:", "Category:")}</span>
                  {["", "ADMIN", "REDEMPTION", "INVENTORY", "CUSTOMER", "ORDER", "SECURITY"].map((cat) => (
                    <button
                      key={cat}
                      className={`pill-filter-btn ${logsCategory === cat ? "active" : ""}`}
                      onClick={() => {
                        setLogsCategory(cat);
                        loadLogs(cat);
                      }}
                    >
                      {cat ? cat : t("الكل", "All")}
                    </button>
                  ))}
                </div>
                <button className="btn-secondary" onClick={() => loadLogs(logsCategory)}>
                  <RefreshCw size={15} className={loadingLogs ? "spin" : ""} /> {t("تحديث السجلات", "Refresh")}
                </button>
              </div>

              <div className="admin-table-container">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>{t("التصنيف", "Category")}</th>
                      <th>{t("العملية", "Action")}</th>
                      <th>{t("الفاعل (المستخدم/المدير)", "Actor")}</th>
                      <th>{t("الهدف", "Target")}</th>
                      <th>{t("التفاصيل", "Details")}</th>
                      <th>{t("عنوان IP", "IP Address")}</th>
                      <th>{t("الوقت والتاريخ", "Timestamp")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.length ? (
                      logs.map((l) => (
                        <tr key={l.id}>
                          <td><span className={`cat-pill ${l.category.toLowerCase()}`}>{l.category}</span></td>
                          <td><strong>{l.action}</strong></td>
                          <td>{l.actor_email}</td>
                          <td>{l.target_type ? `${l.target_type}:${l.target_id || ""}` : "-"}</td>
                          <td>
                            <code className="details-code">
                              {JSON.stringify(l.details || {})}
                            </code>
                          </td>
                          <td>{l.ip_address || "-"}</td>
                          <td>{new Date(l.created_at).toLocaleString(ar ? "ar-SA" : "en-US")}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={7} className="table-empty-cell">
                          {loadingLogs ? t("جارٍ التحميل...", "Loading logs...") : t("لا توجد سجلات مطابقة.", "No audit logs found.")}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ==================================================== */}
          {/* SECTION 8: SETTINGS & HEALTH */}
          {/* ==================================================== */}
          {activeSection === "settings" && (
            <div className="admin-view-block">
              <div className="settings-grid-layout">
                {/* 1. Health Card */}
                <div className="admin-card-panel">
                  <h3><Database size={18} /> {t("فحص استقرار الخادم وقاعدة البيانات", "System Health & Database Live")}</h3>
                  <p>{t("فحص الاتصال المباشر مع حاوية Postgres على Railway.", "Verify active live pool connectivity to Railway Postgres container.")}</p>

                  <div className="health-status-box">
                    <div className="status-indicator-row">
                      <span className={`health-dot ${dbStatus}`} />
                      <strong>PostgreSQL Railway Production:</strong>
                      <span className="health-label">{dbStatus === "ok" ? "ONLINE & OPERATIONAL" : dbStatus === "checking" ? "CHECKING..." : "UNAVAILABLE"}</span>
                    </div>
                    <button className="btn-secondary" onClick={handleCheckDatabase} disabled={dbStatus === "checking"}>
                      <RefreshCw size={15} className={dbStatus === "checking" ? "spin" : ""} /> {t("إجراء فحص فوري", "Run Ping Check")}
                    </button>
                  </div>
                </div>

                {/* 2. Platform Settings */}
                <div className="admin-card-panel">
                  <h3><Sliders size={18} /> {t("إعدادات المنصة العامة", "Platform Settings")}</h3>
                  <form
                    onSubmit={async (e) => {
                      e.preventDefault();
                      try {
                        await apiAction({ action: "updateSettings", settings: settingsState });
                        notify(t("تم حفظ الإعدادات بنجاح!", "Settings saved successfully!"));
                      } catch (err: any) {
                        notify(err.message, "error");
                      }
                    }}
                  >
                    <div className="form-field">
                      <label htmlFor="settings-site-name">{t("اسم المنصة", "Site Name")}</label>
                      <input
                        id="settings-site-name"
                        value={settingsState.site_name}
                        onChange={(e) => setSettingsState({ ...settingsState, site_name: e.target.value })}
                        required
                      />
                    </div>
                    <div className="form-field">
                      <label htmlFor="settings-desc">{t("وصف المنصة", "Platform Description")}</label>
                      <input
                        id="settings-desc"
                        value={settingsState.description}
                        onChange={(e) => setSettingsState({ ...settingsState, description: e.target.value })}
                      />
                    </div>
                    <div className="form-field">
                      <label htmlFor="settings-threshold">{t("حد التنبيه للمخزون المنخفض (مفاتيح)", "Low Stock Threshold (Keys)")}</label>
                      <input
                        id="settings-threshold"
                        type="number"
                        min={1}
                        max={100}
                        value={settingsState.low_stock_threshold}
                        onChange={(e) => setSettingsState({ ...settingsState, low_stock_threshold: Number(e.target.value) })}
                      />
                    </div>
                    <div className="form-switch-row">
                      <span>{t("وضع الصيانة (Maintenance Mode)", "Maintenance Mode")}</span>
                      <input
                        type="checkbox"
                        checked={settingsState.maintenance_mode}
                        onChange={(e) => setSettingsState({ ...settingsState, maintenance_mode: e.target.checked })}
                      />
                    </div>
                    <button className="btn-primary" type="submit" disabled={busy}>
                      {t("حفظ الإعدادات", "Save Settings")}
                    </button>
                  </form>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* ==================================================== */}
      {/* MODAL 1: ADD / EDIT PRODUCT */}
      {/* ==================================================== */}
      {showProductModal && (
        <div className="modal-backdrop">
          <div className="modal-card large">
            <div className="modal-header">
              <h3>{editingProduct ? t("تعديل بيانات المنتج", "Edit Product") : t("إضافة منتج رقمي جديد", "Add New Digital Product")}</h3>
              <button className="modal-close" onClick={() => setShowProductModal(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleSaveProduct} className="modal-form">
              <div className="form-row-2">
                <div className="form-field">
                  <label htmlFor="prod-name-ar">{t("اسم المنتج (بالعربية) *", "Product Name (Arabic) *")}</label>
                  <input
                    id="prod-name-ar"
                    value={productForm.name}
                    onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                    required
                    maxLength={120}
                  />
                </div>
                <div className="form-field">
                  <label htmlFor="prod-name-en">{t("اسم المنتج (بالإنجليزية)", "Product Name (English)")}</label>
                  <input
                    id="prod-name-en"
                    value={productForm.nameEn}
                    onChange={(e) => setProductForm({ ...productForm, nameEn: e.target.value })}
                    maxLength={120}
                    dir="ltr"
                  />
                </div>
              </div>

              <div className="form-row-2">
                <div className="form-field">
                  <label htmlFor="prod-cat">{t("التصنيف", "Category")}</label>
                  <input
                    id="prod-cat"
                    value={productForm.category}
                    onChange={(e) => setProductForm({ ...productForm, category: e.target.value })}
                  />
                </div>
                <div className="form-field">
                  <label htmlFor="prod-duration">{t("المدة الافتراضية للترخيص", "Default License Duration")}</label>
                  <select
                    id="prod-duration"
                    value={productForm.defaultDurationDays}
                    onChange={(e) => setProductForm({ ...productForm, defaultDurationDays: Number(e.target.value) })}
                  >
                    <option value={1}>{t("يوم واحد", "1 Day")}</option>
                    <option value={7}>{t("7 أيام", "7 Days")}</option>
                    <option value={30}>{t("30 يوماً (شهر)", "30 Days (1 Month)")}</option>
                    <option value={90}>{t("90 يوماً (3 أشهر)", "90 Days")}</option>
                    <option value={365}>{t("سنة واحدة", "1 Year")}</option>
                    <option value={3650}>{t("مدى الحياة", "Lifetime")}</option>
                  </select>
                </div>
              </div>

              <div className="form-field">
                <label htmlFor="prod-desc">{t("الوصف الموجز", "Description")}</label>
                <textarea
                  id="prod-desc"
                  rows={3}
                  value={productForm.description}
                  onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                  maxLength={2000}
                />
              </div>

              <div className="form-row-2">
                <div className="form-field">
                  <label htmlFor="prod-access-url">{t("رابط الوصول / التحميل (اختياري)", "Access / Download URL (Optional)")}</label>
                  <input
                    id="prod-access-url"
                    type="url"
                    value={productForm.accessUrl}
                    onChange={(e) => setProductForm({ ...productForm, accessUrl: e.target.value })}
                    placeholder="https://example.com/download"
                    dir="ltr"
                  />
                </div>
                <div className="form-field">
                  <label htmlFor="prod-image-url">{t("رابط صورة الغلاف (HTTPS)", "Cover Image URL (HTTPS)")}</label>
                  <input
                    id="prod-image-url"
                    type="url"
                    value={productForm.imageUrl}
                    onChange={(e) => setProductForm({ ...productForm, imageUrl: e.target.value })}
                    placeholder="https://.../cover.png"
                    dir="ltr"
                  />
                </div>
              </div>

              <div className="form-field">
                <label htmlFor="prod-instructions">{t("تعليمات الاستخدام والتشغيل للمشتركين", "Operating Instructions for Subscribers")}</label>
                <textarea
                  id="prod-instructions"
                  rows={4}
                  value={productForm.instructions}
                  onChange={(e) => setProductForm({ ...productForm, instructions: e.target.value })}
                  placeholder={t("اكتب خطوات التشغيل ومتطلبات التثبيت التي تظهر للعميل بعد التفعيل...", "Write operating steps and installation instructions...")}
                />
              </div>

              <div className="form-switch-row">
                <span>{t("إظهار المنتج في مكتبة وقوائم العملاء", "Make Visible to Customers")}</span>
                <input
                  type="checkbox"
                  checked={productForm.isVisible}
                  onChange={(e) => setProductForm({ ...productForm, isVisible: e.target.checked })}
                />
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-ghost" onClick={() => setShowProductModal(false)}>
                  {t("إلغاء", "Cancel")}
                </button>
                <button type="submit" className="btn-primary" disabled={busy}>
                  {busy ? <LoaderCircle className="spin" size={16} /> : <Check size={16} />}
                  {t("حفظ المنتج", "Save Product")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* DRAWER: CUSTOMER PROFILE & ACTIONS */}
      {/* ==================================================== */}
      {showCustomerDrawer && customerDetails && (
        <div className="drawer-backdrop" onClick={() => setShowCustomerDrawer(false)}>
          <div className="drawer-card" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-header">
              <div className="drawer-user-info">
                <span className="drawer-avatar">{selectedCustomer?.slice(0, 2).toUpperCase()}</span>
                <div>
                  <h3>{selectedCustomer}</h3>
                  <small>{t("ملف العميل الإداري", "Customer Administrative Profile")}</small>
                </div>
              </div>
              <button className="modal-close" onClick={() => setShowCustomerDrawer(false)}><X size={18} /></button>
            </div>

            <div className="drawer-actions-bar">
              <button
                className="btn-primary small"
                onClick={() => {
                  setGrantProductId(products[0]?.id || "");
                  setShowGrantModal(true);
                }}
              >
                <Plus size={14} /> {t("منح ترخيص مباشر", "Grant License")}
              </button>
            </div>

            <div className="drawer-sections-content">
              <h4>{t("المنتجات والتراخيص المفعلة", "Active Entitlements")} ({customerDetails.licenses?.length || 0})</h4>
              <div className="drawer-licenses-list">
                {customerDetails.licenses?.length ? (
                  customerDetails.licenses.map((lic: any) => (
                    <div className="drawer-license-item" key={lic.id}>
                      <div className="lic-top">
                        <strong>{lic.product_name}</strong>
                        <span className={`status-badge ${lic.calculated_status === "ACTIVE" ? "green" : "orange"}`}>
                          {lic.calculated_status}
                        </span>
                      </div>
                      <div className="lic-details">
                        <small>{t("الرمز المقنع:", "Key:")} <code>{lic.masked_code || lic.code_suffix}</code></small>
                        <small>{t("تاريخ التفعيل:", "Activated:")} {new Date(lic.redeemed_at).toLocaleDateString(ar ? "ar-SA" : "en-US")}</small>
                        <small>{t("تاريخ الانتهاء:", "Expires:")} {lic.expires_at ? new Date(lic.expires_at).toLocaleDateString(ar ? "ar-SA" : "en-US") : t("مدى الحياة", "Lifetime")}</small>
                      </div>
                      <div className="lic-actions">
                        <button
                          className="btn-ghost small"
                          onClick={() => {
                            setExtendLicenseId(lic.id);
                            setShowExtendModal(true);
                          }}
                        >
                          <Clock size={13} /> {t("تمديد الصلاحية", "Extend")}
                        </button>
                        <button
                          className="btn-ghost small danger"
                          onClick={() => handleSuspendLicense(lic.id)}
                        >
                          <Trash2 size={13} /> {t("إلغاء الترخيص", "Revoke")}
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="empty-notice">{t("لا توجد منتجات مفعلة لهذا الحساب بعد.", "No products activated for this customer yet.")}</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* MODAL 2: GRANT DIRECT LICENSE */}
      {/* ==================================================== */}
      {showGrantModal && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <div className="modal-header">
              <h3>{t("منح ترخيص مباشر للعميل", "Grant Direct License")}</h3>
              <button className="modal-close" onClick={() => setShowGrantModal(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleGrantLicense} className="modal-form">
              <p>{t(`سيتم إضافة المنتج فوراً إلى مكتبة العميل (${selectedCustomer}) دون استهلاك مفتاح مخزون.`, `Product will be granted directly to customer (${selectedCustomer}) without consuming key stock.`)}</p>
              <div className="form-field">
                <label htmlFor="grant-product-select">{t("المنتج المطلوب", "Product")}</label>
                <select id="grant-product-select" value={grantProductId} onChange={(e) => setGrantProductId(e.target.value)} required>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-field">
                <label htmlFor="grant-duration-select">{t("المدة", "Duration")}</label>
                <select id="grant-duration-select" value={grantDuration} onChange={(e) => setGrantDuration(Number(e.target.value))}>
                  <option value={7}>{t("7 أيام", "7 Days")}</option>
                  <option value={30}>{t("30 يوماً", "30 Days")}</option>
                  <option value={90}>{t("90 يوماً", "90 Days")}</option>
                  <option value={365}>{t("سنة", "1 Year")}</option>
                  <option value={3650}>{t("مدى الحياة", "Lifetime")}</option>
                </select>
              </div>
              <div className="form-field">
                <label htmlFor="grant-reason-input">{t("سبب المنح (للتوثيق الإداري)", "Reason (Audit Record)")}</label>
                <input
                  id="grant-reason-input"
                  value={grantReason}
                  onChange={(e) => setGrantReason(e.target.value)}
                  placeholder={t("مثال: ترقية خاصة، شراء يدوي، اختبار...", "e.g. VIP upgrade, manual payment...")}
                  required
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-ghost" onClick={() => setShowGrantModal(false)}>{t("إلغاء", "Cancel")}</button>
                <button type="submit" className="btn-primary" disabled={busy}>{t("تأكيد المنح", "Confirm Grant")}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* MODAL 3: EXTEND LICENSE */}
      {/* ==================================================== */}
      {showExtendModal && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <div className="modal-header">
              <h3>{t("تمديد مدة الترخيص", "Extend License Duration")}</h3>
              <button className="modal-close" onClick={() => setShowExtendModal(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleExtendLicense} className="modal-form">
              <div className="form-field">
                <label htmlFor="extend-days-select">{t("عدد الأيام الإضافية", "Additional Days")}</label>
                <select id="extend-days-select" value={extendDays} onChange={(e) => setExtendDays(Number(e.target.value))}>
                  <option value={7}>{t("إضافة 7 أيام", "Add 7 Days")}</option>
                  <option value={14}>{t("إضافة 14 يوماً", "Add 14 Days")}</option>
                  <option value={30}>{t("إضافة 30 يوماً (شهر)", "Add 30 Days")}</option>
                  <option value={90}>{t("إضافة 90 يوماً", "Add 90 Days")}</option>
                  <option value={365}>{t("إضافة سنة كاملة", "Add 1 Year")}</option>
                </select>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-ghost" onClick={() => setShowExtendModal(false)}>{t("إلغاء", "Cancel")}</button>
                <button type="submit" className="btn-primary" disabled={busy}>{t("تأكيد التمديد", "Confirm Extension")}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* MODAL 4: CREATE ORDER */}
      {/* ==================================================== */}
      {showCreateOrderModal && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <div className="modal-header">
              <h3>{t("تسجيل طلب شراء جديد", "Create Customer Order")}</h3>
              <button className="modal-close" onClick={() => setShowCreateOrderModal(false)}><X size={18} /></button>
            </div>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                try {
                  await apiAction({ action: "createOrder", ...orderForm });
                  notify(t("تم إنشاء الطلب بنجاح!", "Order created successfully!"));
                  setShowCreateOrderModal(false);
                  const ordersRes = await fetch("/api/portal?view=admin-orders");
                  if (ordersRes.ok) {
                    const data = await ordersRes.json();
                    setOrdersList(data.orders || []);
                  }
                  await onRefresh();
                } catch (err: any) {
                  notify(err.message, "error");
                }
              }}
              className="modal-form"
            >
              <div className="form-field">
                <label htmlFor="order-cust-email">{t("بريد العميل *", "Customer Email *")}</label>
                <input
                  id="order-cust-email"
                  type="email"
                  value={orderForm.customerEmail}
                  onChange={(e) => setOrderForm({ ...orderForm, customerEmail: e.target.value })}
                  required
                  dir="ltr"
                />
              </div>
              <div className="form-field">
                <label htmlFor="order-cust-name">{t("اسم العميل (اختياري)", "Customer Name")}</label>
                <input
                  id="order-cust-name"
                  value={orderForm.customerName}
                  onChange={(e) => setOrderForm({ ...orderForm, customerName: e.target.value })}
                />
              </div>
              <div className="form-field">
                <label htmlFor="order-prod-select">{t("المنتج المطلوب", "Product")}</label>
                <select
                  id="order-prod-select"
                  value={orderForm.productId}
                  onChange={(e) => setOrderForm({ ...orderForm, productId: e.target.value })}
                  required
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-ghost" onClick={() => setShowCreateOrderModal(false)}>{t("إلغاء", "Cancel")}</button>
                <button type="submit" className="btn-primary" disabled={busy}>{t("إنشاء الطلب", "Create Order")}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* MODAL 5: CREATE COMPENSATION */}
      {/* ==================================================== */}
      {showCompensationModal && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <div className="modal-header">
              <h3>{t("تسجيل تعويض عميل", "Record Customer Compensation")}</h3>
              <button className="modal-close" onClick={() => setShowCompensationModal(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleCreateCompensation} className="modal-form">
              <div className="form-field">
                <label htmlFor="comp-cust-email">{t("بريد العميل *", "Customer Email *")}</label>
                <input
                  id="comp-cust-email"
                  type="email"
                  value={compForm.customerEmail}
                  onChange={(e) => setCompForm({ ...compForm, customerEmail: e.target.value })}
                  required
                  dir="ltr"
                />
              </div>
              <div className="form-field">
                <label htmlFor="comp-prod-select">{t("المنتج المرتبط", "Associated Product")}</label>
                <select
                  id="comp-prod-select"
                  value={compForm.originalProductId}
                  onChange={(e) => setCompForm({ ...compForm, originalProductId: e.target.value })}
                  required
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-field">
                <label htmlFor="comp-type-select">{t("نوع التعويض", "Compensation Type")}</label>
                <select
                  id="comp-type-select"
                  value={compForm.compensationType}
                  onChange={(e) => setCompForm({ ...compForm, compensationType: e.target.value as any })}
                >
                  <option value="REPLACEMENT_KEY">{t("مفتاح بديل (Replacement Key)", "Replacement Key")}</option>
                  <option value="EXTEND_LICENSE">{t("تمديد ترخيص حالي (Extend License)", "Extend License")}</option>
                  <option value="DIRECT_GRANT">{t("منح نسخة إضافية (Direct Grant)", "Direct Grant")}</option>
                </select>
              </div>
              <div className="form-field">
                <label htmlFor="comp-reason-input">{t("سبب التعويض *", "Reason *")}</label>
                <input
                  id="comp-reason-input"
                  value={compForm.reason}
                  onChange={(e) => setCompForm({ ...compForm, reason: e.target.value })}
                  placeholder={t("مثال: تعطل المفتاح السابق، مشكلة في التفعيل...", "e.g. Broken key, activation issue...")}
                  required
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-ghost" onClick={() => setShowCompensationModal(false)}>{t("إلغاء", "Cancel")}</button>
                <button type="submit" className="btn-primary" disabled={busy}>{t("تسجيل التعويض", "Record Compensation")}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
