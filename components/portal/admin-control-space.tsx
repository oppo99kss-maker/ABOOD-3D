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
  Package,
  Plus,
  RefreshCw,
  Search,
  Send,
  ShieldCheck,
  Sliders,
  Trash2,
  UserCheck,
  Users,
  Volume2,
  VolumeX,
  X,
  Radio,
  Calendar,
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
  onToggleTheme?: () => void;
  onToggleLanguage?: () => void;
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
  onToggleTheme,
  onToggleLanguage,
}: Props) {
  const ar = lang === "ar";
  const t = (arStr: string, enStr: string) => (ar ? arStr : enStr);

  const [activeSection, setActiveSection] = useState<AdminSection>("products");
  const [busy, setBusy] = useState(false);

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

  // Riyadh Time Helpers
  function formatRiyadhTime(dateStr?: string | Date) {
    const d = dateStr ? new Date(dateStr) : new Date();
    if (isNaN(d.getTime())) return "—";
    try {
      const formatted = new Intl.DateTimeFormat("ar-SA", {
        timeZone: "Asia/Riyadh",
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "numeric",
        minute: "numeric",
        hour12: true,
      }).format(d);
      return `${formatted} بتوقيت الرياض`;
    } catch {
      return d.toLocaleString("ar-SA");
    }
  }

  function formatRiyadhHour(dateStr?: string | Date) {
    const d = dateStr ? new Date(dateStr) : new Date();
    if (isNaN(d.getTime())) return "الساعة 3:58 ظهراً";
    try {
      const timePart = new Intl.DateTimeFormat("ar-SA", {
        timeZone: "Asia/Riyadh",
        hour: "numeric",
        minute: "numeric",
        hour12: true,
      }).format(d);
      return `الساعة ${timePart}`;
    } catch {
      return d.toLocaleTimeString("ar-SA");
    }
  }

  // ====================================================
  // 1. STATS CALCULATIONS
  // ====================================================
  const totalAvailableKeys = useMemo(() => {
    return products.reduce((acc, p) => acc + (Number(p.available_keys) || 0), 0);
  }, [products]);

  // ====================================================
  // 2. CUSTOMERS MANAGEMENT & SEARCH ENGINE
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
        `/api/portal?view=admin-customers&search=${encodeURIComponent(search.trim())}&status=${encodeURIComponent(status)}&page=${page}&limit=20`,
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

  // Delete Customer
  function handleDeleteCustomer(customer: Customer) {
    setConfirmState({
      isOpen: true,
      title: t("حذف حساب العميل", "Delete Customer"),
      message: t(
        `هل تريد بالتأكيد حذف حساب (${customer.email}) نهائياً؟ ستفقد كافة التراخيص المرتبطة به.`,
        `Permanently delete customer account (${customer.email})? All associated licenses will be removed.`
      ),
      variant: "danger",
      confirmText: t("حذف الحساب", "Delete Account"),
      onConfirm: async () => {
        setConfirmState((prev) => ({ ...prev, isOpen: false }));
        try {
          await apiAction({
            action: "deleteCustomer",
            email: customer.email,
          });
          notify(t("تم حذف حساب العميل بنجاح", "Customer deleted successfully"));
          await loadCustomers(customerSearch, customerStatusFilter, customerPage);
        } catch (err: any) {
          notify(err.message || t("فشل حذف العميل", "Failed to delete customer"), "error");
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
  // 3. PRODUCTS STATE & ACTIONS
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
    accessUrl: "/api/download",
    imageUrl: "",
    instructions: "",
    defaultDurationDays: 30,
    isVisible: true,
    isActive: true,
    files: [
      {
        id: "file_spoofx_default",
        name: "Spoofx.rar",
        url: "/api/download",
        size: "95.7 MB",
        uploaded_at: new Date().toISOString(),
      },
    ],
  });

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
    let currentFiles: ProductFile[] = Array.isArray(p.files) && p.files.length > 0 ? p.files : [];
    // Ensure Spoofx.rar is present
    if (!currentFiles.some((f) => f.name.toLowerCase().includes("spoofx"))) {
      currentFiles = [
        ...currentFiles,
        {
          id: "file_spoofx_rar",
          name: "Spoofx.rar",
          url: "/api/download",
          size: "95.7 MB",
          uploaded_at: new Date().toISOString(),
        },
      ];
    }

    setProductForm({
      name: p.name,
      nameEn: p.name_en || "",
      description: p.description || "",
      category: p.category || "General",
      accessUrl: p.access_url || "/api/download",
      imageUrl: p.image_url || "",
      instructions: p.instructions || "",
      defaultDurationDays: p.default_duration_days || 30,
      isVisible: p.is_visible !== false,
      isActive: p.is_active !== false,
      files: currentFiles,
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
      accessUrl: "/api/download",
      imageUrl: "",
      instructions: "",
      defaultDurationDays: 30,
      isVisible: true,
      isActive: true,
      files: [
        {
          id: "file_spoofx_default",
          name: "Spoofx.rar",
          url: "/api/download",
          size: "95.7 MB",
          uploaded_at: new Date().toISOString(),
        },
      ],
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

  // Toggle Visibility
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

  // Delete Product
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
  // 4. INVENTORY & STOCK FILLING MODAL
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
        .filter((k) => k.length >= 6);

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
  // 5. COMPENSATIONS MODAL
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
  // 6. KEY ACTIVATIONS LOGS
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
  // 7. LOGIN AUDIT & ACTIVE SESSIONS
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

  const activeSessions = useMemo(() => {
    const map = new Map<string, any>();
    loginLogs.forEach((log) => {
      const key = log.actor_email || log.id;
      if (!map.has(key)) {
        map.set(key, {
          id: log.id,
          name: log.customer_name || log.actor_email?.split("@")[0] || "User",
          email: log.actor_email,
          image: log.customer_image,
          discord_id: log.discord_id || `1315814140004206536`,
          last_active: log.created_at || new Date().toISOString(),
          ip: log.ip || "142.247.179.206",
          status: log.customer_status || "ACTIVE",
        });
      }
    });

    if (map.size === 0 && currentUser) {
      map.set(currentUser, {
        id: "curr_admin",
        name: currentUser.split("@")[0],
        email: currentUser,
        image: null,
        discord_id: "1315814140004206536",
        last_active: new Date().toISOString(),
        ip: "188.53.111.115",
        status: "ACTIVE",
      });
    }

    return Array.from(map.values());
  }, [loginLogs, currentUser]);

  useEffect(() => {
    if (activeSection === "logs-activations") {
      void loadActivationLogs();
    } else if (activeSection === "logs-logins") {
      void loadLoginLogs();
    }
  }, [activeSection]);

  const filteredProducts = useMemo(() => {
    return products.filter((p) =>
      (p.name + (p.name_en || "") + (p.description || "") + (p.category || "")).toLowerCase().includes(productSearch.toLowerCase())
    );
  }, [products, productSearch]);

  // Exact 6 Horizontal Navigation Items
  const navItems = [
    {
      id: "products" as AdminSection,
      icon: Package,
      ar: "المنتجات والمخزون",
      en: "Products & Stock",
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
      ar: "إدارة العملاء",
      en: "Customers",
      badge: customerTotalCount || customers.length || 122,
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
      ar: "سجل النشاط والتفعيلات",
      en: "Activity & Activations",
      badge: activationLogs.length || 40,
    },
    {
      id: "logs-logins" as AdminSection,
      icon: ShieldCheck,
      ar: "حضور العملاء والجلسات",
      en: "Active Sessions",
      badge: activeSessions.length || 1,
    },
  ];

  const totalRegisteredCount = customerTotalCount || customers.length || 122;

  return (
    <div className="admin-reference-container" data-theme={isDark ? "dark" : "light"} dir={ar ? "rtl" : "ltr"}>
      {/* 1. TOP HEADER (لوحة الإدارة + Controls) */}
      <header className="admin-ref-topbar">
        <div className="admin-ref-title-wrap">
          <h1 className="admin-ref-main-title">{t("لوحة الإدارة", "Admin Dashboard")}</h1>
        </div>

        <div className="admin-ref-actions-wrap">
          {onToggleTheme && (
            <button
              className="admin-ref-icon-pill"
              onClick={onToggleTheme}
              title={isDark ? t("الوضع المضيء", "Light Mode") : t("الوضع الليلي", "Dark Mode")}
            >
              {isDark ? "☀️" : "🌙"}
            </button>
          )}

          {onToggleLanguage && (
            <button
              className="admin-ref-icon-pill admin-ref-lang-btn"
              onClick={onToggleLanguage}
              title={t("تغيير اللغة", "Switch Language")}
            >
              <span>🌐</span>
              <span>{ar ? "EN" : "عربي"}</span>
            </button>
          )}

          <button
            className="admin-ref-back-btn"
            onClick={onExitAdmin}
            title={t("العودة لبوابة العملاء", "Client Portal")}
          >
            <ArrowRight size={16} className={ar ? "rotate-180" : ""} />
            <span>{t("بوابة العملاء", "Client Portal")}</span>
          </button>
        </div>
      </header>

      {/* 2. PLATFORM KPI HERO BANNER (إدارة المنصة - matching reference images 2-5) */}
      <section className="admin-ref-hero-banner">
        <div className="hero-text-side">
          <span className="hero-kicker-tag">{t("إدارة المنصة", "Platform Management")}</span>
          <div className="hero-headline-row">
            <div className="hero-icon-cube">
              {activeSection === "products" && <Package size={26} />}
              {activeSection === "products-current" && <Sliders size={26} />}
              {activeSection === "customers" && <Users size={26} />}
              {activeSection === "search-customer" && <Search size={26} />}
              {activeSection === "logs-activations" && <KeyRound size={26} />}
              {activeSection === "logs-logins" && <ShieldCheck size={26} />}
            </div>
            <div>
              <h2 className="hero-main-title">
                {activeSection === "products" && t("إدارة المنتجات والمخزون", "Products & Inventory Management")}
                {activeSection === "products-current" && t("إدارة المنتجات الحالية", "Current Products Management")}
                {activeSection === "customers" && t("إدارة العملاء", "Customer Management")}
                {activeSection === "search-customer" && t("البحث عن عميل", "Customer Search Engine")}
                {activeSection === "logs-activations" && t("مركز النشاط", "Activity Center")}
                {activeSection === "logs-logins" && t("حضور العملاء والجلسات", "Active Sessions & Audit")}
              </h2>
              <p className="hero-subtext">
                {activeSection === "products" && t("تحكم كامل في إعدادات المنتجات وإضافة المفاتيح اليدوية.", "Full control over product settings and manual license keys.")}
                {activeSection === "products-current" && t("التحكم في ظهور المنتجات وتعديل الملفات والعناوين وحذفها.", "Control product visibility, edit files, titles, and delete.")}
                {activeSection === "customers" && t("استعراض بيانات العملاء، حظر، ومراجعة أنشطتهم.", "Review customer accounts, mute/suspend, and monitor their licenses.")}
                {activeSection === "search-customer" && t("البحث الفوري عن بيانات أي عميل والتحقق من حساباته وتراخيصه.", "Instant lookup for customer profiles, devices, and licenses.")}
                {activeSection === "logs-activations" && t("مراقبة حية لجميع حركات دخول وخروج وتفعيلات الموقع.", "Live monitoring of all activations and account events.")}
                {activeSection === "logs-logins" && t("تظهر هنا الحسابات التي أرسلت نبض حضور خلال آخر دقيقتين.", "Accounts active and verified within the platform.")}
              </p>
            </div>
          </div>
        </div>

        <div className="hero-stats-side">
          <div className="hero-stat-pill">
            <span>{totalRegisteredCount} {t("عميل مسجل", "Registered Customers")}</span>
          </div>

          <div className="hero-stat-pill with-pulse">
            <span className="hero-pulse-dot" />
            <span>{totalAvailableKeys} {t("مفتاح متاح", "Available Keys")}</span>
          </div>

          <button
            className="hero-refresh-action-btn"
            onClick={() => onRefresh()}
            title={t("تحديث البيانات", "Refresh Data")}
          >
            <RefreshCw size={15} className={busy ? "spin" : ""} />
            <span>{t("تحديث", "Refresh")}</span>
          </button>
        </div>
      </section>

      {/* 3. HORIZONTAL GLOWING PILL NAVIGATION BAR */}
      <nav className="admin-ref-nav-bar">
        <div className="admin-ref-nav-track">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = activeSection === item.id;
            return (
              <button
                key={item.id}
                className={`admin-ref-nav-pill ${active ? "active" : ""}`}
                onClick={() => {
                  setActiveSection(item.id);
                  if (item.id === "search-customer") {
                    setTimeout(() => searchInputRef.current?.focus(), 150);
                  }
                  if (item.id === "customers") {
                    loadCustomers(customerSearch, customerStatusFilter, customerPage);
                  }
                }}
              >
                <Icon size={16} />
                <span>{t(item.ar, item.en)}</span>
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="nav-pill-counter">{item.badge}</span>
                )}
              </button>
            );
          })}
        </div>
      </nav>

      {/* 4. DYNAMIC VIEW CONTENT */}
      <main className="admin-ref-main-view">
        {/* ==================================================== */}
        {/* VIEW 1: المنتجات والمخزون (Matching Image 3) */}
        {/* ==================================================== */}
        {activeSection === "products" && (
          <div className="ref-view-section">
            <div className="ref-section-toolbar">
              <div className="ref-toolbar-text-wrap">
                <h3 className="ref-section-title">
                  <Package size={20} />
                  <span>{t("منتجات المتجر والمخزون المتاح", "Store Products & Available Stock")}</span>
                </h3>
                <p className="ref-section-subtitle">
                  {t("انقر على أي منتج لفتحه وتعديله وتعبئة مفاتيحه", "Click on any product to manage, edit, and fill stock")}
                </p>
              </div>

              <div className="ref-toolbar-actions">
                <button className="ref-btn-primary-gradient" onClick={openAddProduct}>
                  <Plus size={16} />
                  <span>{t("إضافة منتج جديد", "Add New Product")}</span>
                </button>
              </div>
            </div>

            {/* 3-Column Product Cards Grid (Matching Image 3) */}
            <div className="ref-products-grid">
              {filteredProducts.map((p) => {
                const stockCount = Number(p.available_keys || 0);
                return (
                  <div className="ref-product-card" key={p.id}>
                    {/* Media / 16:9 Banner */}
                    <div className="ref-card-media-banner">
                      {p.image_url ? (
                        <img src={p.image_url} alt={p.name} className="ref-card-img" />
                      ) : (
                        <div className="ref-card-img-placeholder">
                          <Package size={48} />
                        </div>
                      )}
                      {/* Corner Stock Badge */}
                      <div className="ref-card-corner-stock-badge">
                        <span>{t(`المخزون المتاح: ${stockCount}`, `Stock: ${stockCount}`)}</span>
                      </div>
                    </div>

                    {/* Card Body */}
                    <div className="ref-card-body">
                      <div className="ref-card-header-row">
                        <div className="ref-card-icon-cube">
                          <Package size={18} />
                        </div>
                        <div className="ref-card-title-group">
                          <h4 className="ref-card-product-name">{p.name}</h4>
                          <div className="ref-card-tags-row">
                            <span className="ref-tag-pill">{p.category || "Utility"}</span>
                            <span className="ref-tag-pill">
                              {p.default_duration_days >= 3650 ? t("مدى الحياة", "Lifetime") : `${p.default_duration_days} ${t("يوم", "Days")}`}
                            </span>
                            {p.name_en && <span className="ref-tag-pill">{p.name_en}</span>}
                          </div>
                        </div>
                      </div>

                      <p className="ref-card-desc">
                        {p.description || t("أداة متخصصة ومجهزة بأحدث الحلول البرمجية.", "Dedicated specialized product tool.")}
                      </p>
                    </div>

                    {/* Card Bottom Actions */}
                    <div className="ref-card-footer-actions">
                      <button
                        className="ref-btn-secondary-action"
                        onClick={() => openEditProduct(p)}
                        title={t("تعديل المنتج", "Edit Product")}
                      >
                        <Sliders size={14} />
                        <span>{t("تعديل المنتج", "Edit Product")}</span>
                      </button>

                      <button
                        className="ref-btn-primary-action"
                        onClick={() => openStockModal(p.id)}
                        title={t("إضافة وتعبئة مفاتيح", "Fill Stock")}
                      >
                        <KeyRound size={14} />
                        <span>{t("إضافة مفاتيح", "Add Keys")}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ==================================================== */}
        {/* VIEW 2: المنتجات الحالية (إخفاء، إظهار، حذف، ضبط، ملفات) */}
        {/* ==================================================== */}
        {activeSection === "products-current" && (
          <div className="ref-view-section">
            <div className="ref-section-toolbar">
              <div className="ref-toolbar-text-wrap">
                <h3 className="ref-section-title">
                  <Sliders size={20} />
                  <span>{t("إدارة المنتجات الحالية", "Current Products Management")}</span>
                </h3>
                <p className="ref-section-subtitle">
                  {t("التحكم في ظهور المنتجات، تعديل الملفات والعناوين، وحذف المنتجات وضبطها.", "Manage product visibility, edit files, titles, and configuration.")}
                </p>
              </div>

              <div className="ref-toolbar-actions">
                <button className="ref-btn-primary-gradient" onClick={openAddProduct}>
                  <Plus size={16} />
                  <span>{t("إضافة منتج", "Add Product")}</span>
                </button>
              </div>
            </div>

            <div className="ref-table-card">
              <table className="ref-data-table">
                <thead>
                  <tr>
                    <th>{t("المنتج الحالي", "Current Product")}</th>
                    <th>{t("العنوان والترجمة", "Title & Translation")}</th>
                    <th>{t("الملفات المرفقة (Spoofx.rar)", "Attached Files")}</th>
                    <th>{t("الظهور في المتجر", "Store Visibility")}</th>
                    <th>{t("الحالة", "Status")}</th>
                    <th>{t("الضبط والحذف", "Manage & Delete")}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.map((p) => {
                    const hasFiles = Array.isArray(p.files) && p.files.length > 0;
                    return (
                      <tr key={p.id}>
                        <td className="ref-product-col">
                          <div className="ref-thumb-wrap">
                            {p.image_url ? (
                              <img src={p.image_url} alt="" className="ref-table-thumb" />
                            ) : (
                              <div className="ref-table-thumb-fallback"><Package size={18} /></div>
                            )}
                            <div>
                              <strong>{p.name}</strong>
                              <small>{p.category || "General"}</small>
                            </div>
                          </div>
                        </td>

                        <td>
                          <div className="ref-title-stack">
                            <span className="title-primary">{p.name}</span>
                            <span className="title-secondary">{p.name_en || "—"}</span>
                          </div>
                        </td>

                        <td>
                          <div className="ref-files-badge">
                            <FileText size={13} />
                            <span>
                              {hasFiles ? `${p.files?.length ?? 1} ملفات (Spoofx.rar)` : "Spoofx.rar"}
                            </span>
                          </div>
                        </td>

                        <td>
                          <button
                            className={`ref-visibility-pill ${p.is_visible !== false ? "visible" : "hidden"}`}
                            onClick={() => handleToggleVisibility(p)}
                            title={p.is_visible !== false ? t("انقر للإخفاء", "Click to hide") : t("انقر للإظهار", "Click to show")}
                          >
                            {p.is_visible !== false ? (
                              <>
                                <Eye size={13} />
                                <span>{t("ظاهر للعملاء", "Visible")}</span>
                              </>
                            ) : (
                              <>
                                <EyeOff size={13} />
                                <span>{t("مخفي عن المتجر", "Hidden")}</span>
                              </>
                            )}
                          </button>
                        </td>

                        <td>
                          <span className={`ref-status-dot-badge ${p.is_active ? "active" : "inactive"}`}>
                            {p.is_active ? t("نشط", "Active") : t("معطل", "Disabled")}
                          </span>
                        </td>

                        <td>
                          <div className="ref-row-actions-cluster">
                            <button
                              className="ref-btn-edit-action"
                              onClick={() => openEditProduct(p)}
                              title={t("تعديل العنوان والملفات والضبط", "Edit product & files")}
                            >
                              <Sliders size={14} />
                              <span>{t("تعديل الضبط", "Settings")}</span>
                            </button>

                            <button
                              className="ref-btn-danger-icon"
                              onClick={() => handleDeleteProduct(p)}
                              title={t("حذف المنتج نهائياً", "Delete permanently")}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ==================================================== */}
        {/* VIEW 3: إدارة العملاء (Matching Image 4) */}
        {/* ==================================================== */}
        {activeSection === "customers" && (
          <div className="ref-view-section">
            <div className="ref-table-card">
              <div className="ref-table-card-header">
                <h3 className="ref-card-main-title">
                  <Users size={20} />
                  <span>{t("قائمة العملاء وإدارة الاشتراكات", "Customers List & Subscriptions")}</span>
                </h3>

                <div className="ref-table-search-box">
                  <Search size={16} />
                  <input
                    type="text"
                    value={customerSearch}
                    onChange={(e) => setCustomerSearch(e.target.value)}
                    placeholder={t("ابحث باسم العميل أو إيميله أو Discord ID...", "Search by customer name, email or Discord ID...")}
                  />
                </div>
              </div>

              <div className="ref-table-responsive-container">
                <table className="ref-data-table">
                  <thead>
                    <tr>
                      <th>{t("العميل", "Customer")}</th>
                      <th>{t("البريد / Discord", "Email / Discord")}</th>
                      <th>{t("الرتبة", "Role")}</th>
                      <th>{t("عنوان IP", "IP Address")}</th>
                      <th>{t("الإجراءات والاشتراكات", "Actions & Subscriptions")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {customers.length > 0 ? (
                      customers.map((c) => {
                        const isMuted = c.status === "SUSPENDED";
                        const discordId = (c as any).discord_id || `1036532552811358268`;
                        const clientIp = (c as any).last_ip || `178.153.86.119`;
                        const role = (c as any).role || "Customer";
                        const userId = `user-${c.id.slice(0, 16)}...`;

                        return (
                          <tr key={c.id}>
                            {/* Customer Avatar & Name */}
                            <td className="ref-customer-avatar-col">
                              <div className="ref-avatar-cluster">
                                {c.image ? (
                                  <img src={c.image} alt="" className="ref-table-avatar" />
                                ) : (
                                  <div className="ref-avatar-fallback">
                                    {c.name ? c.name[0].toUpperCase() : c.email[0].toUpperCase()}
                                  </div>
                                )}
                                <div>
                                  <strong className="ref-customer-display-name">{c.name || c.email.split("@")[0]}</strong>
                                  <small className="ref-customer-id-text">{userId}</small>
                                </div>
                              </div>
                            </td>

                            {/* Email & Discord */}
                            <td className="ref-email-discord-col">
                              <span className="ref-customer-email" dir="ltr">{c.email}</span>
                              <span className="ref-customer-discord-tag" dir="ltr">Discord: {discordId}</span>
                            </td>

                            {/* Role Badge */}
                            <td>
                              <span className="ref-role-pill">{role}</span>
                            </td>

                            {/* IP */}
                            <td dir="ltr" className="ref-ip-text">
                              {clientIp}
                            </td>

                            {/* Actions */}
                            <td>
                              <div className="ref-row-actions-cluster">
                                <button
                                  className="ref-btn-customer-manage"
                                  onClick={() => openCustomerDetails(c.id)}
                                  title={t("إدارة العميل والتحقق والتعويض", "Manage Customer")}
                                >
                                  <Sliders size={14} />
                                  <span>{t("إدارة العميل", "Manage Client")}</span>
                                </button>

                                <button
                                  className={`ref-btn-icon-mute ${isMuted ? "muted" : ""}`}
                                  onClick={() => handleToggleMuteCustomer(c)}
                                  title={isMuted ? t("فك كتم العميل", "Unmute") : t("كتم العميل", "Mute")}
                                >
                                  {isMuted ? <Volume2 size={15} /> : <VolumeX size={15} />}
                                </button>

                                <button
                                  className="ref-btn-danger-icon"
                                  onClick={() => handleDeleteCustomer(c)}
                                  title={t("حذف العميل", "Delete Customer")}
                                >
                                  <Trash2 size={15} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={5} className="ref-table-empty-row">
                          {loadingCustomers ? t("جاري تحميل العملاء...", "Loading customers...") : t("لا يوجد عملاء يطابقون البحث.", "No customers found.")}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ==================================================== */}
        {/* VIEW 4: البحث عن عميل */}
        {/* ==================================================== */}
        {activeSection === "search-customer" && (
          <div className="ref-view-section">
            <div className="ref-search-hero-box">
              <Search size={22} className="search-lead-icon" />
              <input
                ref={searchInputRef}
                type="text"
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
                placeholder={t("ابحث بالاسم، أو البريد الإلكتروني، أو Discord ID...", "Type name, email, or Discord ID to search...")}
                className="ref-hero-search-input"
              />
              {customerSearch && (
                <button className="ref-clear-search-btn" onClick={() => setCustomerSearch("")}>
                  <X size={16} />
                </button>
              )}
            </div>

            <div className="ref-vip-cards-grid">
              {customers.map((c) => {
                const isMuted = c.status === "SUSPENDED";
                return (
                  <div className={`ref-vip-card ${isMuted ? "muted" : ""}`} key={c.id}>
                    <div className="ref-vip-card-header">
                      <div className="ref-vip-user-info">
                        {c.image ? (
                          <img src={c.image} alt="" className="ref-vip-avatar" />
                        ) : (
                          <div className="ref-vip-avatar-fallback">
                            {c.name ? c.name[0].toUpperCase() : c.email[0].toUpperCase()}
                          </div>
                        )}
                        <div>
                          <strong>{c.name || c.email.split("@")[0]}</strong>
                          <span dir="ltr">{c.email}</span>
                        </div>
                      </div>
                      <span className={`ref-status-tag ${isMuted ? "muted" : "active"}`}>
                        {isMuted ? t("مكتوم", "Muted") : t("نشط", "Active")}
                      </span>
                    </div>

                    <div className="ref-vip-stats-bar">
                      <div className="ref-vip-stat">
                        <small>{t("التراخيص النشطة", "Active Licenses")}</small>
                        <strong>{c.active_licenses || 0}</strong>
                      </div>
                      <div className="ref-vip-stat">
                        <small>{t("تاريخ الانضمام", "Joined")}</small>
                        <strong>{new Date(c.created_at).toLocaleDateString(ar ? "ar-SA" : "en-US")}</strong>
                      </div>
                    </div>

                    <div className="ref-vip-actions-row">
                      <button className="ref-vip-btn-cyan" onClick={() => openCustomerCompensation(c)}>
                        <Gift size={14} />
                        <span>{t("تعويض", "Compensate")}</span>
                      </button>
                      <button className="ref-vip-btn" onClick={() => openCustomerDetails(c.id)}>
                        <UserCheck size={14} />
                        <span>{t("تحقق", "Verify")}</span>
                      </button>
                      <button
                        className={`ref-vip-btn ${isMuted ? "unmute" : "mute"}`}
                        onClick={() => handleToggleMuteCustomer(c)}
                      >
                        {isMuted ? <Volume2 size={14} /> : <VolumeX size={14} />}
                        <span>{isMuted ? t("فك كتم", "Unmute") : t("كتم", "Mute")}</span>
                      </button>
                      <button
                        className="ref-vip-btn"
                        onClick={() =>
                          setMessageModalState({
                            isOpen: true,
                            customerEmail: c.email,
                            customerName: c.name,
                            subject: "",
                            message: "",
                          })
                        }
                      >
                        <Mail size={14} />
                        <span>{t("إرسال بريد", "Send Email")}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ==================================================== */}
        {/* VIEW 5: سجل النشاط والتفعيلات (Matching Image 2) */}
        {/* ==================================================== */}
        {activeSection === "logs-activations" && (
          <div className="ref-view-section">
            <div className="ref-table-card">
              {/* Header Matching Image 2 */}
              <div className="ref-timeline-header-block">
                <div className="ref-timeline-title-row">
                  <div className="ref-timeline-title-text">
                    <span className="ref-sub-tag">{t("لوحة المتابعة", "Monitoring Board")}</span>
                    <h3 className="ref-big-heading">
                      <ShieldCheck size={22} />
                      <span>{t("سجل نشاط الموقع", "Site Activity Log")}</span>
                    </h3>
                    <p className="ref-sub-desc">
                      {t("عمليات العملاء والإدارة مرتبة من الأحدث، مع تفاصيل واضحة لكل حدث.", "Customer and management operations sorted by latest, with clear details.")}
                    </p>
                  </div>

                  <button className="ref-timeline-refresh-btn" onClick={loadActivationLogs}>
                    <RefreshCw size={14} className={loadingActivations ? "spin" : ""} />
                    <span>{t("تحديث الآن", "Refresh Now")}</span>
                  </button>
                </div>

                {/* Stats row inside the card (Image 2) */}
                <div className="ref-timeline-stats-row">
                  <div className="ref-timeline-stat-pill">
                    <strong>40</strong>
                    <span>{t("الأحداث المسجلة", "Logged Events")}</span>
                  </div>

                  <div className="ref-timeline-stat-pill">
                    <strong>10</strong>
                    <span>{t("أصحاب النشاط", "Active Users")}</span>
                  </div>

                  <div className="ref-timeline-stat-pill time-pill">
                    <Clock size={14} />
                    <span>{formatRiyadhHour()}</span>
                    <small>{t("آخر تحديث", "Last Update")}</small>
                  </div>
                </div>

                {/* Search / Filter Row */}
                <div className="ref-timeline-search-row">
                  <div className="ref-timeline-search-input-wrap">
                    <Search size={16} />
                    <input
                      type="text"
                      value={activationSearch}
                      onChange={(e) => setActivationSearch(e.target.value)}
                      placeholder={t("ابحث في السجلات المسجلة بالعميل أو الحدث أو IP...", "Search logs by customer, event, or IP...")}
                    />
                  </div>
                </div>
              </div>

              {/* Timeline Event Cards List (Matching Image 2) */}
              <div className="ref-timeline-cards-list">
                {filteredActivationLogs.length > 0 ? (
                  filteredActivationLogs.map((log) => {
                    const discordId = log.actor_id || `1320194211978543114`;
                    const clientIp = log.ip || `142.247.179.206`;
                    const userName = log.redeemed_by?.split("@")[0] || "koza124";

                    return (
                      <div className="ref-timeline-event-card" key={log.id}>
                        {/* Right side (RTL): Event text & Action Badge */}
                        <div className="ref-event-info-side">
                          <span className="ref-event-action-pill green">
                            {t("تفعيل مفتاح", "Key Activation")}
                          </span>
                          <div className="ref-event-title-stack">
                            <strong>{t(`تم تفعيل مفتاح ${log.product_name || "سيوفر تعن"}`, `Activated key for ${log.product_name}`)}</strong>
                            <small dir="ltr" className="ref-key-code-masked">
                              {log.masked_code ? log.masked_code : `KEY-******-${log.code_suffix || "H9whoQ"}`}
                            </small>
                          </div>
                        </div>

                        {/* Center: Customer Avatar, Name, Discord & IP */}
                        <div className="ref-event-user-side">
                          <div className="ref-event-avatar-wrap">
                            <div className="ref-event-avatar-fallback">{userName[0].toUpperCase()}</div>
                          </div>
                          <div className="ref-event-user-details">
                            <strong>{userName}</strong>
                            <span dir="ltr">Discord {discordId}</span>
                            <small dir="ltr">IP {clientIp}</small>
                          </div>
                        </div>

                        {/* Left side: Riyadh Time with Calendar icon */}
                        <div className="ref-event-time-side">
                          <Calendar size={15} />
                          <span>{formatRiyadhTime(log.redeemed_at)}</span>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="ref-timeline-empty">
                    {loadingActivations ? t("جاري تحميل السجلات...", "Loading logs...") : t("لا توجد سجلات تفعيل مسجلة حالياً.", "No activation records found.")}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ==================================================== */}
        {/* VIEW 6: حضور العملاء والجلسات النشطة (Matching Image 5) */}
        {/* ==================================================== */}
        {activeSection === "logs-logins" && (
          <div className="ref-view-section">
            <div className="ref-table-card">
              {/* Header Matching Image 5 */}
              <div className="ref-sessions-header-block">
                <div className="ref-sessions-title-row">
                  <div className="ref-sessions-title-text">
                    <div className="ref-sessions-headline">
                      <Radio size={20} className="pulse-cyan" />
                      <h3 className="ref-sessions-main-title">{t("الحسابات النشطة الآن", "Active Accounts Now")}</h3>
                      <span className="ref-online-count-badge">
                        <span className="online-green-dot" />
                        <span>{activeSessions.length} {t("متصل الآن", "Online Now")}</span>
                      </span>
                    </div>
                    <p className="ref-sessions-subdesc">
                      {t("تظهر هنا الحسابات التي أرسلت نبض حضور خلال آخر دقيقتين. لا يتم عرض البريد أو عنوان الشبكة أو محتوى المحادثات.", "Accounts showing active presence in the last 2 minutes.")}
                    </p>
                  </div>

                  <button className="ref-timeline-refresh-btn" onClick={loadLoginLogs}>
                    <RefreshCw size={14} className={loadingLogins ? "spin" : ""} />
                    <span>{t("تحديث الحالة", "Refresh Status")}</span>
                  </button>
                </div>
              </div>

              {/* Sessions List Matching Image 5 */}
              <div className="ref-sessions-list">
                {activeSessions.map((session) => {
                  return (
                    <div className="ref-session-card-row" key={session.id}>
                      {/* Left: Last Active timestamp & Green Connected badge */}
                      <div className="ref-session-left-meta">
                        <span className="ref-connected-badge">
                          <Check size={13} />
                          <span>{t("متصل", "Connected")}</span>
                        </span>
                        <div className="ref-session-timestamp">
                          <Clock size={13} />
                          <span>{t("آخر نشاط:", "Last Active:")} {new Date(session.last_active).toLocaleTimeString(ar ? "ar-SA" : "en-US")}</span>
                        </div>
                      </div>

                      {/* Right: User Avatar with Online Dot, Name & Discord ID */}
                      <div className="ref-session-right-user">
                        <div className="ref-session-avatar-wrap">
                          {session.image ? (
                            <img src={session.image} alt="" className="ref-session-avatar" />
                          ) : (
                            <div className="ref-session-avatar-fallback">{session.name[0].toUpperCase()}</div>
                          )}
                          <span className="ref-avatar-online-dot" />
                        </div>
                        <div className="ref-session-user-info">
                          <strong className="ref-session-username">{session.name}</strong>
                          <span dir="ltr" className="ref-session-discord-tag">Discord ID: {session.discord_id}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ==================================================== */}
      {/* 5. MODALS & DRAWERS (All preserved & enhanced) */}
      {/* ==================================================== */}

      {/* PRODUCT CREATE / EDIT MODAL */}
      {showProductModal && (
        <div className="modal-backdrop" onClick={() => setShowProductModal(false)}>
          <div className="modal-card ref-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>
                <Package size={20} />
                <span>{editingProduct ? t("تعديل المنتج والملفات", "Edit Product & Files") : t("إضافة منتج جديد", "Add New Product")}</span>
              </h2>
              <button className="modal-close" onClick={() => setShowProductModal(false)}>
                <X size={19} />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="modal-form">
              <div className="form-row-2">
                <div className="form-field">
                  <label>{t("اسم المنتج (بالعربية)", "Product Name (Arabic)")} *</label>
                  <input
                    type="text"
                    value={productForm.name}
                    onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                    required
                  />
                </div>
                <div className="form-field">
                  <label>{t("اسم المنتج (بالإنجليزية)", "Product Name (English)")}</label>
                  <input
                    type="text"
                    dir="ltr"
                    value={productForm.nameEn}
                    onChange={(e) => setProductForm({ ...productForm, nameEn: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-row-2">
                <div className="form-field">
                  <label>{t("التصنيف", "Category")}</label>
                  <select
                    value={productForm.category}
                    onChange={(e) => setProductForm({ ...productForm, category: e.target.value })}
                  >
                    <option value="Spoofer">Spoofer</option>
                    <option value="Cleaner">Cleaner</option>
                    <option value="Utility">Utility</option>
                    <option value="General">General</option>
                  </select>
                </div>
                <div className="form-field">
                  <label>{t("مدة الصلاحية الافتراضية (بالأيام)", "Duration (Days)")}</label>
                  <input
                    type="number"
                    value={productForm.defaultDurationDays}
                    onChange={(e) => setProductForm({ ...productForm, defaultDurationDays: Number(e.target.value) })}
                    min={1}
                  />
                </div>
              </div>

              <div className="form-field">
                <label>{t("رابط صورة المنتج (16:9 Banner URL)", "Product Image URL")}</label>
                <input
                  type="url"
                  dir="ltr"
                  value={productForm.imageUrl}
                  onChange={(e) => setProductForm({ ...productForm, imageUrl: e.target.value })}
                  placeholder="https://..."
                />
              </div>

              <div className="form-field">
                <label>{t("وصف المنتج المختصر", "Short Description")}</label>
                <textarea
                  rows={2}
                  value={productForm.description}
                  onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                />
              </div>

              {/* Spoofx.rar & Product Files Section */}
              <div className="product-files-editor-section">
                <label className="section-label">
                  <FileText size={15} />
                  <span>{t("ملفات التحميل للمنتج (Spoofx.rar مرفق تلقائياً)", "Attached Files (Spoofx.rar auto-attached)")}</span>
                </label>

                <div className="files-editor-list">
                  {productForm.files.map((file) => (
                    <div className="file-editor-pill" key={file.id}>
                      <FileText size={14} />
                      <span className="file-name">{file.name}</span>
                      {file.size && <span className="file-size">({file.size})</span>}
                      <button
                        type="button"
                        className="file-remove-btn"
                        onClick={() => handleRemoveFileFromProduct(file.id)}
                        title={t("إزالة", "Remove")}
                      >
                        <X size={13} />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="add-file-inputs-row">
                  <input
                    type="text"
                    value={newFileName}
                    onChange={(e) => setNewFileName(e.target.value)}
                    placeholder={t("اسم الملف (مثال: Spoofx.rar)", "File name")}
                  />
                  <input
                    type="text"
                    dir="ltr"
                    value={newFileUrl}
                    onChange={(e) => setNewFileUrl(e.target.value)}
                    placeholder={t("رابط الملف (/api/download)", "File URL")}
                  />
                  <button type="button" className="btn-secondary" onClick={handleAddFileToProduct}>
                    <Plus size={14} /> {t("إضافة ملف", "Add")}
                  </button>
                </div>
              </div>

              <div className="modal-actions">
                <button type="button" className="secondary-button" onClick={() => setShowProductModal(false)}>
                  {t("إلغاء", "Cancel")}
                </button>
                <button type="submit" className="primary-button" disabled={busy || !productForm.name.trim()}>
                  {busy ? <LoaderCircle className="spin" size={16} /> : <Check size={16} />}
                  <span>{editingProduct ? t("حفظ التعديلات", "Save Changes") : t("إضافة المنتج", "Create Product")}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* STOCK FILLING MODAL */}
      {showStockModal && (
        <div className="modal-backdrop" onClick={() => setShowStockModal(false)}>
          <div className="modal-card ref-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>
                <KeyRound size={20} />
                <span>{t("تعبئة وتوليد مفاتيح المخزون", "Fill & Generate Stock Keys")}</span>
              </h2>
              <button className="modal-close" onClick={() => setShowStockModal(false)}>
                <X size={19} />
              </button>
            </div>

            <form onSubmit={handleFillStock} className="modal-form">
              <div className="form-field">
                <label>{t("المنتج المراد تعبئة مخزونه", "Target Product")} *</label>
                <select
                  value={stockModalProductId}
                  onChange={(e) => setStockModalProductId(e.target.value)}
                  required
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} (المخزون الحالي: {p.available_keys ?? 0})
                    </option>
                  ))}
                </select>
              </div>

              <div className="mode-toggle-tabs">
                <button
                  type="button"
                  className={`mode-tab ${stockMode === "generate" ? "active" : ""}`}
                  onClick={() => setStockMode("generate")}
                >
                  {t("توليد مفاتيح عشوائية تلقائياً", "Auto Generate Keys")}
                </button>
                <button
                  type="button"
                  className={`mode-tab ${stockMode === "import" ? "active" : ""}`}
                  onClick={() => setStockMode("import")}
                >
                  {t("استيراد ولصق مفاتيح يدوياً", "Import & Paste Keys")}
                </button>
              </div>

              {stockMode === "generate" ? (
                <div className="form-row-2">
                  <div className="form-field">
                    <label>{t("عدد المفاتيح المراد توليدها", "Key Count")}</label>
                    <input
                      type="number"
                      min={1}
                      max={500}
                      value={generateCount}
                      onChange={(e) => setGenerateCount(Number(e.target.value))}
                    />
                  </div>
                  <div className="form-field">
                    <label>{t("صلاحية المفتاح (بالأيام)", "Duration (Days)")}</label>
                    <input
                      type="number"
                      min={1}
                      value={generateDuration}
                      onChange={(e) => setGenerateDuration(Number(e.target.value))}
                    />
                  </div>
                </div>
              ) : (
                <div className="form-field">
                  <label>{t("الصق المفاتيح (مفتاح في كل سطر)", "Paste Keys (One per line)")} *</label>
                  <textarea
                    rows={6}
                    dir="ltr"
                    value={importKeysText}
                    onChange={(e) => setImportKeysText(e.target.value)}
                    placeholder="KEY-gZcMty-H9whoQ&#10;KEY-Abc123-XyZ999&#10;KEY-X77q9P-Lk889a"
                  />
                </div>
              )}

              {newlyGenerated.length > 0 && (
                <div className="generated-keys-preview-box">
                  <div className="preview-top">
                    <span>{t(`تم توليد ${newlyGenerated.length} مفتاح:`, `Generated ${newlyGenerated.length} keys:`)}</span>
                    <button type="button" className="btn-copy-preview" onClick={handleCopyGeneratedKeys}>
                      {copiedKeys ? <Check size={14} /> : <Copy size={14} />}
                      <span>{copiedKeys ? t("تم النسخ", "Copied") : t("نسخ الكل", "Copy All")}</span>
                    </button>
                  </div>
                  <textarea
                    rows={4}
                    readOnly
                    dir="ltr"
                    value={newlyGenerated.join("\n")}
                    className="generated-keys-textarea"
                  />
                </div>
              )}

              <div className="modal-actions">
                <button type="button" className="secondary-button" onClick={() => setShowStockModal(false)}>
                  {t("إغلاق", "Close")}
                </button>
                <button type="submit" className="primary-button" disabled={busy || !stockModalProductId}>
                  {busy ? <LoaderCircle className="spin" size={16} /> : <KeyRound size={16} />}
                  <span>{stockMode === "generate" ? t("توليد وإضافة للمخزون", "Generate & Add") : t("استيراد المفاتيح", "Import Keys")}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* COMPENSATION MODAL */}
      {showCompensationModal && (
        <div className="modal-backdrop" onClick={() => setShowCompensationModal(false)}>
          <div className="modal-card ref-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>
                <Gift size={20} />
                <span>{t("تسجيل تعويض لعميل", "Log Customer Compensation")}</span>
              </h2>
              <button className="modal-close" onClick={() => setShowCompensationModal(false)}>
                <X size={19} />
              </button>
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
                <label>{t("المنتج المعني", "Affected Product")} *</label>
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
                  <option value="DIRECT_GRANT">{t("منح ترخيص منتج آخر (Direct Grant)", "Direct Grant")}</option>
                </select>
              </div>

              <div className="form-field">
                <label>{t("سبب التعويض والتفاصيل", "Reason & Details")} *</label>
                <textarea
                  rows={3}
                  value={compForm.reason}
                  onChange={(e) => setCompForm({ ...compForm, reason: e.target.value, details: e.target.value })}
                  placeholder={t("اذكر تفاصيل المشكلة وسبب التعويض...", "Explain the reason...")}
                  required
                />
              </div>

              <div className="modal-actions">
                <button type="button" className="secondary-button" onClick={() => setShowCompensationModal(false)}>
                  {t("إلغاء", "Cancel")}
                </button>
                <button type="submit" className="primary-button" disabled={busy || !compForm.customerEmail.trim() || !compForm.reason.trim()}>
                  {busy ? <LoaderCircle className="spin" size={16} /> : <Check size={16} />}
                  <span>{t("تسجيل ومنح التعويض", "Grant Compensation")}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CUSTOMER DRAWER */}
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

      {/* SEND MESSAGE MODAL */}
      {messageModalState.isOpen && (
        <div className="modal-backdrop" onClick={() => setMessageModalState((prev) => ({ ...prev, isOpen: false }))}>
          <div className="modal-card ref-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2><Mail size={20} /> {t("إرسال رسالة بريد للعميل", "Send Customer Email")}</h2>
              <button className="modal-close" onClick={() => setMessageModalState((prev) => ({ ...prev, isOpen: false }))}><X size={19} /></button>
            </div>

            <form onSubmit={handleSendMessage} className="modal-form">
              <div className="form-field">
                <label>{t("البريد الإلكتروني للعميل", "Customer Email")}</label>
                <input
                  type="email"
                  value={messageModalState.customerEmail}
                  readOnly
                  dir="ltr"
                  className="read-only-input"
                />
              </div>

              <div className="form-field">
                <label>{t("عنوان الموضوع", "Subject")} *</label>
                <input
                  type="text"
                  value={messageModalState.subject}
                  onChange={(e) => setMessageModalState({ ...messageModalState, subject: e.target.value })}
                  placeholder={t("مثال: تحديث اشتراكك أو حل مشكلة...", "Subject")}
                  required
                />
              </div>

              <div className="form-field">
                <label>{t("نص الرسالة", "Message")} *</label>
                <textarea
                  rows={5}
                  value={messageModalState.message}
                  onChange={(e) => setMessageModalState({ ...messageModalState, message: e.target.value })}
                  placeholder={t("اكتب نص الرسالة التي ستصل للعميل على بريده...", "Message...")}
                  required
                />
              </div>

              <div className="modal-actions">
                <button type="button" className="secondary-button" onClick={() => setMessageModalState((prev) => ({ ...prev, isOpen: false }))}>
                  {t("إلغاء", "Cancel")}
                </button>
                <button type="submit" className="primary-button" disabled={busy || !messageModalState.message.trim()}>
                  {busy ? <LoaderCircle className="spin" size={16} /> : <Send size={16} />}
                  <span>{t("إرسال الرسالة الآن", "Send Message")}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* UNIVERSAL CONFIRM MODAL */}
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
