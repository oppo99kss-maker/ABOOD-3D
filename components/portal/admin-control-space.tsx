"use client";

import { useState, useMemo, useEffect, useRef, type FormEvent } from "react";
import {
  AlertTriangle,
  ArrowRight,
  ArrowUpLeft,
  BarChart3,
  Bell,
  Box,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
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
  Gift,
  Globe2,
  HardDrive,
  HelpCircle,
  History,
  Info,
  KeyRound,
  LayoutDashboard,
  LifeBuoy,
  ListFilter,
  LoaderCircle,
  Menu,
  Moon,
  Package,
  Plus,
  PlusCircle,
  RefreshCw,
  Search,
  Send,
  Settings,
  Shield,
  ShieldAlert,
  ShieldCheck,
  ShoppingBag,
  Sliders,
  Sun,
  Trash2,
  Truck,
  Upload,
  UserCheck,
  UserPlus,
  UserRound,
  Users,
  X,
  XCircle,
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
  Customer,
} from "@/lib/store";

export type AdminSection =
  | "dashboard"
  | "stats"
  | "recent-activity"
  | "products"
  | "add-product"
  | "inventory"
  | "licenses"
  | "customers"
  | "search-customer"
  | "customer-activations"
  | "compensations"
  | "orders"
  | "fulfillments"
  | "logs-all"
  | "logs-admin"
  | "logs-redemptions"
  | "logs-security"
  | "staff"
  | "settings"
  | "announcements";

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

  // Accordion Sidebar Groups
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    overview: true,
    products: true,
    customers: true,
    orders: true,
    logs: true,
    settings: true,
  });

  function toggleGroup(groupKey: string) {
    setExpandedGroups((prev) => ({ ...prev, [groupKey]: !prev[groupKey] }));
  }

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
  const [drawerActiveTab, setDrawerActiveTab] = useState<"licenses" | "orders" | "compensations" | "logs">("licenses");
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
      }, 300);
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

  async function handleToggleCustomerStatus(email: string, currentStatus: string) {
    const nextStatus = currentStatus === "SUSPENDED" ? "ACTIVE" : "SUSPENDED";
    try {
      await apiAction({
        action: "updateCustomerStatus",
        email,
        status: nextStatus,
        notes: nextStatus === "SUSPENDED" ? "تم الإيقاف بواسطة الإدارة" : "تم التنشيط بواسطة الإدارة",
      });
      notify(t(`تم تغيير حالة الحساب إلى ${nextStatus === "ACTIVE" ? "نشط" : "موقوف"}`, `Account status updated to ${nextStatus}`));
      if (customerDetails?.customer?.email === email) {
        setCustomerDetails((prev: any) => ({
          ...prev,
          customer: { ...prev.customer, status: nextStatus },
        }));
      }
      await loadCustomers(customerSearch, customerStatusFilter, customerPage);
    } catch (err: any) {
      notify(err.message, "error");
    }
  }

  // ====================================================
  // 2. PRODUCTS STATE & ACTIONS
  // ====================================================
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
      await onRefresh();
    } catch (err: any) {
      notify(err.message, "error");
    }
  }

  async function handleArchiveProduct(id: string, name: string) {
    if (!confirm(t(`هل أنت متأكد من أرشفة المنتج "${name}"؟`, `Are you sure you want to archive "${name}"?`))) return;
    try {
      await apiAction({ action: "archiveProduct", id });
      notify(t("تمت أرشفة المنتج بنجاح", "Product archived"));
      await onRefresh();
    } catch (err: any) {
      notify(err.message, "error");
    }
  }

  // ====================================================
  // 3. INVENTORY & LICENSES STATE
  // ====================================================
  const [selectedProductId, setSelectedProductId] = useState<string>(products[0]?.id || "");
  const [inventoryKeys, setInventoryKeys] = useState<LicenseKey[]>([]);
  const [loadingInventory, setLoadingInventory] = useState(false);
  const [generateCount, setGenerateCount] = useState(10);
  const [generateDuration, setGenerateDuration] = useState(30);
  const [newlyGenerated, setNewlyGenerated] = useState<string[]>([]);
  const [importKeysText, setImportKeysText] = useState("");
  const [importDuration, setImportDuration] = useState(30);
  const [licenseStatusFilter, setLicenseStatusFilter] = useState("ALL");

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
    const keyList = importKeysText
      .split("\n")
      .map((k) => k.trim())
      .filter((k) => k.length >= 8);

    try {
      const res = await apiAction({
        action: "importKeys",
        productId: selectedProductId,
        keys: keyList,
        durationDays: importDuration,
      });
      notify(t(`تم استيراد ${res.importedCount} مفتاح جديد بنجاح!`, `Imported ${res.importedCount} keys successfully!`));
      setImportKeysText("");
      await loadInventory(selectedProductId);
      await onRefresh();
    } catch (err: any) {
      notify(err.message, "error");
    }
  }

  // ====================================================
  // 4. DIRECT GRANTS & EXTENSIONS
  // ====================================================
  const [showGrantModal, setShowGrantModal] = useState(false);
  const [grantCustomerEmail, setGrantCustomerEmail] = useState("");
  const [grantProductId, setGrantProductId] = useState(products[0]?.id || "");
  const [grantDuration, setGrantDuration] = useState(30);
  const [grantReason, setGrantReason] = useState("");

  const [showExtendModal, setShowExtendModal] = useState(false);
  const [extendLicenseId, setExtendLicenseId] = useState("");
  const [extendDays, setExtendDays] = useState(30);

  async function handleGrantDirectLicense(e: FormEvent) {
    e.preventDefault();
    try {
      await apiAction({
        action: "grantDirectLicense",
        customerEmail: grantCustomerEmail,
        productId: grantProductId,
        durationDays: grantDuration,
        reason: grantReason || "Direct Grant by Admin",
      });
      notify(t("تم منح الترخيص للعميل بنجاح!", "Direct license granted successfully!"));
      setShowGrantModal(false);
      setGrantReason("");
      if (customerDetails?.customer?.email === grantCustomerEmail) {
        await openCustomerDetails(grantCustomerEmail);
      }
      await loadCustomers(customerSearch, customerStatusFilter, customerPage);
      await onRefresh();
    } catch (err: any) {
      notify(err.message, "error");
    }
  }

  async function handleExtendLicense(e: FormEvent) {
    e.preventDefault();
    try {
      await apiAction({
        action: "extendLicense",
        licenseId: extendLicenseId,
        extraDays: extendDays,
      });
      notify(t(`تم تمديد الترخيص بمقدار ${extendDays} يوماً بنجاح!`, `License extended by ${extendDays} days!`));
      setShowExtendModal(false);
      if (customerDetails?.customer?.email) {
        await openCustomerDetails(customerDetails.customer.email);
      }
      await onRefresh();
    } catch (err: any) {
      notify(err.message, "error");
    }
  }

  // ====================================================
  // 5. ORDERS & FULFILLMENT
  // ====================================================
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

  async function handleCreateOrder(e: FormEvent) {
    e.preventDefault();
    try {
      await apiAction({
        action: "createOrder",
        ...orderForm,
      });
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

  // ====================================================
  // 6. COMPENSATIONS
  // ====================================================
  const [showCompensationModal, setShowCompensationModal] = useState(false);
  const [compForm, setCompForm] = useState({
    customerEmail: "",
    originalProductId: products[0]?.id || "",
    compensationType: "REPLACEMENT_KEY" as Compensation["compensation_type"],
    details: "",
    reason: "",
  });

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

  // ====================================================
  // 7. AUDIT LOGS
  // ====================================================
  const [logs, setLogs] = useState<AuditLog[]>(dashboardStats?.recentActivity || []);
  const [logsCategory, setLogsCategory] = useState<string>("");
  const [loadingLogs, setLoadingLogs] = useState(false);

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

  // ====================================================
  // 8. SETTINGS & HEALTH
  // ====================================================
  const [settingsState, setSettingsState] = useState<SystemSettings>(initialSettings);
  const [dbStatus, setDbStatus] = useState<"ok" | "checking" | "error">("ok");

  async function handleSaveSettings(e: FormEvent) {
    e.preventDefault();
    try {
      await apiAction({
        action: "updateSettings",
        settings: settingsState,
      });
      notify(t("تم حفظ الإعدادات بنجاح!", "Settings saved successfully!"));
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
        notify(t("الاتصال بقاعدة البيانات ممتاز ومستقر (PostgreSQL Live)", "Database connection is healthy and responsive"));
      } else {
        setDbStatus("error");
        notify(t("تعذر فحص قاعدة البيانات", "Database health check failed"), "error");
      }
    } catch {
      setDbStatus("error");
      notify(t("فشل الاتصال بالخادم", "Connection to server failed"), "error");
    }
  }

  // Navigation Sidebar Definition
  const sidebarGroups = [
    {
      id: "overview",
      titleAr: "الرئيسية",
      titleEn: "Overview",
      items: [
        { id: "dashboard", icon: LayoutDashboard, ar: "لوحة التحكم", en: "Dashboard" },
        { id: "stats", icon: BarChart3, ar: "الإحصائيات والتحليلات", en: "Analytics" },
        { id: "recent-activity", icon: Clock, ar: "آخر الأنشطة", en: "Recent Activity" },
      ],
    },
    {
      id: "products",
      titleAr: "إدارة المنتجات",
      titleEn: "Products",
      items: [
        { id: "products", icon: Package, ar: "جميع المنتجات", en: "All Products", count: products.length },
        { id: "add-product", icon: PlusCircle, ar: "إضافة منتج جديد", en: "Add Product" },
        { id: "inventory", icon: KeyRound, ar: "مخزون المفاتيح", en: "Key Inventory" },
        { id: "licenses", icon: ShieldCheck, ar: "سجل التراخيص", en: "Licenses" },
      ],
    },
    {
      id: "customers",
      titleAr: "إدارة العملاء",
      titleEn: "Customers",
      items: [
        { id: "customers", icon: Users, ar: "دليل العملاء", en: "All Customers", count: customerTotalCount || undefined },
        { id: "search-customer", icon: Search, ar: "البحث الفوري عن عميل", en: "Search Customer" },
        { id: "customer-activations", icon: CheckCircle2, ar: "تفعيلات العملاء", en: "Activations" },
        { id: "compensations", icon: Gift, ar: "التعويضات والمنح المباشر", en: "Compensations & Grants" },
      ],
    },
    {
      id: "orders",
      titleAr: "الطلبات والتسليم",
      titleEn: "Orders",
      items: [
        { id: "orders", icon: ShoppingBag, ar: "جميع الطلبات", en: "All Orders", count: ordersList.length },
        { id: "fulfillments", icon: Truck, ar: "عمليات التسليم الفوري", en: "Fulfillments" },
      ],
    },
    {
      id: "logs",
      titleAr: "مركز السجلات والأمان",
      titleEn: "Audit & Logs",
      items: [
        { id: "logs-all", icon: Database, ar: "سجل الموقع الشامل", en: "Full Site Log" },
        { id: "logs-admin", icon: Shield, ar: "سجل الإدارة", en: "Admin Operations" },
        { id: "logs-redemptions", icon: KeyRound, ar: "سجل تفعيل المفاتيح", en: "Key Redemptions" },
        { id: "logs-security", icon: ShieldAlert, ar: "سجل الأخطاء والأمان", en: "Security & Errors" },
      ],
    },
    {
      id: "settings",
      titleAr: "الإعدادات والنظام",
      titleEn: "Settings",
      items: [
        { id: "staff", icon: UserCheck, ar: "الموظفون والصلاحيات", en: "Staff & Roles" },
        { id: "settings", icon: Sliders, ar: "إعدادات الموقع والنظام", en: "System Settings" },
        { id: "announcements", icon: Bell, ar: "رسائل التنبيه والصيانة", en: "Announcements" },
      ],
    },
  ];

  const filteredProducts = useMemo(() => {
    return products.filter((p) =>
      (p.name + (p.description || "") + (p.category || "")).toLowerCase().includes(productSearch.toLowerCase())
    );
  }, [products, productSearch]);

  const filteredLicenses = useMemo(() => {
    if (licenseStatusFilter === "ALL") return inventoryKeys;
    return inventoryKeys.filter((k) => k.status === licenseStatusFilter);
  }, [inventoryKeys, licenseStatusFilter]);

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

        <nav className="sidebar-nav">
          {sidebarGroups.map((group) => {
            const isExpanded = expandedGroups[group.id] !== false;
            return (
              <div className="nav-accordion-group" key={group.id}>
                {!sidebarCollapsed && (
                  <button
                    className="accordion-header"
                    type="button"
                    onClick={() => toggleGroup(group.id)}
                  >
                    <span>{t(group.titleAr, group.titleEn)}</span>
                    <ChevronDown size={14} className={`chevron-icon ${isExpanded ? "open" : ""}`} />
                  </button>
                )}

                {(isExpanded || sidebarCollapsed) && (
                  <div className="accordion-items-list">
                    {group.items.map((item) => {
                      const Icon = item.icon;
                      const active = activeSection === item.id;
                      return (
                        <button
                          key={item.id}
                          className={`sidebar-link ${active ? "active" : ""}`}
                          onClick={() => {
                            if (item.id === "add-product") {
                              setActiveSection("products");
                              setEditingProduct(null);
                              setShowProductModal(true);
                            } else if (item.id.startsWith("logs-")) {
                              setActiveSection(item.id as AdminSection);
                              const cat = item.id === "logs-admin" ? "ADMIN" : item.id === "logs-redemptions" ? "REDEMPTION" : item.id === "logs-security" ? "SECURITY" : "";
                              loadLogs(cat);
                            } else if (item.id === "search-customer") {
                              setActiveSection("customers");
                              setTimeout(() => searchInputRef.current?.focus(), 150);
                            } else {
                              setActiveSection(item.id as AdminSection);
                              if (item.id === "inventory" && selectedProductId) loadInventory(selectedProductId);
                              if (item.id === "customers") loadCustomers(customerSearch, customerStatusFilter, customerPage);
                            }
                            setMobileSidebarOpen(false);
                          }}
                          title={t(item.ar, item.en)}
                        >
                          <Icon size={18} />
                          {!sidebarCollapsed && <span className="link-label">{t(item.ar, item.en)}</span>}
                          {!sidebarCollapsed && item.count !== undefined && item.count > 0 && (
                            <span className="badge-count">{item.count}</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
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
                  sidebarGroups.flatMap((g) => g.items).find((i) => i.id === activeSection)?.ar || "لوحة التحكم",
                  sidebarGroups.flatMap((g) => g.items).find((i) => i.id === activeSection)?.en || "Dashboard"
                )}
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

        {/* Dynamic Section Content Area */}
        <main className="admin-content-area">
          {/* ==================================================== */}
          {/* 1. DASHBOARD & STATS OVERVIEW */}
          {/* ==================================================== */}
          {(activeSection === "dashboard" || activeSection === "stats") && (
            <div className="admin-view-block">
              <div className="admin-hero-card">
                <div>
                  <span className="eyebrow-pill"><Shield size={14} /> SpooFX Admin Engine</span>
                  <h1>{t("مركز إدارة منصة SpooFX المتكامل", "SpooFX Control Space")}</h1>
                  <p>{t("نظرة شاملة ومباشرة على المخزون والتراخيص والطلبات وسجلات العمليات.", "Real-time overview of inventory, licenses, customer entitlements, and security logs.")}</p>
                </div>
                <div className="hero-quick-actions">
                  <button className="hero-btn primary" onClick={() => { setActiveSection("products"); setEditingProduct(null); setShowProductModal(true); }}>
                    <Plus size={16} /> {t("إضافة منتج جديد", "Add Product")}
                  </button>
                  <button className="hero-btn secondary" onClick={() => setActiveSection("inventory")}>
                    <KeyRound size={16} /> {t("توليد مفاتيح للمخزون", "Generate Keys")}
                  </button>
                  <button className="hero-btn secondary" onClick={() => { setActiveSection("customers"); setTimeout(() => searchInputRef.current?.focus(), 150); }}>
                    <Search size={16} /> {t("البحث عن عميل", "Search Customer")}
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
                    <small>{t("النشطة", "Active")}: {dashboardStats?.products?.active_products ?? products.filter((p) => p.is_active).length}</small>
                  </div>
                </div>

                <div className="kpi-card">
                  <div className="kpi-icon green"><KeyRound size={22} /></div>
                  <div className="kpi-info">
                    <span className="kpi-label">{t("المفاتيح المتاحة", "Available Keys")}</span>
                    <strong className="kpi-val">{dashboardStats?.inventory?.available_keys ?? 0}</strong>
                    <small>{t("متاحة للتفعيل الفوري", "Ready for redemption")}</small>
                  </div>
                </div>

                <div className="kpi-card">
                  <div className="kpi-icon orange"><CheckCircle2 size={22} /></div>
                  <div className="kpi-info">
                    <span className="kpi-label">{t("المفاتيح المستهلكة", "Redeemed Keys")}</span>
                    <strong className="kpi-val">{dashboardStats?.inventory?.redeemed_keys ?? 0}</strong>
                    <small>{t("مفعلة على حسابات العملاء", "Activated by users")}</small>
                  </div>
                </div>

                <div className="kpi-card">
                  <div className="kpi-icon purple"><Users size={22} /></div>
                  <div className="kpi-info">
                    <span className="kpi-label">{t("العملاء المسجلين", "Total Customers")}</span>
                    <strong className="kpi-val">{dashboardStats?.customers?.total_customers ?? customerTotalCount}</strong>
                    <small>{t("حسابات موثقة عبر Google", "Verified accounts")}</small>
                  </div>
                </div>
              </div>

              {/* Quick Actions & Recent Activity Overview */}
              <div className="overview-split-layout">
                <div className="admin-card-panel">
                  <div className="panel-heading-row">
                    <div className="box-header">
                      <h2><Clock size={16} /> {t("آخر العمليات في النظام", "Recent System Activity")}</h2>
                      <p>{t("سجل مباشر لعمليات التفعيل والإدارة والإجراءات الأمنية", "Live audit stream of activations and administrative changes")}</p>
                    </div>
                    <button className="btn-ghost small" onClick={() => loadLogs()}>
                      <RefreshCw size={14} className={loadingLogs ? "spin" : ""} /> {t("تحديث", "Refresh")}
                    </button>
                  </div>

                  <div className="activity-list">
                    {logs.length > 0 ? (
                      logs.slice(0, 8).map((log) => (
                        <div className="activity-item" key={log.id}>
                          <div className="activity-details">
                            <span className={`badge-tag ${log.category === "ADMIN" ? "blue" : log.category === "REDEMPTION" ? "green" : "gray"}`}>
                              {log.category}
                            </span>
                            <strong>{log.action}</strong>
                            <p>{log.actor_email}</p>
                          </div>
                          <span className="activity-date">
                            {new Date(log.created_at).toLocaleTimeString(ar ? "ar-SA" : "en-US", { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>
                      ))
                    ) : (
                      <div className="table-empty-cell">
                        {t("لا توجد أنشطة مسجلة حديثاً.", "No recent activities recorded.")}
                      </div>
                    )}
                  </div>
                </div>

                <div className="admin-card-panel">
                  <div className="panel-heading-row">
                    <div className="box-header">
                      <h2><Database size={16} /> {t("حالة النظام وقاعدة البيانات", "System & DB Health")}</h2>
                      <p>{t("مراقبة اتصال PostgreSQL والخدمات المرتبطة", "Live monitoring of PostgreSQL and Railway services")}</p>
                    </div>
                  </div>

                  <div className="system-health-body">
                    <div className="health-status-box">
                      <div className="status-indicator-row">
                        <span className={`health-dot ${dbStatus === "ok" ? "green" : "red"}`} />
                        <div>
                          <strong>{t("خادم PostgreSQL", "PostgreSQL Engine")}</strong>
                          <p>{t("حالة الاتصال والجاهزية والاستعلامات الفورية", "Connection & read/write transaction readiness")}</p>
                        </div>
                      </div>
                      <span className={`status-badge ${dbStatus === "ok" ? "green" : "danger"}`}>
                        {dbStatus === "ok" ? t("متصل ومستقر", "Connected & Healthy") : t("خطأ في الاتصال", "Error")}
                      </span>
                    </div>

                    <button className="secondary-button check-db-btn" onClick={handleCheckDatabase}>
                      <RefreshCw size={15} className={dbStatus === "checking" ? "spin" : ""} />
                      {t("فحص استجابة قاعدة البيانات الآن", "Ping Database Now")}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ==================================================== */}
          {/* 2. RECENT ACTIVITY LIST VIEW */}
          {/* ==================================================== */}
          {activeSection === "recent-activity" && (
            <div className="admin-view-block">
              <div className="section-toolbar-row">
                <div className="box-header">
                  <h2><Clock size={18} /> {t("سجل الأنشطة الحية", "Live Activity Stream")}</h2>
                  <p>{t("قائمة مرتبة زمنياً لأحدث الإجراءات والعمليات المنفذة في المنصة", "Chronological audit stream of actions across the platform")}</p>
                </div>
                <button className="btn-secondary" onClick={() => loadLogs()}>
                  <RefreshCw size={15} className={loadingLogs ? "spin" : ""} /> {t("تحديث السجلات", "Refresh Logs")}
                </button>
              </div>

              <div className="admin-card-panel">
                <div className="activity-list">
                  {logs.map((log) => (
                    <div className="activity-item" key={log.id}>
                      <div className="activity-details">
                        <span className={`badge-tag ${log.category === "ADMIN" ? "blue" : log.category === "REDEMPTION" ? "green" : log.category === "SECURITY" ? "danger" : "gray"}`}>
                          {log.category}
                        </span>
                        <strong>{log.action}</strong>
                        <p>{log.actor_email}</p>
                      </div>
                      <span className="activity-date">
                        {new Date(log.created_at).toLocaleString(ar ? "ar-SA" : "en-US")}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ==================================================== */}
          {/* 3. PRODUCTS MANAGEMENT VIEW */}
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
                      <th>{t("المدة الافتراضية", "Default Duration")}</th>
                      <th>{t("المفاتيح المتاحة", "Available")}</th>
                      <th>{t("المفاتيح المستهلكة", "Redeemed")}</th>
                      <th>{t("الحالة", "Status")}</th>
                      <th>{t("الإجراءات", "Actions")}</th>
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
                          <td><strong className="stock-count">{p.available_keys ?? 0}</strong></td>
                          <td><span className="badge-tag">{p.redeemed_keys ?? 0}</span></td>
                          <td>
                            <span className={`status-badge ${p.is_active ? "green" : "gray"}`}>
                              {p.is_active ? t("نشط", "Active") : t("معطل", "Inactive")}
                            </span>
                          </td>
                          <td>
                            <div className="action-buttons-group">
                              <button
                                className="btn-action"
                                onClick={() => {
                                  setEditingProduct(p);
                                  setProductForm({
                                    name: p.name,
                                    nameEn: p.name_en || "",
                                    description: p.description,
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
                                title={t("تعديل المنتج", "Edit Product")}
                              >
                                <Sliders size={14} /> {t("تعديل", "Edit")}
                              </button>
                              <button
                                className="btn-action danger"
                                onClick={() => handleArchiveProduct(p.id, p.name)}
                                title={t("أرشفة المنتج", "Archive Product")}
                              >
                                <Trash2 size={14} />
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
          {/* 4. INVENTORY & KEY GENERATOR VIEW */}
          {/* ==================================================== */}
          {activeSection === "inventory" && (
            <div className="admin-view-block">
              <div className="section-toolbar-row">
                <div className="selector-group">
                  <label htmlFor="inv-product-select">{t("اختر المنتج:", "Select Product:")}</label>
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
                  <span className="stock-count">{t("المفاتيح في المخزون:", "In Stock:")} <strong>{inventoryKeys.filter((k) => k.status === "AVAILABLE").length}</strong></span>
                  <span className="stock-count">{t("المفاتيح المستهلكة:", "Redeemed:")} <strong>{inventoryKeys.filter((k) => k.status === "REDEEMED").length}</strong></span>
                </div>
              </div>

              {/* Generator & Importer Grid */}
              <div className="admin-forms-columns">
                <div className="admin-card-panel">
                  <div className="panel-heading-row">
                    <div className="box-header">
                      <h2><KeyRound size={18} /> {t("توليد مفاتيح جديدة للمخزون", "Generate Batch Keys")}</h2>
                      <p>{t("إنشاء دفعة مفاتيح مشفرة ومحمية بمدد صلاحية مخصصة", "Create cryptographically unique license keys")}</p>
                    </div>
                  </div>

                  <form onSubmit={handleGenerateKeys} className="card-form-body">
                    <div className="form-field">
                      <label htmlFor="gen-count-input">{t("عدد المفاتيح (1 - 100)", "Number of Keys (1 - 100)")}</label>
                      <input
                        id="gen-count-input"
                        type="number"
                        min={1}
                        max={100}
                        value={generateCount}
                        onChange={(e) => setGenerateCount(Number(e.target.value))}
                        required
                      />
                    </div>
                    <div className="form-field">
                      <label htmlFor="gen-duration-select">{t("مدة صلاحية المفتاح", "Key Validity Duration")}</label>
                      <select
                        id="gen-duration-select"
                        value={generateDuration}
                        onChange={(e) => setGenerateDuration(Number(e.target.value))}
                      >
                        <option value={1}>{t("يوم واحد", "1 Day")}</option>
                        <option value={3}>{t("3 أيام", "3 Days")}</option>
                        <option value={7}>{t("7 أيام", "7 Days")}</option>
                        <option value={30}>{t("30 يوماً (شهر)", "30 Days")}</option>
                        <option value={90}>{t("90 يوماً (3 أشهر)", "90 Days")}</option>
                        <option value={365}>{t("سنة كاملة", "1 Year")}</option>
                        <option value={3650}>{t("مدى الحياة", "Lifetime")}</option>
                      </select>
                    </div>
                    <button className="primary-button" type="submit" disabled={busy || !selectedProductId}>
                      {busy ? <LoaderCircle className="spin" size={16} /> : <Plus size={16} />}
                      {t("توليد المفاتيح الآن", "Generate Keys Now")}
                    </button>
                  </form>

                  {newlyGenerated.length > 0 && (
                    <div className="generated-keys-box">
                      <div className="panel-heading-row">
                        <strong>{t(`المفاتيح المولدة حديثاً (${newlyGenerated.length}) — انسخها الآن!`, `Newly generated (${newlyGenerated.length}) — Copy now!`)}</strong>
                        <button
                          className="btn-action small"
                          onClick={() => {
                            navigator.clipboard.writeText(newlyGenerated.join("\n"));
                            notify(t("تم نسخ جميع المفاتيح إلى الحافظة!", "Copied all keys to clipboard!"));
                          }}
                        >
                          <Copy size={14} /> {t("نسخ الكل", "Copy All")}
                        </button>
                      </div>
                      <textarea readOnly rows={5} value={newlyGenerated.join("\n")} dir="ltr" className="generated-keys-textarea" />
                    </div>
                  )}
                </div>

                {/* Custom Key Importer */}
                <div className="admin-card-panel">
                  <div className="panel-heading-row">
                    <div className="box-header">
                      <h2><Upload size={18} /> {t("استيراد مفاتيح مخصصة", "Import Custom Keys")}</h2>
                      <p>{t("الصق قائمة المفاتيح سطر بسطر. يتم تجاهل المفاتيح المكررة آلياً.", "Paste keys line by line. Duplicate codes are safely rejected.")}</p>
                    </div>
                  </div>

                  <form onSubmit={handleImportKeys} className="card-form-body">
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
                    <button className="secondary-button" type="submit" disabled={busy || !selectedProductId || !importKeysText.trim()}>
                      <Upload size={16} /> {t("استيراد المفاتيح", "Import Keys")}
                    </button>
                  </form>
                </div>
              </div>

              {/* Keys Inventory Table */}
              <div className="admin-table-container">
                <div className="panel-heading-row">
                  <h3>{t("المفاتيح المسجلة للمنتج", "Registered Keys for Product")}</h3>
                  <button className="btn-action small" onClick={() => loadInventory(selectedProductId)}>
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
          {/* 5. ALL LICENSES VIEW */}
          {/* ==================================================== */}
          {activeSection === "licenses" && (
            <div className="admin-view-block">
              <div className="section-toolbar-row">
                <div className="filter-pill-group">
                  {["ALL", "AVAILABLE", "REDEEMED", "BLOCKED"].map((st) => (
                    <button
                      key={st}
                      className={`filter-pill ${licenseStatusFilter === st ? "active" : ""}`}
                      onClick={() => setLicenseStatusFilter(st)}
                    >
                      {st === "ALL" ? t("الكل", "All") : st}
                    </button>
                  ))}
                </div>
                <div className="selector-group">
                  <select
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
              </div>

              <div className="admin-table-container">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>{t("رمز الترخيص", "License Code")}</th>
                      <th>{t("المنتج", "Product")}</th>
                      <th>{t("الحالة", "Status")}</th>
                      <th>{t("المستفيد", "Redeemed By")}</th>
                      <th>{t("المدة", "Duration")}</th>
                      <th>{t("تاريخ الصلاحية", "Expires At")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLicenses.length ? (
                      filteredLicenses.map((k) => (
                        <tr key={k.id}>
                          <td><code className="key-code">{k.masked_code || `SPFX-******-${k.code_suffix}`}</code></td>
                          <td><strong>{products.find((p) => p.id === k.product_id)?.name || "-"}</strong></td>
                          <td>
                            <span className={`status-badge ${k.status === "AVAILABLE" ? "green" : k.status === "REDEEMED" ? "blue" : "danger"}`}>
                              {k.status}
                            </span>
                          </td>
                          <td>{k.redeemed_by || k.issued_to || "—"}</td>
                          <td>{k.duration_days >= 3650 ? t("مدى الحياة", "Lifetime") : `${k.duration_days} ${t("يوم", "Days")}`}</td>
                          <td>{k.expires_at ? new Date(k.expires_at).toLocaleDateString(ar ? "ar-SA" : "en-US") : t("مدى الحياة", "Lifetime")}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="table-empty-cell">
                          {t("لا توجد تراخيص تطابق الفلتر المحدد.", "No licenses matching filter.")}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ==================================================== */}
          {/* 6. CUSTOMERS MANAGEMENT & REAL-TIME SEARCH VIEW */}
          {/* ==================================================== */}
          {(activeSection === "customers" || activeSection === "search-customer" || activeSection === "customer-activations") && (
            <div className="admin-view-block">
              {/* Top Search & Filter Bar */}
              <div className="section-toolbar-row customer-search-toolbar">
                <div className="toolbar-search-expanded">
                  <Search size={18} className="search-lead-icon" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={customerSearch}
                    onChange={(e) => {
                      setCustomerSearch(e.target.value);
                      setCustomerPage(1);
                    }}
                    placeholder={t("ابحث باسم العميل أو البريد الإلكتروني أو معرف الحساب...", "Search by customer name, email address, or account ID...")}
                  />
                  {customerSearch && (
                    <button
                      className="search-clear-btn"
                      onClick={() => {
                        setCustomerSearch("");
                        setCustomerPage(1);
                      }}
                      title={t("مسح البحث", "Clear Search")}
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>

                <div className="customer-filters-row">
                  <div className="filter-pill-group">
                    {[
                      { id: "ALL", ar: "الكل", en: "All" },
                      { id: "ACTIVE", ar: "النشطة", en: "Active" },
                      { id: "SUSPENDED", ar: "الموقوفة", en: "Suspended" },
                    ].map((st) => (
                      <button
                        key={st.id}
                        className={`filter-pill ${customerStatusFilter === st.id ? "active" : ""}`}
                        onClick={() => {
                          setCustomerStatusFilter(st.id);
                          setCustomerPage(1);
                        }}
                      >
                        {t(st.ar, st.en)}
                      </button>
                    ))}
                  </div>

                  <button
                    className="secondary-button"
                    onClick={() => loadCustomers(customerSearch, customerStatusFilter, customerPage)}
                    title={t("تحديث قائمة العملاء", "Refresh Customer Directory")}
                  >
                    <RefreshCw size={15} className={loadingCustomers ? "spin" : ""} />
                    <span>{t("تحديث النتائج", "Refresh")}</span>
                  </button>
                </div>
              </div>

              {/* Real-time Indicator Banner */}
              <div className="customer-count-banner">
                <span>
                  {loadingCustomers ? (
                    <span className="search-loading-pill"><LoaderCircle size={14} className="spin" /> {t("جارٍ البحث في قاعدة البيانات...", "Querying PostgreSQL...")}</span>
                  ) : (
                    t(`عرض ${customers.length} من أصل ${customerTotalCount} عميل مسجل`, `Showing ${customers.length} of ${customerTotalCount} registered accounts`)
                  )}
                </span>
                {customerSearch && (
                  <span className="active-search-query">
                    {t(`نتائج البحث عن: "${customerSearch}"`, `Search results for: "${customerSearch}"`)}
                  </span>
                )}
              </div>

              {/* Customers DataTable */}
              <div className="admin-table-container">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>{t("العميل", "Customer")}</th>
                      <th>{t("البريد الإلكتروني", "Email Address")}</th>
                      <th>{t("المنتجات", "Products")}</th>
                      <th>{t("التراخيص النشطة", "Active Licenses")}</th>
                      <th>{t("الحالة", "Status")}</th>
                      <th>{t("آخر دخول", "Last Login")}</th>
                      <th>{t("الإجراءات", "Actions")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {customers.length ? (
                      customers.map((c) => {
                        const isSuspended = c.status === "SUSPENDED";
                        return (
                          <tr key={c.id || c.email}>
                            <td>
                              <div className="table-customer-cell">
                                {c.image ? (
                                  <img src={c.image} alt={c.name} className="customer-avatar-img" />
                                ) : (
                                  <span className="customer-avatar-badge">
                                    {(c.name || c.email).slice(0, 2).toUpperCase()}
                                  </span>
                                )}
                                <div>
                                  <strong>{c.name || c.email.split("@")[0]}</strong>
                                  <small className="customer-id-snippet" title={c.id}>ID: {c.id ? c.id.slice(0, 8) + "..." : "—"}</small>
                                </div>
                              </div>
                            </td>
                            <td><span className="email-text" dir="ltr">{c.email}</span></td>
                            <td><span className="badge-tag">{c.products_count ?? 0}</span></td>
                            <td><strong className="stock-count">{c.active_licenses ?? 0}</strong></td>
                            <td>
                              <span className={`status-badge ${isSuspended ? "danger" : "green"}`}>
                                {isSuspended ? t("موقوف", "Suspended") : t("نشط", "Active")}
                              </span>
                            </td>
                            <td>
                              <span className="date-str">
                                {c.last_login_at ? new Date(c.last_login_at).toLocaleDateString(ar ? "ar-SA" : "en-US") : "—"}
                              </span>
                            </td>
                            <td>
                              <div className="action-buttons-group">
                                <button
                                  className="btn-action"
                                  onClick={() => openCustomerDetails(c.id || c.email)}
                                  title={t("عرض تفاصيل الحساب والتراخيص", "View Full Account Details")}
                                >
                                  <UserRound size={14} />
                                  <span>{t("عرض الحساب", "View Account")}</span>
                                </button>
                                <button
                                  className={`btn-action ${isSuspended ? "green" : "danger"}`}
                                  onClick={() => handleToggleCustomerStatus(c.email, c.status)}
                                  title={isSuspended ? t("تنشيط الحساب", "Activate Account") : t("إيقاف الحساب", "Suspend Account")}
                                >
                                  {isSuspended ? <Check size={14} /> : <XCircle size={14} />}
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={7} className="table-empty-cell">
                          {loadingCustomers ? (
                            <div className="table-loader-box">
                              <LoaderCircle className="spin" size={24} />
                              <p>{t("جارٍ البحث في قاعدة البيانات...", "Searching PostgreSQL database...")}</p>
                            </div>
                          ) : (
                            <div className="empty-results-box">
                              <Users size={32} />
                              <h3>{t("لا توجد نتائج مطابقة لبحثك", "No matching customers found")}</h3>
                              <p>{t("تأكد من كتابة الاسم أو البريد الإلكتروني أو المعرف بشكل صحيح.", "Try checking the spelling or resetting the filters.")}</p>
                              {customerSearch && (
                                <button className="secondary-button" onClick={() => setCustomerSearch("")}>
                                  {t("إلغاء البحث وعرض الكل", "Reset Search")}
                                </button>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination Footer */}
              {customerTotalPages > 1 && (
                <div className="pagination-bar">
                  <button
                    className="secondary-button small"
                    disabled={customerPage <= 1 || loadingCustomers}
                    onClick={() => setCustomerPage((p) => Math.max(1, p - 1))}
                  >
                    <ChevronRight size={15} className={ar ? "" : "rotate-180"} />
                    <span>{t("السابق", "Previous")}</span>
                  </button>
                  <span className="pagination-page-label">
                    {t(`صفحة ${customerPage} من ${customerTotalPages}`, `Page ${customerPage} of ${customerTotalPages}`)}
                  </span>
                  <button
                    className="secondary-button small"
                    disabled={customerPage >= customerTotalPages || loadingCustomers}
                    onClick={() => setCustomerPage((p) => Math.min(customerTotalPages, p + 1))}
                  >
                    <span>{t("التالي", "Next")}</span>
                    <ChevronLeft size={15} className={ar ? "" : "rotate-180"} />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ==================================================== */}
          {/* 7. ORDERS & FULFILLMENT VIEW */}
          {/* ==================================================== */}
          {(activeSection === "orders" || activeSection === "fulfillments") && (
            <div className="admin-view-block">
              <div className="section-toolbar-row">
                <div className="box-header">
                  <h2><ShoppingBag size={18} /> {t("سجل الطلبات والتسليم الرقمي", "Orders & Fulfillment Center")}</h2>
                  <p>{t("إدارة ومتابعة طلبات المتجر وتخصيص المفاتيح آلياً", "Manage customer purchases and assign licenses with one click")}</p>
                </div>
                <button className="primary-button" onClick={() => setShowCreateOrderModal(true)}>
                  <Plus size={16} /> {t("إنشاء طلب شراء جديد", "Create New Order")}
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
                      <th>{t("الإجمالي", "Amount")}</th>
                      <th>{t("الحالة", "Status")}</th>
                      <th>{t("المفاتيح المسلّمة", "Assigned Keys")}</th>
                      <th>{t("الإجراءات", "Actions")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ordersList.length ? (
                      ordersList.map((o) => {
                        const needsKey = o.status === "PAID" && (!o.assigned_keys || !o.assigned_keys.length);
                        return (
                          <tr key={o.id}>
                            <td><strong className="order-num-pill">{o.order_number}</strong></td>
                            <td>
                              <div>
                                <strong>{o.customer_name || o.customer_email.split("@")[0]}</strong>
                                <small dir="ltr">{o.customer_email}</small>
                              </div>
                            </td>
                            <td>{products.find((p) => p.id === o.product_id)?.name || o.product_id}</td>
                            <td><span className="badge-tag">{o.quantity}</span></td>
                            <td><strong>${Number(o.total_amount).toFixed(2)}</strong></td>
                            <td>
                              <span className={`status-badge ${o.status === "FULFILLED" ? "green" : o.status === "PAID" ? "blue" : "orange"}`}>
                                {o.status}
                              </span>
                            </td>
                            <td>
                              {o.assigned_keys?.length ? (
                                <span className="chip-key small">{o.assigned_keys[0].slice(0, 14)}...</span>
                              ) : (
                                <span className="text-muted">{t("بانتظار المفتاح", "Pending")}</span>
                              )}
                            </td>
                            <td>
                              {needsKey ? (
                                <button
                                  className="primary-button small"
                                  onClick={() => handleIssueKey(o.id)}
                                  disabled={busy}
                                >
                                  <Send size={13} /> {t("تسليم المفتاح الآن", "Issue Key")}
                                </button>
                              ) : (
                                <button
                                  className="btn-action small"
                                  onClick={() => openCustomerDetails(o.customer_email)}
                                >
                                  <UserRound size={13} /> {t("ملف العميل", "Customer")}
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={8} className="table-empty-cell">
                          {t("لا توجد طلبات مسجلة بعد.", "No orders placed yet.")}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ==================================================== */}
          {/* 8. COMPENSATIONS VIEW */}
          {/* ==================================================== */}
          {activeSection === "compensations" && (
            <div className="admin-view-block">
              <div className="section-toolbar-row">
                <div className="box-header">
                  <h2><Gift size={18} /> {t("مركز التعويضات والمنح المباشر", "Compensations & Direct Entitlements")}</h2>
                  <p>{t("منح تراخيص استثنائية، استبدال مفاتيح تالفة، وتوثيق سجلات التعويض", "Grant replacement keys, resolve issues, and log customer compensations")}</p>
                </div>
                <div className="action-buttons-group">
                  <button className="primary-button" onClick={() => { setGrantCustomerEmail(""); setShowGrantModal(true); }}>
                    <Plus size={16} /> {t("منح ترخيص مباشر", "Grant License")}
                  </button>
                  <button className="secondary-button" onClick={() => { setCompForm({ customerEmail: "", originalProductId: products[0]?.id || "", compensationType: "REPLACEMENT_KEY", details: "", reason: "" }); setShowCompensationModal(true); }}>
                    <Gift size={16} /> {t("تسجيل تعويض", "Log Compensation")}
                  </button>
                </div>
              </div>

              <div className="admin-card-panel">
                <div className="panel-heading-row">
                  <h3>{t("إجراءات التعويض السريعة", "Quick Compensation Tools")}</h3>
                </div>
                <div className="compensations-info-grid">
                  <div className="comp-info-card">
                    <h4>{t("1. المنح المباشر (Direct License Grant)", "Direct License Grant")}</h4>
                    <p>{t("إضافة منتج وترخيص فورياً إلى حساب العميل دون الحاجة لكتابة أو تفعيل مفتاح.", "Directly attach a product license to any customer account without needing a manual key.")}</p>
                    <button className="secondary-button" onClick={() => setShowGrantModal(true)}>
                      {t("فتح نموذج المنح المباشر", "Open Grant Modal")}
                    </button>
                  </div>
                  <div className="comp-info-card">
                    <h4>{t("2. استبدال مفتاح متعطل (Key Replacement)", "Key Replacement")}</h4>
                    <p>{t("إصدار مفتاح بديل وتوثيق رقم مرجعي رسمي في سجلات العميل للرجوع إليه مستقبلاً.", "Issue a replacement license key with a persistent audit reference number.")}</p>
                    <button className="secondary-button" onClick={() => setShowCompensationModal(true)}>
                      {t("فتح نموذج التعويض", "Open Compensation Modal")}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ==================================================== */}
          {/* 9. AUDIT LOGS VIEW */}
          {/* ==================================================== */}
          {activeSection.startsWith("logs-") && (
            <div className="admin-view-block">
              <div className="section-toolbar-row">
                <div className="log-filters-group">
                  {[
                    { id: "logs-all", labelAr: "الكل", labelEn: "All" },
                    { id: "logs-admin", labelAr: "الإدارة", labelEn: "Admin" },
                    { id: "logs-redemptions", labelAr: "التفعيلات", labelEn: "Redemptions" },
                    { id: "logs-security", labelAr: "الأمان", labelEn: "Security" },
                  ].map((filter) => (
                    <button
                      key={filter.id}
                      className={`filter-pill ${activeSection === filter.id ? "active" : ""}`}
                      onClick={() => {
                        setActiveSection(filter.id as AdminSection);
                        const cat = filter.id === "logs-admin" ? "ADMIN" : filter.id === "logs-redemptions" ? "REDEMPTION" : filter.id === "logs-security" ? "SECURITY" : "";
                        loadLogs(cat);
                      }}
                    >
                      {t(filter.labelAr, filter.labelEn)}
                    </button>
                  ))}
                </div>

                <button className="secondary-button" onClick={() => loadLogs()}>
                  <RefreshCw size={15} className={loadingLogs ? "spin" : ""} /> {t("تحديث السجلات", "Refresh")}
                </button>
              </div>

              <div className="admin-table-container">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>{t("الفئة", "Category")}</th>
                      <th>{t("العملية / الإجراء", "Action")}</th>
                      <th>{t("المنفّذ", "Actor")}</th>
                      <th>{t("التفاصيل", "Details")}</th>
                      <th>{t("الوقت والتاريخ", "Timestamp")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.length ? (
                      logs.map((log) => (
                        <tr key={log.id}>
                          <td>
                            <span className={`status-badge ${log.category === "ADMIN" ? "blue" : log.category === "REDEMPTION" ? "green" : log.category === "SECURITY" ? "danger" : "gray"}`}>
                              {log.category}
                            </span>
                          </td>
                          <td><strong>{log.action}</strong></td>
                          <td>{log.actor_email}</td>
                          <td>
                            <code className="details-code">
                              {JSON.stringify(log.details)}
                            </code>
                          </td>
                          <td>{new Date(log.created_at).toLocaleString(ar ? "ar-SA" : "en-US")}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="table-empty-cell">
                          {t("لا توجد سجلات مطابقة.", "No audit logs found.")}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ==================================================== */}
          {/* 10. STAFF & ROLES VIEW */}
          {/* ==================================================== */}
          {activeSection === "staff" && (
            <div className="admin-view-block">
              <div className="section-toolbar-row">
                <div className="box-header">
                  <h2><UserCheck size={18} /> {t("الموظفون والصلاحيات الإدارية", "Staff Members & Access Roles")}</h2>
                  <p>{t("الحسابات المصرح لها بالدخول إلى مركز التحكم وإدارة المنصة", "Authorized staff accounts permitted to access SpooFX Control Space")}</p>
                </div>
              </div>

              <div className="admin-table-container">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>{t("الموظف", "Staff Member")}</th>
                      <th>{t("البريد الإلكتروني", "Email")}</th>
                      <th>{t("الرتبة", "Role")}</th>
                      <th>{t("الصلاحيات", "Permissions")}</th>
                      <th>{t("الحالة", "Status")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>
                        <div className="table-customer-cell">
                          <span className="customer-avatar-badge admin">AD</span>
                          <strong>{currentUser.split("@")[0]}</strong>
                        </div>
                      </td>
                      <td><span dir="ltr">{currentUser}</span></td>
                      <td><span className="role-tag admin">{t("مدير عام", "Super Admin")}</span></td>
                      <td><span className="badge-tag blue">{t("جميع الصلاحيات (Full Access)", "Full Access")}</span></td>
                      <td><span className="status-badge green">{t("نشط وموثق", "Active & Verified")}</span></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ==================================================== */}
          {/* 11. SYSTEM SETTINGS & HEALTH VIEW */}
          {/* ==================================================== */}
          {(activeSection === "settings" || activeSection === "announcements") && (
            <div className="admin-view-block">
              <div className="section-toolbar-row">
                <div className="box-header">
                  <h2><Sliders size={18} /> {t("إعدادات المنصة وحالة النظام", "System Settings & Infrastructure")}</h2>
                  <p>{t("التحكم في رسائل الصيانة، تفعيل المنتجات، وفحص قاعدة البيانات", "Manage site metadata, maintenance flags, and database connectivity")}</p>
                </div>
              </div>

              <div className="settings-grid-layout">
                {/* General Settings */}
                <div className="admin-card-panel">
                  <div className="panel-heading-row">
                    <h3>{t("الإعدادات العامة", "General Settings")}</h3>
                  </div>

                  <form onSubmit={handleSaveSettings} className="card-form-body">
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
                      <label htmlFor="settings-site-desc">{t("وصف المنصة التعريفي", "Site Description")}</label>
                      <textarea
                        id="settings-site-desc"
                        rows={3}
                        value={settingsState.description}
                        onChange={(e) => setSettingsState({ ...settingsState, description: e.target.value })}
                      />
                    </div>

                    <div className="form-switch-row">
                      <span>{t("السماح للعملاء بتفعيل المفاتيح الجديدة", "Allow customers to redeem new license keys")}</span>
                      <input
                        type="checkbox"
                        checked={settingsState.allow_new_activations}
                        onChange={(e) => setSettingsState({ ...settingsState, allow_new_activations: e.target.checked })}
                      />
                    </div>

                    <div className="form-switch-row">
                      <span>{t("تفعيل وضع الصيانة العام (إيقاف الواجهة)", "Enable Global Maintenance Mode")}</span>
                      <input
                        type="checkbox"
                        checked={settingsState.maintenance_mode}
                        onChange={(e) => setSettingsState({ ...settingsState, maintenance_mode: e.target.checked })}
                      />
                    </div>

                    {settingsState.maintenance_mode && (
                      <div className="form-field">
                        <label htmlFor="settings-maint-msg">{t("رسالة الصيانة المعروضة للعملاء", "Maintenance Message for Users")}</label>
                        <textarea
                          id="settings-maint-msg"
                          rows={2}
                          value={settingsState.maintenance_message}
                          onChange={(e) => setSettingsState({ ...settingsState, maintenance_message: e.target.value })}
                        />
                      </div>
                    )}

                    <button className="primary-button" type="submit" disabled={busy}>
                      {busy ? <LoaderCircle className="spin" size={16} /> : <Check size={16} />}
                      {t("حفظ الإعدادات", "Save Settings")}
                    </button>
                  </form>
                </div>

                {/* Database Health Monitor */}
                <div className="admin-card-panel">
                  <div className="panel-heading-row">
                    <h3>{t("صحة خادم PostgreSQL", "PostgreSQL Server Health")}</h3>
                  </div>

                  <div className="card-form-body">
                    <div className="health-status-box">
                      <div className="status-indicator-row">
                        <span className={`health-dot ${dbStatus === "ok" ? "green" : "red"}`} />
                        <div>
                          <strong>{t("الاتصال المباشر بقاعدة البيانات", "PostgreSQL Live Ping")}</strong>
                          <p>{t("يتم فحص الاستعلامات عبر منفذ الشبكة الداخلي في Railway", "Connected via private cluster network")}</p>
                        </div>
                      </div>
                      <span className={`status-badge ${dbStatus === "ok" ? "green" : "danger"}`}>
                        {dbStatus === "ok" ? "LIVE ● 200 OK" : "ERROR"}
                      </span>
                    </div>

                    <button className="secondary-button" onClick={handleCheckDatabase} disabled={dbStatus === "checking"}>
                      <RefreshCw size={15} className={dbStatus === "checking" ? "spin" : ""} />
                      {t("إجراء فحص اتصال فوري", "Run Live Health Check")}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* ==================================================== */}
      {/* CUSTOMER DETAILS DRAWER */}
      {/* ==================================================== */}
      {showCustomerDrawer && customerDetails && (
        <div className="drawer-backdrop" onClick={() => setShowCustomerDrawer(false)}>
          <div className="drawer-card" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-header">
              <div className="drawer-user-info">
                {customerDetails.customer?.image ? (
                  <img src={customerDetails.customer.image} alt="" className="drawer-avatar-img" />
                ) : (
                  <span className="drawer-avatar">
                    <UserRound size={26} />
                  </span>
                )}
                <div>
                  <h3>{customerDetails.customer?.name || customerDetails.customer?.email}</h3>
                  <p dir="ltr">{customerDetails.customer?.email}</p>
                  <div className="drawer-badges-row">
                    <span className={`status-badge ${customerDetails.customer?.status === "SUSPENDED" ? "danger" : "green"}`}>
                      {customerDetails.customer?.status === "SUSPENDED" ? t("حساب موقوف", "Suspended") : t("حساب نشط", "Active")}
                    </span>
                    <button
                      className="copy-id-btn"
                      onClick={() => {
                        navigator.clipboard.writeText(customerDetails.customer?.id || "");
                        notify(t("تم نسخ معرف العميل!", "Copied Account ID!"));
                      }}
                      title={t("نسخ معرف العميل", "Copy Customer ID")}
                    >
                      <span>ID: {customerDetails.customer?.id ? customerDetails.customer.id.slice(0, 8) + "..." : ""}</span>
                      <Copy size={12} />
                    </button>
                  </div>
                </div>
              </div>
              <button className="modal-close" onClick={() => setShowCustomerDrawer(false)}>
                <X size={19} />
              </button>
            </div>

            {/* Quick Actions Bar */}
            <div className="drawer-actions-bar">
              <button
                className="btn-primary small"
                onClick={() => {
                  setGrantCustomerEmail(customerDetails.customer?.email || "");
                  setShowGrantModal(true);
                }}
              >
                <Plus size={14} /> {t("منح ترخيص", "Grant License")}
              </button>
              <button
                className="btn-secondary small"
                onClick={() => {
                  setCompForm({
                    customerEmail: customerDetails.customer?.email || "",
                    originalProductId: products[0]?.id || "",
                    compensationType: "REPLACEMENT_KEY",
                    details: "",
                    reason: "",
                  });
                  setShowCompensationModal(true);
                }}
              >
                <Gift size={14} /> {t("تعويض", "Compensate")}
              </button>
              <button
                className={`btn-action small ${customerDetails.customer?.status === "SUSPENDED" ? "green" : "danger"}`}
                onClick={() => handleToggleCustomerStatus(customerDetails.customer?.email, customerDetails.customer?.status)}
              >
                {customerDetails.customer?.status === "SUSPENDED" ? t("تنشيط الحساب", "Activate") : t("إيقاف الحساب", "Suspend")}
              </button>
            </div>

            {/* Drawer Tabs */}
            <div className="drawer-tabs-row">
              <button
                className={`drawer-tab-btn ${drawerActiveTab === "licenses" ? "active" : ""}`}
                onClick={() => setDrawerActiveTab("licenses")}
              >
                {t("المنتجات والتراخيص", "Licenses")} ({customerDetails.licenses?.length || 0})
              </button>
              <button
                className={`drawer-tab-btn ${drawerActiveTab === "orders" ? "active" : ""}`}
                onClick={() => setDrawerActiveTab("orders")}
              >
                {t("الطلبات", "Orders")} ({customerDetails.orders?.length || 0})
              </button>
              <button
                className={`drawer-tab-btn ${drawerActiveTab === "compensations" ? "active" : ""}`}
                onClick={() => setDrawerActiveTab("compensations")}
              >
                {t("التعويضات", "Compensations")} ({customerDetails.compensations?.length || 0})
              </button>
              <button
                className={`drawer-tab-btn ${drawerActiveTab === "logs" ? "active" : ""}`}
                onClick={() => setDrawerActiveTab("logs")}
              >
                {t("السجلات", "Logs")} ({customerDetails.logs?.length || 0})
              </button>
            </div>

            <div className="drawer-sections-content">
              {drawerActiveTab === "licenses" && (
                <div className="drawer-licenses-list">
                  {customerDetails.licenses?.length ? (
                    customerDetails.licenses.map((lic: any) => (
                      <div className="drawer-license-item" key={lic.id}>
                        <div className="lic-top">
                          <strong>{lic.product_name}</strong>
                          <span className={`status-badge ${lic.calculated_status === "ACTIVE" ? "green" : "danger"}`}>
                            {lic.calculated_status === "ACTIVE" ? t("نشط", "Active") : t("منتهي", "Expired")}
                          </span>
                        </div>
                        <div className="lic-details">
                          <p><code className="key-code">{lic.masked_code || `SPFX-******-${lic.code_suffix}`}</code></p>
                          <small>
                            {lic.expires_at
                              ? `${t("تاريخ الانتهاء: ", "Expires: ")} ${new Date(lic.expires_at).toLocaleDateString(ar ? "ar-SA" : "en-US")}`
                              : t("ترخيص دائم مدى الحياة", "Lifetime License")}
                          </small>
                        </div>
                        <div className="lic-actions">
                          <button
                            className="btn-action small"
                            onClick={() => {
                              setExtendLicenseId(lic.id);
                              setExtendDays(30);
                              setShowExtendModal(true);
                            }}
                          >
                            {t("تمديد الترخيص", "Extend License")}
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="table-empty-cell">{t("لا توجد تراخيص مفعلة لهذا الحساب.", "No licenses for this account.")}</div>
                  )}
                </div>
              )}

              {drawerActiveTab === "orders" && (
                <div className="drawer-orders-list">
                  {customerDetails.orders?.length ? (
                    customerDetails.orders.map((o: any) => (
                      <div className="drawer-order-item" key={o.id}>
                        <div className="lic-top">
                          <strong>{o.order_number}</strong>
                          <span className="status-badge blue">{o.status}</span>
                        </div>
                        <p>{o.product_name} · ${Number(o.total_amount).toFixed(2)}</p>
                        <small>{new Date(o.created_at).toLocaleDateString(ar ? "ar-SA" : "en-US")}</small>
                      </div>
                    ))
                  ) : (
                    <div className="table-empty-cell">{t("لا توجد طلبات سابقة.", "No orders found.")}</div>
                  )}
                </div>
              )}

              {drawerActiveTab === "compensations" && (
                <div className="drawer-comp-list">
                  {customerDetails.compensations?.length ? (
                    customerDetails.compensations.map((c: any) => (
                      <div className="drawer-order-item" key={c.id}>
                        <div className="lic-top">
                          <strong>{c.reference_number}</strong>
                          <span className="badge-tag">{c.compensation_type}</span>
                        </div>
                        <p>{c.original_product_name}: {c.reason}</p>
                        <small>{new Date(c.created_at).toLocaleDateString(ar ? "ar-SA" : "en-US")}</small>
                      </div>
                    ))
                  ) : (
                    <div className="table-empty-cell">{t("لا توجد تعويضات مسجلة.", "No compensations.")}</div>
                  )}
                </div>
              )}

              {drawerActiveTab === "logs" && (
                <div className="activity-list">
                  {customerDetails.logs?.length ? (
                    customerDetails.logs.map((l: any) => (
                      <div className="activity-item" key={l.id}>
                        <div className="activity-details">
                          <strong>{l.action}</strong>
                          <p>{l.actor_email}</p>
                        </div>
                        <span className="activity-date">{new Date(l.created_at).toLocaleDateString()}</span>
                      </div>
                    ))
                  ) : (
                    <div className="table-empty-cell">{t("لا توجد سجلات خاصة بهذا العميل.", "No logs found.")}</div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* PRODUCT MODAL (ADD / EDIT) */}
      {/* ==================================================== */}
      {showProductModal && (
        <div className="modal-backdrop" onClick={() => setShowProductModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingProduct ? t("تعديل منتج", "Edit Product") : t("إضافة منتج جديد", "Add Product")}</h2>
              <button className="modal-close" onClick={() => setShowProductModal(false)}><X size={19} /></button>
            </div>

            <form onSubmit={handleSaveProduct} className="modal-form">
              <div className="form-row-2">
                <div className="form-field">
                  <label>{t("اسم المنتج (عربي)", "Product Name (AR)")} *</label>
                  <input
                    value={productForm.name}
                    onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                    required
                    maxLength={120}
                  />
                </div>
                <div className="form-field">
                  <label>{t("اسم المنتج (إنجليزي)", "Product Name (EN)")}</label>
                  <input
                    value={productForm.nameEn}
                    onChange={(e) => setProductForm({ ...productForm, nameEn: e.target.value })}
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
                  rows={3}
                  value={productForm.description}
                  onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                />
              </div>

              <div className="form-row-2">
                <div className="form-field">
                  <label>{t("رابط الوصول HTTPS (اختياري)", "Access URL HTTPS (Optional)")}</label>
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

              <div className="form-field">
                <label>{t("تعليمات التشغيل والتثبيت", "Operating Instructions")}</label>
                <textarea
                  rows={4}
                  value={productForm.instructions}
                  onChange={(e) => setProductForm({ ...productForm, instructions: e.target.value })}
                  placeholder="1. الخطوة الأولى...&#10;2. الخطوة الثانية..."
                />
              </div>

              <div className="form-switch-row">
                <span>{t("إظهار المنتج في مكتبة العملاء", "Visible in customer catalog")}</span>
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
      {/* DIRECT LICENSE GRANT MODAL */}
      {/* ==================================================== */}
      {showGrantModal && (
        <div className="modal-backdrop" onClick={() => setShowGrantModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{t("منح ترخيص مباشر لعميل", "Grant Direct License")}</h2>
              <button className="modal-close" onClick={() => setShowGrantModal(false)}><X size={19} /></button>
            </div>

            <form onSubmit={handleGrantDirectLicense} className="modal-form">
              <div className="form-field">
                <label>{t("البريد الإلكتروني للعميل", "Customer Email")} *</label>
                <input
                  type="email"
                  value={grantCustomerEmail}
                  onChange={(e) => setGrantCustomerEmail(e.target.value)}
                  placeholder="customer@gmail.com"
                  dir="ltr"
                  required
                />
              </div>

              <div className="form-field">
                <label>{t("المنتج الممنوح", "Product to Grant")} *</label>
                <select
                  value={grantProductId}
                  onChange={(e) => setGrantProductId(e.target.value)}
                  required
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-field">
                <label>{t("مدة الترخيص", "Duration")}</label>
                <select value={grantDuration} onChange={(e) => setGrantDuration(Number(e.target.value))}>
                  <option value={7}>{t("7 أيام", "7 Days")}</option>
                  <option value={30}>{t("30 يوماً", "30 Days")}</option>
                  <option value={90}>{t("90 يوماً", "90 Days")}</option>
                  <option value={365}>{t("سنة", "1 Year")}</option>
                  <option value={3650}>{t("مدى الحياة", "Lifetime")}</option>
                </select>
              </div>

              <div className="form-field">
                <label>{t("سبب المنح (للتوثيق في السجل)", "Reason (for audit log)")}</label>
                <input
                  value={grantReason}
                  onChange={(e) => setGrantReason(e.target.value)}
                  placeholder={t("مثال: ترخيص مجاني، عميل مميز، ترقية...", "e.g., VIP customer, promotional grant...")}
                />
              </div>

              <div className="modal-actions">
                <button type="button" className="secondary-button" onClick={() => setShowGrantModal(false)}>
                  {t("إلغاء", "Cancel")}
                </button>
                <button type="submit" className="primary-button" disabled={busy || !grantCustomerEmail.trim()}>
                  {busy ? <LoaderCircle className="spin" size={16} /> : <Check size={16} />}
                  {t("منح الترخيص الآن", "Grant License Now")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* EXTEND LICENSE MODAL */}
      {/* ==================================================== */}
      {showExtendModal && (
        <div className="modal-backdrop" onClick={() => setShowExtendModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{t("تمديد صلاحية الترخيص", "Extend License Validity")}</h2>
              <button className="modal-close" onClick={() => setShowExtendModal(false)}><X size={19} /></button>
            </div>

            <form onSubmit={handleExtendLicense} className="modal-form">
              <div className="form-field">
                <label>{t("عدد الأيام الإضافية", "Additional Days")} *</label>
                <input
                  type="number"
                  min={1}
                  max={365}
                  value={extendDays}
                  onChange={(e) => setExtendDays(Number(e.target.value))}
                  required
                />
              </div>

              <div className="modal-actions">
                <button type="button" className="secondary-button" onClick={() => setShowExtendModal(false)}>
                  {t("إلغاء", "Cancel")}
                </button>
                <button type="submit" className="primary-button" disabled={busy}>
                  {busy ? <LoaderCircle className="spin" size={16} /> : <Check size={16} />}
                  {t("تمديد الترخيص", "Extend License")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* CREATE ORDER MODAL */}
      {/* ==================================================== */}
      {showCreateOrderModal && (
        <div className="modal-backdrop" onClick={() => setShowCreateOrderModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{t("تسجيل طلب شراء جديد", "Create New Order")}</h2>
              <button className="modal-close" onClick={() => setShowCreateOrderModal(false)}><X size={19} /></button>
            </div>

            <form onSubmit={handleCreateOrder} className="modal-form">
              <div className="form-row-2">
                <div className="form-field">
                  <label>{t("بريد العميل", "Customer Email")} *</label>
                  <input
                    type="email"
                    dir="ltr"
                    value={orderForm.customerEmail}
                    onChange={(e) => setOrderForm({ ...orderForm, customerEmail: e.target.value })}
                    required
                  />
                </div>
                <div className="form-field">
                  <label>{t("اسم العميل (اختياري)", "Customer Name")}</label>
                  <input
                    value={orderForm.customerName}
                    onChange={(e) => setOrderForm({ ...orderForm, customerName: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-row-2">
                <div className="form-field">
                  <label>{t("المنتج", "Product")} *</label>
                  <select
                    value={orderForm.productId}
                    onChange={(e) => setOrderForm({ ...orderForm, productId: e.target.value })}
                  >
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
                <div className="form-field">
                  <label>{t("الكمية", "Quantity")}</label>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={orderForm.quantity}
                    onChange={(e) => setOrderForm({ ...orderForm, quantity: Number(e.target.value) })}
                    required
                  />
                </div>
              </div>

              <div className="form-row-2">
                <div className="form-field">
                  <label>{t("المبلغ الإجمالي ($)", "Total Amount ($)")}</label>
                  <input
                    type="number"
                    step="0.01"
                    min={0}
                    value={orderForm.totalAmount}
                    onChange={(e) => setOrderForm({ ...orderForm, totalAmount: Number(e.target.value) })}
                  />
                </div>
                <div className="form-field">
                  <label>{t("طريقة الدفع", "Payment Method")}</label>
                  <input
                    value={orderForm.paymentMethod}
                    onChange={(e) => setOrderForm({ ...orderForm, paymentMethod: e.target.value })}
                  />
                </div>
              </div>

              <div className="modal-actions">
                <button type="button" className="secondary-button" onClick={() => setShowCreateOrderModal(false)}>
                  {t("إلغاء", "Cancel")}
                </button>
                <button type="submit" className="primary-button" disabled={busy || !orderForm.customerEmail.trim()}>
                  {busy ? <LoaderCircle className="spin" size={16} /> : <Check size={16} />}
                  {t("تسجيل الطلب", "Create Order")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* COMPENSATION MODAL */}
      {/* ==================================================== */}
      {showCompensationModal && (
        <div className="modal-backdrop" onClick={() => setShowCompensationModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{t("تسجيل تعويض لعميل", "Log Customer Compensation")}</h2>
              <button className="modal-close" onClick={() => setShowCompensationModal(false)}><X size={19} /></button>
            </div>

            <form onSubmit={handleCreateCompensation} className="modal-form">
              <div className="form-field">
                <label>{t("بريد العميل", "Customer Email")} *</label>
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
                  placeholder={t("اذكر المشكلة التي واجهها العميل مع المفتاح السابق...", "Explain the issue faced by the customer...")}
                  required
                />
              </div>

              <div className="modal-actions">
                <button type="button" className="secondary-button" onClick={() => setShowCompensationModal(false)}>
                  {t("إلغاء", "Cancel")}
                </button>
                <button type="submit" className="primary-button" disabled={busy || !compForm.customerEmail.trim() || !compForm.reason.trim()}>
                  {busy ? <LoaderCircle className="spin" size={16} /> : <Check size={16} />}
                  {t("تسجيل التعويض", "Record Compensation")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
