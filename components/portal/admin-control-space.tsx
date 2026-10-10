"use client";

import { useState, useMemo, useEffect, useRef, type FormEvent } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  ExternalLink,
  Eye,
  EyeOff,
  FileText,
  Flame,
  Gift,
  KeyRound,
  LoaderCircle,
  Mail,
  Menu,
  Package,
  Plus,
  RefreshCw,
  Search,
  Send,
  ShieldAlert,
  ShieldCheck,
  Sliders,
  Trash2,
  UserCheck,
  Users,
  Volume2,
  VolumeX,
  X,
  type LucideIcon,
} from "lucide-react";
import type {
  Product,
  LicenseKey,
  Order,
  Compensation,
  Guide,
  SystemSettings,
  Customer,
  ProductFile,
} from "@/lib/store";
import { notify as notifyMgr } from "@/lib/notify";
import { ConfirmModal } from "@/components/ui/confirm-modal";

export type AdminSection =
  | "products"
  | "products-current"
  | "customers"
  | "search-customer"
  | "logs-activations"
  | "logs-logins";

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

  const [activeSection, setActiveSection] = useState<AdminSection>("products");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // Notification helper
  function notify(message: string, type: "success" | "error" = "success") {
    if (type === "success") {
      notifyMgr.success(t("نجاح", "Success"), message);
    } else {
      notifyMgr.error(t("تنبيه", "Notice"), message);
    }
  }

  // Confirmation Modal State
  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    variant?: "danger" | "warning" | "primary";
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => {},
  });

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

  // ====================================================
  // 1. CUSTOMERS MANAGEMENT & REAL-TIME SEARCH ENGINE
  // ====================================================
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [customerSearch, setCustomerSearch] = useState("");
  const [customerStatusFilter, setCustomerStatusFilter] = useState("ALL");
  const [customerPage, setCustomerPage] = useState(1);
  const [customerTotalPages, setCustomerTotalPages] = useState(1);
  const [customerTotalCount, setCustomerTotalCount] = useState(0);
  const [showCustomerDrawer, setShowCustomerDrawer] = useState(false);
  const [customerDetails, setCustomerDetails] = useState<any | null>(null);
  const customerAbortRef = useRef<AbortController | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  async function loadCustomers(search = "", status = "ALL", page = 1) {
    if (customerAbortRef.current) {
      customerAbortRef.current.abort();
    }
    const controller = new AbortController();
    customerAbortRef.current = controller;

    setLoadingCustomers(true);
    try {
      const res = await fetch(
        `/api/portal?view=admin-customers&search=${encodeURIComponent(search.trim())}&status=${encodeURIComponent(status)}&page=${page}&limit=15`,
        { signal: controller.signal }
      );
      if (res.ok) {
        const data = await res.json();
        setCustomers(data.customers || []);
        setCustomerTotalCount(data.total || 0);
        setCustomerTotalPages(data.totalPages || 1);
      }
    } catch (err: any) {
      if (err.name !== "AbortError") {
        notify(t("فشل تحميل العملاء", "Failed to load customers"), "error");
      }
    } finally {
      if (customerAbortRef.current === controller) {
        setLoadingCustomers(false);
      }
    }
  }

  // Debounced search effect
  useEffect(() => {
    if (activeSection === "customers" || activeSection === "search-customer") {
      if (activeSection === "search-customer") {
        setTimeout(() => searchInputRef.current?.focus(), 150);
      }
      const timer = setTimeout(() => {
        loadCustomers(customerSearch, customerStatusFilter, customerPage);
      }, 250);
      return () => clearTimeout(timer);
    }
  }, [customerSearch, customerStatusFilter, customerPage, activeSection]);

  async function openCustomerDetails(identifier: string) {
    try {
      const res = await fetch(`/api/portal?view=admin-customer-details&id=${encodeURIComponent(identifier)}`);
      if (res.ok) {
        const data = await res.json();
        setCustomerDetails(data);
        setShowCustomerDrawer(true);
      } else {
        notify(t("تعذر فتح ملف العميل", "Failed to open customer details"), "error");
      }
    } catch {
      notify(t("فشل الاتصال بالخادم", "Connection to server failed"), "error");
    }
  }

  // Mute / Unmute customer action
  function handleToggleMuteCustomer(customer: Customer) {
    const isSuspended = customer.status === "SUSPENDED";
    const nextStatus = isSuspended ? "ACTIVE" : "SUSPENDED";
    const title = isSuspended ? t("فك كتم العميل", "Unmute Customer") : t("كتم العميل", "Mute Customer");
    const msg = isSuspended
      ? t(`هل تريد إلغاء كتم العميل (${customer.email}) وتنشيط حسابه؟`, `Unmute customer (${customer.email}) and restore account access?`)
      : t(`هل تريد كتم العميل (${customer.email}) وإيقاف وصوله للخدمات مؤقتاً؟`, `Mute customer (${customer.email}) and temporarily suspend access?`);

    setConfirmState({
      isOpen: true,
      title,
      message: msg,
      variant: isSuspended ? "primary" : "warning",
      confirmText: title,
      onConfirm: async () => {
        setConfirmState((prev) => ({ ...prev, isOpen: false }));
        try {
          await apiAction({
            action: "updateCustomerStatus",
            email: customer.email,
            status: nextStatus,
            notes: isSuspended ? "تم فك الكتم بواسطة الإدارة" : "تم كتم العميل بواسطة الإدارة",
          });
          notify(isSuspended ? t("تم فك كتم العميل بنجاح", "Customer unmuted") : t("تم كتم العميل بنجاح", "Customer muted"));
          if (customerDetails?.customer?.email === customer.email) {
            setCustomerDetails((prev: any) => ({
              ...prev,
              customer: { ...prev.customer, status: nextStatus },
            }));
          }
          await loadCustomers(customerSearch, customerStatusFilter, customerPage);
        } catch (err: any) {
          notify(err.message || t("فشلت العملية", "Action failed"), "error");
        }
      },
    });
  }

  // Send message / email to customer
  const [messageModalState, setMessageModalState] = useState<{
    isOpen: boolean;
    customerEmail: string;
    customerName?: string;
    subject: string;
    message: string;
  }>({
    isOpen: false,
    customerEmail: "",
    customerName: "",
    subject: "",
    message: "",
  });

  async function handleSendMessage(e: FormEvent) {
    e.preventDefault();
    if (!messageModalState.customerEmail || !messageModalState.message.trim()) return;
    try {
      await apiAction({
        action: "sendCustomerMessage",
        customerEmail: messageModalState.customerEmail,
        subject: messageModalState.subject || "رسالة من إدارة SpooFX",
        message: messageModalState.message,
      });
      notify(t("تم إرسال الرسالة إلى بريد العميل بنجاح!", "Message sent to customer email successfully!"));
      setMessageModalState({ isOpen: false, customerEmail: "", customerName: "", subject: "", message: "" });
    } catch (err: any) {
      notify(err.message || t("فشل إرسال الرسالة", "Failed to send message"), "error");
    }
  }

  // ====================================================
  // 2. PRODUCTS STATE & ACTIONS
  // ====================================================
  const [productSearch, setProductSearch] = useState("");
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productForm, setProductForm] = useState<{
    name: string;
    nameEn: string;
    description: string;
    category: string;
    accessUrl: string;
    imageUrl: string;
    instructions: string;
    defaultDurationDays: number;
    isVisible: boolean;
    isActive: boolean;
    files: ProductFile[];
  }>({
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
    files: [],
  });

  // Product files sub-state
  const [newFileName, setNewFileName] = useState("");
  const [newFileUrl, setNewFileUrl] = useState("");
  const [newFileSize, setNewFileSize] = useState("");

  function handleAddFileToProduct() {
    if (!newFileName.trim() || !newFileUrl.trim()) return;
    const newFile: ProductFile = {
      id: "file_" + Date.now(),
      name: newFileName.trim(),
      url: newFileUrl.trim(),
      size: newFileSize.trim() || undefined,
      uploaded_at: new Date().toISOString(),
    };
    setProductForm((prev) => ({
      ...prev,
      files: [...prev.files, newFile],
    }));
    setNewFileName("");
    setNewFileUrl("");
    setNewFileSize("");
  }

  function handleRemoveFileFromProduct(fileId: string) {
    setProductForm((prev) => ({
      ...prev,
      files: prev.files.filter((f) => f.id !== fileId),
    }));
  }

  function openEditProduct(p: Product) {
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
      files: Array.isArray(p.files) ? p.files : [],
    });
    setShowProductModal(true);
  }

  function openAddProduct() {
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
      files: [],
    });
    setShowProductModal(true);
  }

  async function handleSaveProduct(e: FormEvent) {
    e.preventDefault();
    try {
      await apiAction({
        action: editingProduct ? "updateProduct" : "createProduct",
        id: editingProduct?.id,
        ...productForm,
      });
      notify(t(editingProduct ? "تم تحديث المنتج بنجاح!" : "تمت إضافة المنتج بنجاح!", editingProduct ? "Product updated!" : "Product created!"));
      setShowProductModal(false);
      setEditingProduct(null);
      await onRefresh();
    } catch (err: any) {
      notify(err.message, "error");
    }
  }

  // Toggle Visibility (إخفاء / إظهار)
  async function handleToggleVisibility(product: Product) {
    const nextVis = !product.is_visible;
    try {
      await apiAction({
        action: "toggleProductVisibility",
        id: product.id,
        isVisible: nextVis,
      });
      notify(nextVis ? t("تم إظهار المنتج للعملاء في المتجر", "Product is now visible") : t("تم إخفاء المنتج عن العملاء", "Product is now hidden"));
      await onRefresh();
    } catch (err: any) {
      notify(err.message || t("فشل تحديث الظهور", "Failed to toggle visibility"), "error");
    }
  }

  // Delete Product Permanently (حذف)
  function handleDeleteProduct(product: Product) {
    setConfirmState({
      isOpen: true,
      title: t("حذف المنتج نهائياً", "Delete Product"),
      message: t(
        `هل أنت متأكد من حذف المنتج "${product.name}" نهائياً؟ سيتم حذف جميع التراخيص والبيانات التابعة له.`,
        `Are you sure you want to permanently delete "${product.name}" and its associated licenses?`
      ),
      variant: "danger",
      confirmText: t("تأكيد الحذف", "Delete Now"),
      onConfirm: async () => {
        setConfirmState((prev) => ({ ...prev, isOpen: false }));
        try {
          await apiAction({ action: "deleteProduct", id: product.id });
          notify(t("تم حذف المنتج بنجاح", "Product deleted successfully"));
          await onRefresh();
        } catch (err: any) {
          notify(err.message || t("فشل حذف المنتج", "Failed to delete product"), "error");
        }
      },
    });
  }

  // ====================================================
  // 3. INVENTORY & STOCK FILLING MODAL (تعبئة مخزون)
  // ====================================================
  const [showStockModal, setShowStockModal] = useState(false);
  const [stockModalProductId, setStockModalProductId] = useState<string>(products[0]?.id || "");
  const [stockMode, setStockMode] = useState<"generate" | "import">("generate");
  const [generateCount, setGenerateCount] = useState(10);
  const [generateDuration, setGenerateDuration] = useState(30);
  const [importKeysText, setImportKeysText] = useState("");
  const [newlyGenerated, setNewlyGenerated] = useState<string[]>([]);
  const [copiedKeys, setCopiedKeys] = useState(false);

  function openStockModal(productId?: string) {
    if (productId) setStockModalProductId(productId);
    else if (!stockModalProductId && products[0]) setStockModalProductId(products[0].id);
    setNewlyGenerated([]);
    setImportKeysText("");
    setShowStockModal(true);
  }

  async function handleFillStock(e: FormEvent) {
    e.preventDefault();
    if (!stockModalProductId) return;

    if (stockMode === "generate") {
      try {
        const res = await apiAction({
          action: "generateKeys",
          productId: stockModalProductId,
          count: generateCount,
          durationDays: generateDuration,
        });
        setNewlyGenerated(res.keys || []);
        notify(t(`تم توليد ${res.count} مفتاح بنجاح!`, `Generated ${res.count} keys successfully!`));
        await onRefresh();
      } catch (err: any) {
        notify(err.message, "error");
      }
    } else {
      const keyList = importKeysText
        .split("\n")
        .map((k) => k.trim())
        .filter((k) => k.length >= 8);

      if (!keyList.length) {
        notify(t("يرجى إدخال مفتاح واحد على الأقل", "Please enter at least one key"), "error");
        return;
      }

      try {
        const res = await apiAction({
          action: "importKeys",
          rawKeys: keyList,
          productId: stockModalProductId,
          durationDays: generateDuration,
        });
        notify(t(`تم استيراد ${res.importedCount} مفتاح جديد بنجاح!`, `Imported ${res.importedCount} keys successfully!`));
        setImportKeysText("");
        setShowStockModal(false);
        await onRefresh();
      } catch (err: any) {
        notify(err.message, "error");
      }
    }
  }

  function handleCopyGeneratedKeys() {
    if (!newlyGenerated.length) return;
    navigator.clipboard.writeText(newlyGenerated.join("\n"));
    setCopiedKeys(true);
    setTimeout(() => setCopiedKeys(false), 2000);
    notify(t("تم نسخ جميع المفاتيح!", "All keys copied!"));
  }

  // ====================================================
  // 4. COMPENSATIONS MODAL (التعويضات)
  // ====================================================
  const [showCompensationModal, setShowCompensationModal] = useState(false);
  const [compForm, setCompForm] = useState({
    customerEmail: "",
    originalProductId: products[0]?.id || "",
    compensationType: "REPLACEMENT_KEY" as Compensation["compensation_type"],
    details: "",
    reason: "",
  });

  function openCustomerCompensation(customer: Customer) {
    setCompForm({
      customerEmail: customer.email,
      originalProductId: products[0]?.id || "",
      compensationType: "REPLACEMENT_KEY",
      reason: "",
      details: "",
    });
    setShowCompensationModal(true);
  }

  async function handleCreateCompensation(e: FormEvent) {
    e.preventDefault();
    try {
      await apiAction({
        action: "createCompensation",
        ...compForm,
      });
      notify(t("تم تسجيل التعويض وتخصيصه للعميل بنجاح!", "Compensation registered successfully!"));
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

  // ====================================================
  // 5. KEY ACTIVATION LOGS (سجل تفعيل مفتاح)
  // ====================================================
  const [activationLogs, setActivationLogs] = useState<any[]>([]);
  const [loadingActivations, setLoadingActivations] = useState(false);
  const [activationSearch, setActivationSearch] = useState("");

  async function loadActivationLogs() {
    setLoadingActivations(true);
    try {
      const res = await fetch("/api/portal?view=admin-activations");
      if (res.ok) {
        const data = await res.json();
        setActivationLogs(data.logs || []);
      }
    } catch {
      notify(t("فشل تحميل سجل التفعيلات", "Failed to load activation logs"), "error");
    } finally {
      setLoadingActivations(false);
    }
  }

  const filteredActivationLogs = useMemo(() => {
    if (!activationSearch.trim()) return activationLogs;
    const q = activationSearch.toLowerCase().trim();
    return activationLogs.filter(
      (log) =>
        (log.product_name || "").toLowerCase().includes(q) ||
        (log.redeemed_by || "").toLowerCase().includes(q) ||
        (log.masked_code || "").toLowerCase().includes(q) ||
        (log.code_suffix || "").toLowerCase().includes(q)
    );
  }, [activationLogs, activationSearch]);

  // ====================================================
  // 6. LOGIN AUDIT LOGS (سجل تسجيل دخول)
  // ====================================================
  const [loginLogs, setLoginLogs] = useState<any[]>([]);
  const [loadingLogins, setLoadingLogins] = useState(false);
  const [loginSearch, setLoginSearch] = useState("");

  async function loadLoginLogs() {
    setLoadingLogins(true);
    try {
      const res = await fetch("/api/portal?view=admin-logins");
      if (res.ok) {
        const data = await res.json();
        setLoginLogs(data.logs || []);
      }
    } catch {
      notify(t("فشل تحميل سجل تسجيل الدخول", "Failed to load login logs"), "error");
    } finally {
      setLoadingLogins(false);
    }
  }

  const filteredLoginLogs = useMemo(() => {
    if (!loginSearch.trim()) return loginLogs;
    const q = loginSearch.toLowerCase().trim();
    return loginLogs.filter(
      (log) =>
        (log.actor_email || "").toLowerCase().includes(q) ||
        (log.customer_name || "").toLowerCase().includes(q)
    );
  }, [loginLogs, loginSearch]);

  // Section Loaders
  useEffect(() => {
    if (activeSection === "logs-activations") {
      void loadActivationLogs();
    } else if (activeSection === "logs-logins") {
      void loadLoginLogs();
    }
  }, [activeSection]);

  // Filtering products
  const filteredProducts = useMemo(() => {
    return products.filter((p) =>
      (p.name + (p.name_en || "") + (p.description || "") + (p.category || "")).toLowerCase().includes(productSearch.toLowerCase())
    );
  }, [products, productSearch]);

  // Navigation Items (Exact 6 items requested)
  const navItems = [
    {
      id: "products" as AdminSection,
      icon: Package,
      ar: "المنتجات",
      en: "Products",
      badge: products.length,
    },
    {
      id: "products-current" as AdminSection,
      icon: Sliders,
      ar: "المنتجات الحالية",
      en: "Current Products",
      badge: products.filter((p) => !p.is_archived).length,
    },
    {
      id: "customers" as AdminSection,
      icon: Users,
      ar: "العملاء",
      en: "Customers",
      badge: customerTotalCount || undefined,
    },
    {
      id: "search-customer" as AdminSection,
      icon: Search,
      ar: "البحث عن عميل",
      en: "Search Customer",
    },
    {
      id: "logs-activations" as AdminSection,
      icon: KeyRound,
      ar: "سجل تفعيل مفتاح",
      en: "Key Activations",
      badge: activationLogs.length || undefined,
    },
    {
      id: "logs-logins" as AdminSection,
      icon: ShieldCheck,
      ar: "سجل تسجيل دخول",
      en: "Login Audit",
    },
  ];

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
                <small>{t("مركز الإدارة والتحكم", "Control Space")}</small>
              </div>
            )}
          </div>
          <button
            className="collapse-btn"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            aria-label="Toggle Sidebar"
            title={t("طي/توسيع القائمة", "Toggle Sidebar")}
          >
            <Sliders size={16} />
          </button>
        </div>

        {/* Clean, Sleek Nav List (No Bloat Accordions) */}
        <nav className="sidebar-nav">
          <div className="nav-clean-list">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = activeSection === item.id;
              return (
                <button
                  key={item.id}
                  className={`sidebar-link ${active ? "active" : ""}`}
                  onClick={() => {
                    setActiveSection(item.id);
                    if (item.id === "search-customer") {
                      setTimeout(() => searchInputRef.current?.focus(), 150);
                    }
                    if (item.id === "customers") {
                      loadCustomers(customerSearch, customerStatusFilter, customerPage);
                    }
                    setMobileSidebarOpen(false);
                  }}
                  title={t(item.ar, item.en)}
                >
                  <Icon size={18} />
                  {!sidebarCollapsed && <span className="link-label">{t(item.ar, item.en)}</span>}
                  {!sidebarCollapsed && item.badge !== undefined && item.badge > 0 && (
                    <span className="badge-count">{item.badge}</span>
                  )}
                </button>
              );
            })}
          </div>
        </nav>

        <div className="sidebar-footer">
          <button className="exit-admin-btn" onClick={onExitAdmin} title={t("العودة لبوابة العملاء", "Back to Client Portal")}>
            <ArrowRight size={17} className={ar ? "rotate-180" : ""} />
            {!sidebarCollapsed && <span>{t("بوابة العملاء", "Client Portal")}</span>}
          </button>
        </div>
      </aside>

      {/* Main Admin Content Wrapper */}
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
                {t(
                  navItems.find((i) => i.id === activeSection)?.ar || "المنتجات",
                  navItems.find((i) => i.id === activeSection)?.en || "Products"
                )}
              </strong>
            </div>
          </div>

          <div className="topbar-right">
            <button className="topbar-btn" onClick={() => onRefresh()} title={t("تحديث البيانات", "Refresh Data")}>
              <RefreshCw size={16} className={busy ? "spin" : ""} />
              <span className="hidden-mobile">{t("تحديث", "Refresh")}</span>
            </button>
            <div className="user-pill-tag">
              <UserCheck size={14} />
              <span>{currentUser.split("@")[0]}</span>
            </div>
          </div>
        </header>

        {/* Dynamic Admin Body Views */}
        <main className="admin-scrollable-content">

          {/* ==================================================== */}
          {/* 1. PRODUCTS VIEW (المنتجات: اطلاع، إضافة، تعديل، تعبئة مخزون) */}
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
                <div className="action-buttons-group">
                  <button className="secondary-button" onClick={() => openStockModal()}>
                    <KeyRound size={16} /> {t("تعبئة المخزون", "Fill Stock")}
                  </button>
                  <button className="btn-primary" onClick={openAddProduct}>
                    <Plus size={16} /> {t("إضافة منتج جديد", "Add Product")}
                  </button>
                </div>
              </div>

              {/* Products Table */}
              <div className="admin-table-container">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>{t("المنتج", "Product")}</th>
                      <th>{t("التصنيف", "Category")}</th>
                      <th>{t("مدة الصلاحية", "Duration")}</th>
                      <th>{t("المخزون المتوفر", "Available Stock")}</th>
                      <th>{t("المستهلك", "Redeemed")}</th>
                      <th>{t("الحالة", "Status")}</th>
                      <th>{t("الإجراءات المباشرة", "Direct Actions")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProducts.length ? (
                      filteredProducts.map((p) => (
                        <tr key={p.id}>
                          <td className="table-product-cell">
                            {p.image_url ? (
                              <img src={p.image_url} alt="" className="table-thumb" />
                            ) : (
                              <div className="table-thumb-fallback">
                                <Package size={18} />
                              </div>
                            )}
                            <div>
                              <strong>{p.name}</strong>
                              <small>{p.name_en || p.category}</small>
                            </div>
                          </td>
                          <td><span className="badge-tag gray">{p.category || "General"}</span></td>
                          <td>{p.default_duration_days >= 3650 ? t("مدى الحياة", "Lifetime") : `${p.default_duration_days} ${t("يوم", "Days")}`}</td>
                          <td>
                            <span className={`stock-badge ${Number(p.available_keys || 0) > 0 ? "in-stock" : "out-of-stock"}`}>
                              <KeyRound size={13} /> {p.available_keys ?? 0}
                            </span>
                          </td>
                          <td><span className="badge-tag">{p.redeemed_keys ?? 0}</span></td>
                          <td>
                            <span className={`status-badge ${p.is_active ? "green" : "gray"}`}>
                              {p.is_active ? t("نشط", "Active") : t("معطل", "Inactive")}
                            </span>
                          </td>
                          <td>
                            <div className="action-buttons-group">
                              <button
                                className="btn-action primary"
                                onClick={() => openStockModal(p.id)}
                                title={t("تعبئة مخزون المفاتيح لهذا المنتج", "Fill Stock for this product")}
                              >
                                <KeyRound size={14} /> {t("تعبئة مخزون", "Fill Stock")}
                              </button>
                              <button
                                className="btn-action"
                                onClick={() => openEditProduct(p)}
                                title={t("تعديل المنتج", "Edit Product")}
                              >
                                <Sliders size={14} /> {t("تعديل", "Edit")}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={7} className="table-empty-cell">
                          {t("لا توجد منتجات مسجلة تطابق البحث.", "No products found matching search.")}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ==================================================== */}
          {/* 2. CURRENT PRODUCTS VIEW (المنتجات الحالية: إخفاء، إظهار، حذف، ضبط، ملفات) */}
          {/* ==================================================== */}
          {activeSection === "products-current" && (
            <div className="admin-view-block">
              <div className="section-toolbar-row">
                <div className="toolbar-search">
                  <Search size={18} />
                  <input
                    type="text"
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    placeholder={t("بحث في المنتجات الحالية...", "Search current products...")}
                  />
                </div>
                <button className="btn-primary" onClick={openAddProduct}>
                  <Plus size={16} /> {t("إضافة منتج", "Add Product")}
                </button>
              </div>

              <div className="admin-table-container">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>{t("المنتج الحالي", "Current Product")}</th>
                      <th>{t("العنوان (AR / EN)", "Title (AR / EN)")}</th>
                      <th>{t("الملفات وروابط التحميل", "Files & Downloads")}</th>
                      <th>{t("الظهور في المتجر", "Store Visibility")}</th>
                      <th>{t("الحالة", "Status")}</th>
                      <th>{t("التحكم والضبط والحذف", "Manage & Delete")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProducts.length ? (
                      filteredProducts.map((p) => (
                        <tr key={p.id}>
                          <td className="table-product-cell">
                            {p.image_url ? (
                              <img src={p.image_url} alt="" className="table-thumb" />
                            ) : (
                              <div className="table-thumb-fallback">
                                <Package size={18} />
                              </div>
                            )}
                            <div>
                              <strong>{p.name}</strong>
                              <small>{p.category || "General"}</small>
                            </div>
                          </td>
                          <td>
                            <div className="title-stack">
                              <span className="title-ar">{p.name}</span>
                              <span className="title-en">{p.name_en || "—"}</span>
                            </div>
                          </td>
                          <td>
                            <div className="files-summary-cell">
                              {Array.isArray(p.files) && p.files.length > 0 ? (
                                <span className="files-count-badge">
                                  <FileText size={13} /> {p.files.length} {t("ملفات مرفقة", "Files")}
                                </span>
                              ) : p.access_url ? (
                                <a href={p.access_url} target="_blank" rel="noreferrer" className="link-badge">
                                  <ExternalLink size={12} /> {t("رابط وصول مباشر", "Direct Link")}
                                </a>
                              ) : (
                                <span className="text-muted-tag">{t("لا توجد ملفات", "No files")}</span>
                              )}
                            </div>
                          </td>
                          <td>
                            <button
                              className={`visibility-toggle-btn ${p.is_visible !== false ? "visible" : "hidden"}`}
                              onClick={() => handleToggleVisibility(p)}
                              title={p.is_visible !== false ? t("انقر لإخفاء المنتج عن العملاء", "Click to hide from customers") : t("انقر لإظهار المنتج للعملاء", "Click to show to customers")}
                            >
                              {p.is_visible !== false ? (
                                <>
                                  <Eye size={14} /> <span>{t("ظاهر للعملاء", "Visible")}</span>
                                </>
                              ) : (
                                <>
                                  <EyeOff size={14} /> <span>{t("مخفي عن المتجر", "Hidden")}</span>
                                </>
                              )}
                            </button>
                          </td>
                          <td>
                            <span className={`status-badge ${p.is_active ? "green" : "gray"}`}>
                              {p.is_active ? t("نشط", "Active") : t("معطل", "Inactive")}
                            </span>
                          </td>
                          <td>
                            <div className="action-buttons-group">
                              <button
                                className="btn-action"
                                onClick={() => openEditProduct(p)}
                                title={t("تعديل العنوان والملفات وأشياء الضبط", "Edit Title, Files & Settings")}
                              >
                                <Sliders size={14} /> {t("تعديل الضبط", "Settings")}
                              </button>
                              <button
                                className="btn-action danger"
                                onClick={() => handleDeleteProduct(p)}
                                title={t("حذف المنتج نهائياً", "Delete Product")}
                              >
                                <Trash2 size={14} /> {t("حذف", "Delete")}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="table-empty-cell">
                          {t("لا توجد منتجات مسجلة.", "No registered products.")}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ==================================================== */}
          {/* 3. CUSTOMERS VIEW (العملاء: تعويض، تحقق، كتم، إرسال بريد) */}
          {/* ==================================================== */}
          {activeSection === "customers" && (
            <div className="admin-view-block">
              <div className="section-toolbar-row">
                <div className="toolbar-search">
                  <Search size={18} />
                  <input
                    type="text"
                    value={customerSearch}
                    onChange={(e) => setCustomerSearch(e.target.value)}
                    placeholder={t("بحث في العملاء بالبريد أو الاسم...", "Search customers by email or name...")}
                  />
                </div>
                <div className="filter-pills-row">
                  {["ALL", "ACTIVE", "SUSPENDED"].map((st) => (
                    <button
                      key={st}
                      className={`filter-pill ${customerStatusFilter === st ? "active" : ""}`}
                      onClick={() => setCustomerStatusFilter(st)}
                    >
                      {st === "ALL" ? t("الكل", "All") : st === "ACTIVE" ? t("نشط ومصرح", "Active") : t("مكتوم / محظور", "Muted")}
                    </button>
                  ))}
                  <button className="secondary-button" onClick={() => loadCustomers(customerSearch, customerStatusFilter, customerPage)}>
                    <RefreshCw size={14} className={loadingCustomers ? "spin" : ""} /> {t("تحديث", "Refresh")}
                  </button>
                </div>
              </div>

              {/* Customers Table */}
              <div className="admin-table-container">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>{t("العميل", "Customer")}</th>
                      <th>{t("الحالة", "Status")}</th>
                      <th>{t("التراخيص النشطة", "Active Licenses")}</th>
                      <th>{t("تاريخ التسجيل", "Joined")}</th>
                      <th>{t("آخر ظهور", "Last Active")}</th>
                      <th>{t("الإجراءات المطلوبة (تعويض / تحقق / كتم / بريد)", "Actions (Compensate / Verify / Mute / Email)")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {customers.length ? (
                      customers.map((c) => {
                        const isMuted = c.status === "SUSPENDED";
                        return (
                          <tr key={c.id}>
                            <td className="table-user-cell">
                              {c.image ? (
                                <img src={c.image} alt="" className="table-avatar" />
                              ) : (
                                <div className="table-avatar-fallback">
                                  {c.name ? c.name[0].toUpperCase() : c.email[0].toUpperCase()}
                                </div>
                              )}
                              <div>
                                <strong>{c.name || c.email.split("@")[0]}</strong>
                                <small dir="ltr">{c.email}</small>
                              </div>
                            </td>
                            <td>
                              <span className={`status-badge ${isMuted ? "danger" : "green"}`}>
                                {isMuted ? (
                                  <>
                                    <VolumeX size={12} /> {t("مكتوم / محظور", "Muted / Suspended")}
                                  </>
                                ) : (
                                  <>
                                    <ShieldCheck size={12} /> {t("نشط ومصرح", "Active")}
                                  </>
                                )}
                              </span>
                            </td>
                            <td>
                              <span className="badge-tag blue">
                                <KeyRound size={12} /> {c.active_licenses || 0} {t("تراخيص", "Licenses")}
                              </span>
                            </td>
                            <td>{new Date(c.created_at).toLocaleDateString(ar ? "ar-SA" : "en-US")}</td>
                            <td>{c.last_login_at ? new Date(c.last_login_at).toLocaleString(ar ? "ar-SA" : "en-US") : "—"}</td>
                            <td>
                              <div className="customer-actions-cluster">
                                {/* 1. تعويض */}
                                <button
                                  className="btn-action primary"
                                  onClick={() => openCustomerCompensation(c)}
                                  title={t("تعويض العميل بتمديد أو مفتاح بديل", "Compensate customer with replacement key or extension")}
                                >
                                  <Gift size={14} /> {t("تعويض", "Compensate")}
                                </button>

                                {/* 2. تحقق */}
                                <button
                                  className="btn-action"
                                  onClick={() => openCustomerDetails(c.id)}
                                  title={t("التحقق من ملف العميل وتراخيصه", "Verify & inspect customer profile and licenses")}
                                >
                                  <UserCheck size={14} /> {t("تحقق", "Verify")}
                                </button>

                                {/* 3. كتم / فك الكتم */}
                                <button
                                  className={`btn-action ${isMuted ? "success" : "danger"}`}
                                  onClick={() => handleToggleMuteCustomer(c)}
                                  title={isMuted ? t("فك كتم العميل وإعادة تنشيطه", "Unmute customer") : t("إعطاء كتم للعميل وإيقافه", "Mute customer")}
                                >
                                  {isMuted ? (
                                    <>
                                      <Volume2 size={14} /> {t("فك كتم", "Unmute")}
                                    </>
                                  ) : (
                                    <>
                                      <VolumeX size={14} /> {t("كتم", "Mute")}
                                    </>
                                  )}
                                </button>

                                {/* 4. إرسال رسالة على البريد */}
                                <button
                                  className="btn-action"
                                  onClick={() => setMessageModalState({
                                    isOpen: true,
                                    customerEmail: c.email,
                                    customerName: c.name,
                                    subject: "",
                                    message: "",
                                  })}
                                  title={t("إرسال رسالة مباشرة إلى بريد العميل", "Send email message directly to customer")}
                                >
                                  <Mail size={14} /> {t("إرسال بريد", "Send Email")}
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={6} className="table-empty-cell">
                          {loadingCustomers ? t("جاري تحميل العملاء...", "Loading customers...") : t("لا يوجد عملاء مطابقين.", "No matching customers found.")}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ==================================================== */}
          {/* 4. SEARCH CUSTOMER VIEW (البحث عن عميل) */}
          {/* ==================================================== */}
          {activeSection === "search-customer" && (
            <div className="admin-view-block search-customer-view">
              <div className="search-hero-box">
                <div className="search-hero-header">
                  <h2><Search size={22} /> {t("البحث المباشر عن عميل", "Instant Customer Search")}</h2>
                  <p>{t("ابحث بالبريد الإلكتروني أو الاسم أو المعرف للوصول السريع إلى إجراءات التعويض، التحقق، الكتم، والمراسلة.", "Lookup customer by email or name to perform direct compensation, verification, muting, or email.")}</p>
                </div>
                <div className="search-input-wrapper-lg">
                  <Search size={20} className="search-icon-lg" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={customerSearch}
                    onChange={(e) => setCustomerSearch(e.target.value)}
                    placeholder={t("اكتب البريد الإلكتروني أو اسم العميل للبحث الفوري...", "Enter customer email or name...")}
                    className="search-input-lg"
                  />
                  {customerSearch && (
                    <button className="search-clear-btn" onClick={() => setCustomerSearch("")}>
                      <X size={16} />
                    </button>
                  )}
                </div>
              </div>

              {/* Matching Customers Cards */}
              <div className="search-results-container">
                {customers.length > 0 ? (
                  <div className="customers-cards-grid">
                    {customers.map((c) => {
                      const isMuted = c.status === "SUSPENDED";
                      return (
                        <div className={`customer-vip-card ${isMuted ? "muted-card" : ""}`} key={c.id}>
                          <div className="vip-card-header">
                            <div className="vip-user-info">
                              {c.image ? (
                                <img src={c.image} alt="" className="vip-avatar" />
                              ) : (
                                <div className="vip-avatar-fallback">
                                  {c.name ? c.name[0].toUpperCase() : c.email[0].toUpperCase()}
                                </div>
                              )}
                              <div>
                                <h4>{c.name || c.email.split("@")[0]}</h4>
                                <span className="vip-email" dir="ltr">{c.email}</span>
                              </div>
                            </div>
                            <span className={`status-badge ${isMuted ? "danger" : "green"}`}>
                              {isMuted ? t("مكتوم / محظور", "Muted") : t("نشط", "Active")}
                            </span>
                          </div>

                          <div className="vip-card-stats">
                            <div className="stat-pill">
                              <small>{t("التراخيص النشطة", "Active Licenses")}</small>
                              <strong>{c.active_licenses || 0}</strong>
                            </div>
                            <div className="stat-pill">
                              <small>{t("إجمالي المنتجات", "Products")}</small>
                              <strong>{c.products_count || 0}</strong>
                            </div>
                            <div className="stat-pill">
                              <small>{t("آخر ظهور", "Last Active")}</small>
                              <strong>{c.last_login_at ? new Date(c.last_login_at).toLocaleDateString(ar ? "ar-SA" : "en-US") : "—"}</strong>
                            </div>
                          </div>

                          {/* Quick 4 Actions */}
                          <div className="vip-card-actions">
                            <button className="btn-action primary" onClick={() => openCustomerCompensation(c)}>
                              <Gift size={14} /> {t("تعويض", "Compensate")}
                            </button>
                            <button className="btn-action" onClick={() => openCustomerDetails(c.id)}>
                              <UserCheck size={14} /> {t("تحقق", "Verify")}
                            </button>
                            <button className={`btn-action ${isMuted ? "success" : "danger"}`} onClick={() => handleToggleMuteCustomer(c)}>
                              {isMuted ? <Volume2 size={14} /> : <VolumeX size={14} />} {isMuted ? t("فك كتم", "Unmute") : t("كتم", "Mute")}
                            </button>
                            <button
                              className="btn-action"
                              onClick={() => setMessageModalState({
                                isOpen: true,
                                customerEmail: c.email,
                                customerName: c.name,
                                subject: "",
                                message: "",
                              })}
                            >
                              <Mail size={14} /> {t("إرسال بريد", "Send Email")}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="search-empty-state">
                    <Search size={36} />
                    <p>{customerSearch ? t("لا يوجد عملاء يطابقون كلمة البحث.", "No customers found.") : t("ابدأ بكتابة بريد أو اسم العميل للبحث.", "Type email or name above to start search.")}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ==================================================== */}
          {/* 5. KEY ACTIVATIONS LOG (سجل تفعيل مفتاح) */}
          {/* ==================================================== */}
          {activeSection === "logs-activations" && (
            <div className="admin-view-block">
              <div className="section-toolbar-row">
                <div className="toolbar-search">
                  <Search size={18} />
                  <input
                    type="text"
                    value={activationSearch}
                    onChange={(e) => setActivationSearch(e.target.value)}
                    placeholder={t("بحث في سجل التفعيلات بالمنتج، العميل، أو الرمز...", "Search activations by product, customer, or code...")}
                  />
                </div>
                <button className="secondary-button" onClick={loadActivationLogs}>
                  <RefreshCw size={14} className={loadingActivations ? "spin" : ""} /> {t("تحديث السجل", "Refresh Log")}
                </button>
              </div>

              <div className="admin-table-container">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>{t("رمز المفتاح", "Key Code")}</th>
                      <th>{t("المنتج المفعل", "Activated Product")}</th>
                      <th>{t("العميل المفعل", "Redeemed By")}</th>
                      <th>{t("تاريخ ووقت التفعيل", "Redeemed At")}</th>
                      <th>{t("تاريخ الانتهاء", "Expires At")}</th>
                      <th>{t("المدة", "Duration")}</th>
                      <th>{t("الحالة", "Status")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredActivationLogs.length ? (
                      filteredActivationLogs.map((log) => (
                        <tr key={log.id}>
                          <td>
                            <div className="key-code-cell">
                              <code className="key-display-masked" dir="ltr">{log.masked_code || `KEY-******-${log.code_suffix}`}</code>
                              <button
                                className="copy-icon-btn"
                                onClick={() => {
                                  navigator.clipboard.writeText(log.masked_code || log.code_suffix);
                                  notify(t("تم نسخ كود المفتاح", "Key copied"));
                                }}
                                title={t("نسخ", "Copy")}
                              >
                                <Copy size={13} />
                              </button>
                            </div>
                          </td>
                          <td>
                            <strong>{log.product_name}</strong>
                            {log.category && <small className="block-category">{log.category}</small>}
                          </td>
                          <td dir="ltr"><strong>{log.redeemed_by || "—"}</strong></td>
                          <td>{log.redeemed_at ? new Date(log.redeemed_at).toLocaleString(ar ? "ar-SA" : "en-US") : "—"}</td>
                          <td>{log.expires_at ? new Date(log.expires_at).toLocaleDateString(ar ? "ar-SA" : "en-US") : t("مدى الحياة", "Lifetime")}</td>
                          <td>{log.duration_days >= 3650 ? t("مدى الحياة", "Lifetime") : `${log.duration_days} ${t("يوم", "Days")}`}</td>
                          <td>
                            <span className="status-badge green">
                              <CheckCircle2 size={12} /> {t("تفعيل مكتمل", "Active")}
                            </span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={7} className="table-empty-cell">
                          {loadingActivations ? t("جاري تحميل السجلات...", "Loading activation logs...") : t("لا توجد سجلات تفعيل حتى الآن.", "No activation logs found.")}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ==================================================== */}
          {/* 6. LOGIN AUDIT LOG (سجل تسجيل دخول) */}
          {/* ==================================================== */}
          {activeSection === "logs-logins" && (
            <div className="admin-view-block">
              <div className="section-toolbar-row">
                <div className="toolbar-search">
                  <Search size={18} />
                  <input
                    type="text"
                    value={loginSearch}
                    onChange={(e) => setLoginSearch(e.target.value)}
                    placeholder={t("بحث في سجل تسجيل الدخول بالبريد أو الاسم...", "Search logins by email or name...")}
                  />
                </div>
                <button className="secondary-button" onClick={loadLoginLogs}>
                  <RefreshCw size={14} className={loadingLogins ? "spin" : ""} /> {t("تحديث السجل", "Refresh Log")}
                </button>
              </div>

              <div className="admin-table-container">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>{t("المستخدم", "User")}</th>
                      <th>{t("البريد الإلكتروني", "Email")}</th>
                      <th>{t("تاريخ ووقت تسجيل الدخول", "Login Timestamp")}</th>
                      <th>{t("طريقة المصادقة", "Auth Method")}</th>
                      <th>{t("حالة الحساب", "Account Status")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLoginLogs.length ? (
                      filteredLoginLogs.map((log) => {
                        const isMuted = log.customer_status === "SUSPENDED";
                        return (
                          <tr key={log.id}>
                            <td className="table-user-cell">
                              {log.customer_image ? (
                                <img src={log.customer_image} alt="" className="table-avatar" />
                              ) : (
                                <div className="table-avatar-fallback">
                                  {log.customer_name ? log.customer_name[0].toUpperCase() : log.actor_email[0].toUpperCase()}
                                </div>
                              )}
                              <div>
                                <strong>{log.customer_name || log.actor_email.split("@")[0]}</strong>
                              </div>
                            </td>
                            <td dir="ltr"><strong>{log.actor_email}</strong></td>
                            <td>
                              <span className="timestamp-badge">
                                <Clock size={12} /> {new Date(log.created_at).toLocaleString(ar ? "ar-SA" : "en-US")}
                              </span>
                            </td>
                            <td>
                              <span className="badge-tag blue">{log.auth_method || "Google OAuth"}</span>
                            </td>
                            <td>
                              <span className={`status-badge ${isMuted ? "danger" : "green"}`}>
                                {isMuted ? t("مكتوم / محظور", "Muted") : t("نشط", "Active")}
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={5} className="table-empty-cell">
                          {loadingLogins ? t("جاري تحميل السجلات...", "Loading login logs...") : t("لا توجد سجلات دخول حتى الآن.", "No login logs found.")}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </main>
      </div>

      {/* ==================================================== */}
      {/* PRODUCT MODAL (ADD / EDIT / FILES & SETTINGS) */}
      {/* ==================================================== */}
      {showProductModal && (
        <div className="modal-backdrop" onClick={() => setShowProductModal(false)}>
          <div className="modal-card wide-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingProduct ? t("تعديل المنتج والملفات والضبط", "Edit Product & Settings") : t("إضافة منتج جديد", "Add New Product")}</h2>
              <button className="modal-close" onClick={() => setShowProductModal(false)}><X size={19} /></button>
            </div>

            <form onSubmit={handleSaveProduct} className="modal-form">
              <div className="form-row-2">
                <div className="form-field">
                  <label>{t("عنوان المنتج (عربي)", "Product Title (AR)")} *</label>
                  <input
                    value={productForm.name}
                    onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                    placeholder="مثال: SpooFX Pro 2026"
                    required
                    maxLength={120}
                  />
                </div>
                <div className="form-field">
                  <label>{t("عنوان المنتج (إنجليزي)", "Product Title (EN)")}</label>
                  <input
                    value={productForm.nameEn}
                    onChange={(e) => setProductForm({ ...productForm, nameEn: e.target.value })}
                    placeholder="e.g. SpooFX Pro 2026"
                    maxLength={120}
                  />
                </div>
              </div>

              <div className="form-row-2">
                <div className="form-field">
                  <label>{t("التصنيف", "Category")}</label>
                  <input
                    value={productForm.category}
                    onChange={(e) => setProductForm({ ...productForm, category: e.target.value })}
                    placeholder="General, Security, Tools..."
                  />
                </div>
                <div className="form-field">
                  <label>{t("مدة الترخيص الافتراضية بالأيام", "Default Duration (Days)")}</label>
                  <input
                    type="number"
                    min={1}
                    max={3650}
                    value={productForm.defaultDurationDays}
                    onChange={(e) => setProductForm({ ...productForm, defaultDurationDays: Number(e.target.value) })}
                    required
                  />
                </div>
              </div>

              <div className="form-field">
                <label>{t("وصف المنتج", "Product Description")}</label>
                <textarea
                  rows={2}
                  value={productForm.description}
                  onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                />
              </div>

              <div className="form-row-2">
                <div className="form-field">
                  <label>{t("رابط الوصول المباشر HTTPS (اختياري)", "Direct Access URL HTTPS (Optional)")}</label>
                  <input
                    type="url"
                    value={productForm.accessUrl}
                    onChange={(e) => setProductForm({ ...productForm, accessUrl: e.target.value })}
                    placeholder="https://example.com/app"
                  />
                </div>
                <div className="form-field">
                  <label>{t("رابط صورة المنتج HTTPS", "Image URL HTTPS")}</label>
                  <input
                    type="url"
                    value={productForm.imageUrl}
                    onChange={(e) => setProductForm({ ...productForm, imageUrl: e.target.value })}
                    placeholder="https://.../image.png"
                  />
                </div>
              </div>

              {/* Files Manager Inside Product Modal */}
              <div className="modal-section-card">
                <div className="modal-section-title">
                  <FileText size={16} /> <strong>{t("ملفات المنتج وروابط التحميل", "Product Files & Downloads")}</strong>
                </div>

                {productForm.files.length > 0 && (
                  <div className="modal-files-list">
                    {productForm.files.map((f) => (
                      <div className="modal-file-item" key={f.id}>
                        <div className="file-info-col">
                          <strong>{f.name}</strong>
                          <span className="file-url" dir="ltr">{f.url}</span>
                          {f.size && <small className="file-size">({f.size})</small>}
                        </div>
                        <button
                          type="button"
                          className="file-remove-btn"
                          onClick={() => handleRemoveFileFromProduct(f.id)}
                          title={t("حذف الملف", "Remove File")}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="add-file-inputs-row">
                  <input
                    type="text"
                    value={newFileName}
                    onChange={(e) => setNewFileName(e.target.value)}
                    placeholder={t("اسم الملف (مثال: Setup v2.4.zip)", "File Name")}
                  />
                  <input
                    type="url"
                    value={newFileUrl}
                    onChange={(e) => setNewFileUrl(e.target.value)}
                    placeholder="https://... (رابط التحميل المباشر)"
                  />
                  <input
                    type="text"
                    value={newFileSize}
                    onChange={(e) => setNewFileSize(e.target.value)}
                    placeholder={t("الحجم (مثال: 45MB)", "Size (e.g. 45MB)")}
                    className="file-size-input"
                  />
                  <button type="button" className="btn-action primary" onClick={handleAddFileToProduct}>
                    <Plus size={14} /> {t("إضافة ملف", "Add File")}
                  </button>
                </div>
              </div>

              <div className="form-field">
                <label>{t("تعليمات التشغيل والتثبيت", "Operating Instructions")}</label>
                <textarea
                  rows={3}
                  value={productForm.instructions}
                  onChange={(e) => setProductForm({ ...productForm, instructions: e.target.value })}
                  placeholder="1. الخطوة الأولى...&#10;2. الخطوة الثانية..."
                />
              </div>

              <div className="form-switch-row">
                <span>{t("إظهار المنتج للعملاء في المتجر", "Visible in customer catalog")}</span>
                <input
                  type="checkbox"
                  checked={productForm.isVisible}
                  onChange={(e) => setProductForm({ ...productForm, isVisible: e.target.checked })}
                />
              </div>

              <div className="form-switch-row">
                <span>{t("تفعيل المنتج (جاهز للاستخدام)", "Product Active")}</span>
                <input
                  type="checkbox"
                  checked={productForm.isActive}
                  onChange={(e) => setProductForm({ ...productForm, isActive: e.target.checked })}
                />
              </div>

              <div className="modal-actions">
                <button type="button" className="secondary-button" onClick={() => setShowProductModal(false)}>
                  {t("إلغاء", "Cancel")}
                </button>
                <button type="submit" className="primary-button" disabled={busy}>
                  {busy ? <LoaderCircle className="spin" size={16} /> : <Check size={16} />}
                  {t("حفظ المنتج", "Save Product")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* STOCK FILLING MODAL (تعبئة مخزون المفاتيح) */}
      {/* ==================================================== */}
      {showStockModal && (
        <div className="modal-backdrop" onClick={() => setShowStockModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2><KeyRound size={20} /> {t("تعبئة مخزون المفاتيح الرقمية", "Fill Key Stock")}</h2>
              <button className="modal-close" onClick={() => setShowStockModal(false)}><X size={19} /></button>
            </div>

            <form onSubmit={handleFillStock} className="modal-form">
              <div className="form-field">
                <label>{t("اختر المنتج لتعبئة مخزونه", "Select Product to Fill Stock")} *</label>
                <select
                  value={stockModalProductId}
                  onChange={(e) => setStockModalProductId(e.target.value)}
                  required
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} (المتوفر حالياً: {p.available_keys ?? 0})
                    </option>
                  ))}
                </select>
              </div>

              {/* Tabs: Generate vs Import */}
              <div className="stock-tabs-row">
                <button
                  type="button"
                  className={`tab-btn ${stockMode === "generate" ? "active" : ""}`}
                  onClick={() => setStockMode("generate")}
                >
                  {t("توليد مفاتيح عشوائية", "Generate Random Keys")}
                </button>
                <button
                  type="button"
                  className={`tab-btn ${stockMode === "import" ? "active" : ""}`}
                  onClick={() => setStockMode("import")}
                >
                  {t("استيراد مفاتيح يدوياً", "Import Custom Keys")}
                </button>
              </div>

              {stockMode === "generate" ? (
                <div className="form-row-2">
                  <div className="form-field">
                    <label>{t("عدد المفاتيح المراد توليدها (1 - 500)", "Number of Keys (1 - 500)")}</label>
                    <input
                      type="number"
                      min={1}
                      max={500}
                      value={generateCount}
                      onChange={(e) => setGenerateCount(Number(e.target.value))}
                      required
                    />
                  </div>
                  <div className="form-field">
                    <label>{t("صلاحية كل مفتاح بالأيام", "Key Validity (Days)")}</label>
                    <input
                      type="number"
                      min={1}
                      max={3650}
                      value={generateDuration}
                      onChange={(e) => setGenerateDuration(Number(e.target.value))}
                      required
                    />
                  </div>
                </div>
              ) : (
                <div className="form-field">
                  <label>{t("ألصق المفاتيح هنا (مفتاح في كل سطر)", "Paste Keys (One per line)")}</label>
                  <textarea
                    rows={6}
                    value={importKeysText}
                    onChange={(e) => setImportKeysText(e.target.value)}
                    placeholder="KEY-gZcMty-H9whoQ&#10;KEY-kLm89P-Q1w2e3..."
                    dir="ltr"
                    required
                  />
                </div>
              )}

              {/* Generated Keys Display Box */}
              {newlyGenerated.length > 0 && (
                <div className="generated-keys-box">
                  <div className="keys-box-header">
                    <strong>{t(`تم توليد (${newlyGenerated.length}) مفتاح بنجاح:`, `Generated (${newlyGenerated.length}) keys:`)}</strong>
                    <button type="button" className="btn-action primary" onClick={handleCopyGeneratedKeys}>
                      <Copy size={13} /> {copiedKeys ? t("تم النسخ!", "Copied!") : t("نسخ الكل", "Copy All")}
                    </button>
                  </div>
                  <textarea
                    readOnly
                    rows={4}
                    value={newlyGenerated.join("\n")}
                    dir="ltr"
                    className="generated-keys-area"
                  />
                </div>
              )}

              <div className="modal-actions">
                <button type="button" className="secondary-button" onClick={() => setShowStockModal(false)}>
                  {t("إغلاق", "Close")}
                </button>
                <button type="submit" className="primary-button" disabled={busy}>
                  {busy ? <LoaderCircle className="spin" size={16} /> : <Check size={16} />}
                  {stockMode === "generate" ? t("توليد وتعبئة المفاتيح الآن", "Generate Stock Now") : t("استيراد وتعبئة المفاتيح", "Import Keys Now")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* SEND CUSTOMER MESSAGE / EMAIL MODAL */}
      {/* ==================================================== */}
      {messageModalState.isOpen && (
        <div className="modal-backdrop" onClick={() => setMessageModalState((prev) => ({ ...prev, isOpen: false }))}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2><Mail size={18} /> {t("إرسال رسالة إلى بريد العميل", "Send Email to Customer")}</h2>
              <button className="modal-close" onClick={() => setMessageModalState((prev) => ({ ...prev, isOpen: false }))}><X size={19} /></button>
            </div>

            <form onSubmit={handleSendMessage} className="modal-form">
              <div className="form-field">
                <label>{t("البريد الإلكتروني للعميل المستلم", "Recipient Customer Email")}</label>
                <input
                  type="email"
                  value={messageModalState.customerEmail}
                  readOnly
                  dir="ltr"
                  className="read-only-input"
                />
              </div>

              <div className="form-field">
                <label>{t("عنوان الرسالة / الموضوع", "Message Subject")} *</label>
                <input
                  type="text"
                  value={messageModalState.subject}
                  onChange={(e) => setMessageModalState({ ...messageModalState, subject: e.target.value })}
                  placeholder={t("مثال: تحديث أمان هام، تفاصيل اشتراكك، إشعار خاص...", "e.g. Account update, subscription notice...")}
                  required
                />
              </div>

              <div className="form-field">
                <label>{t("نص الرسالة الموجهة للعميل", "Message Body")} *</label>
                <textarea
                  rows={5}
                  value={messageModalState.message}
                  onChange={(e) => setMessageModalState({ ...messageModalState, message: e.target.value })}
                  placeholder={t("اكتب نص الرسالة التي ستصل للعميل على بريده الإلكتروني...", "Type your message...")}
                  required
                />
              </div>

              <div className="modal-actions">
                <button type="button" className="secondary-button" onClick={() => setMessageModalState((prev) => ({ ...prev, isOpen: false }))}>
                  {t("إلغاء", "Cancel")}
                </button>
                <button type="submit" className="primary-button" disabled={busy || !messageModalState.message.trim()}>
                  {busy ? <LoaderCircle className="spin" size={16} /> : <Send size={16} />}
                  {t("إرسال الرسالة الآن", "Send Message Now")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* COMPENSATION MODAL (تعويض العميل) */}
      {/* ==================================================== */}
      {showCompensationModal && (
        <div className="modal-backdrop" onClick={() => setShowCompensationModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2><Gift size={20} /> {t("تسجيل تعويض لعميل", "Log Customer Compensation")}</h2>
              <button className="modal-close" onClick={() => setShowCompensationModal(false)}><X size={19} /></button>
            </div>

            <form onSubmit={handleCreateCompensation} className="modal-form">
              <div className="form-field">
                <label>{t("بريد العميل المستفيد", "Customer Email")} *</label>
                <input
                  type="email"
                  dir="ltr"
                  value={compForm.customerEmail}
                  onChange={(e) => setCompForm({ ...compForm, customerEmail: e.target.value })}
                  required
                />
              </div>

              <div className="form-field">
                <label>{t("المنتج الأصلي المعني", "Affected Product")} *</label>
                <select
                  value={compForm.originalProductId}
                  onChange={(e) => setCompForm({ ...compForm, originalProductId: e.target.value })}
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-field">
                <label>{t("نوع التعويض", "Compensation Type")}</label>
                <select
                  value={compForm.compensationType}
                  onChange={(e) => setCompForm({ ...compForm, compensationType: e.target.value as any })}
                >
                  <option value="REPLACEMENT_KEY">{t("مفتاح بديل (Replacement Key)", "Replacement Key")}</option>
                  <option value="EXTEND_LICENSE">{t("تمديد ترخيص إضافي (Extend License)", "Extend License")}</option>
                  <option value="DIRECT_GRANT">{t("منح مباشر لمنتج آخر (Direct Grant)", "Direct Grant")}</option>
                </select>
              </div>

              <div className="form-field">
                <label>{t("سبب التعويض والتفاصيل", "Reason & Details")} *</label>
                <textarea
                  rows={3}
                  value={compForm.reason}
                  onChange={(e) => setCompForm({ ...compForm, reason: e.target.value, details: e.target.value })}
                  placeholder={t("اذكر المشكلة التي واجهها العميل مع المفتاح أو سبب استحقاقه للتعويض...", "Explain the issue faced by the customer...")}
                  required
                />
              </div>

              <div className="modal-actions">
                <button type="button" className="secondary-button" onClick={() => setShowCompensationModal(false)}>
                  {t("إلغاء", "Cancel")}
                </button>
                <button type="submit" className="primary-button" disabled={busy || !compForm.customerEmail.trim() || !compForm.reason.trim()}>
                  {busy ? <LoaderCircle className="spin" size={16} /> : <Check size={16} />}
                  {t("تسجيل ومنح التعويض", "Grant Compensation")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* CUSTOMER VERIFICATION DRAWER (التحقق من العميل) */}
      {/* ==================================================== */}
      {showCustomerDrawer && customerDetails && (
        <div className="drawer-backdrop" onClick={() => setShowCustomerDrawer(false)}>
          <div className="customer-drawer-panel" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-header">
              <div className="drawer-title-group">
                <h3>{customerDetails.customer?.name || customerDetails.customer?.email?.split("@")[0]}</h3>
                <span dir="ltr" className="drawer-email">{customerDetails.customer?.email}</span>
              </div>
              <button className="drawer-close" onClick={() => setShowCustomerDrawer(false)}><X size={20} /></button>
            </div>

            <div className="drawer-content">
              {/* Profile Card */}
              <div className="drawer-profile-card">
                <div className="drawer-avatar-wrap">
                  {customerDetails.customer?.image ? (
                    <img src={customerDetails.customer.image} alt="" className="drawer-avatar" />
                  ) : (
                    <div className="drawer-avatar-fallback">
                      {customerDetails.customer?.name ? customerDetails.customer.name[0].toUpperCase() : "U"}
                    </div>
                  )}
                </div>
                <div className="drawer-stats-row">
                  <div className="drawer-stat">
                    <small>{t("الحالة", "Status")}</small>
                    <strong className={customerDetails.customer?.status === "SUSPENDED" ? "text-danger" : "text-success"}>
                      {customerDetails.customer?.status === "SUSPENDED" ? t("مكتوم / محظور", "Muted") : t("نشط", "Active")}
                    </strong>
                  </div>
                  <div className="drawer-stat">
                    <small>{t("التراخيص النشطة", "Active Licenses")}</small>
                    <strong>{customerDetails.licenses?.length || 0}</strong>
                  </div>
                  <div className="drawer-stat">
                    <small>{t("تاريخ التسجيل", "Joined")}</small>
                    <strong>{customerDetails.customer?.created_at ? new Date(customerDetails.customer.created_at).toLocaleDateString(ar ? "ar-SA" : "en-US") : "—"}</strong>
                  </div>
                </div>
              </div>

              {/* Licenses List */}
              <div className="drawer-section">
                <h4><KeyRound size={16} /> {t("التراخيص والمفاتيح المسجلة", "Customer Licenses")}</h4>
                {customerDetails.licenses?.length > 0 ? (
                  <div className="drawer-licenses-list">
                    {customerDetails.licenses.map((lic: any) => (
                      <div className="drawer-lic-item" key={lic.id}>
                        <div className="lic-top">
                          <strong>{lic.product_name}</strong>
                          <span className="status-badge green">{lic.status}</span>
                        </div>
                        <div className="lic-mid">
                          <code dir="ltr">{lic.masked_code || `KEY-******-${lic.code_suffix}`}</code>
                        </div>
                        <div className="lic-bot">
                          <small>{t("انتهاء الصلاحية:", "Expires:")} {lic.expires_at ? new Date(lic.expires_at).toLocaleDateString() : t("مدى الحياة", "Lifetime")}</small>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="drawer-empty">{t("لا توجد تراخيص مسجلة لهذا العميل.", "No licenses registered for this customer.")}</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Universal Confirmation Modal */}
      <ConfirmModal
        isOpen={confirmState.isOpen}
        title={confirmState.title}
        message={confirmState.message}
        confirmText={confirmState.confirmText || t("تأكيد", "Confirm")}
        cancelText={confirmState.cancelText || t("إلغاء", "Cancel")}
        variant={confirmState.variant || "danger"}
        isLoading={busy}
        onConfirm={confirmState.onConfirm}
        onCancel={() => setConfirmState((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}
