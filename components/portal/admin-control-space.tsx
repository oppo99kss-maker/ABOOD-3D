"use client";
import { ModalBackdrop } from "@/components/ui/modal-backdrop";

import { useState, useMemo, useEffect, useCallback, useRef, type FormEvent } from "react";
import {
  AlertTriangle,
  ArrowDown,
  ArrowRight,
  ArrowUp,
  Calendar,
  Check,
  CheckCircle2,
  CheckSquare,
  ClipboardPaste,
  Clock,
  Copy,
  CopyPlus,
  ExternalLink,
  Eye,
  EyeOff,
  FileText,
  Gift,
  Info,
  KeyRound,
  Layers,
  LoaderCircle,
  Lock,
  Mail,
  Package,
  Plus,
  Power,
  Radio,
  RefreshCw,
  RotateCcw,
  Save,
  Search,
  Send,
  Settings,
  ShieldAlert,
  ShieldCheck,
  Sliders,
  Sparkles,
  Square,
  Trash2,
  Upload,
  UserCheck,
  Users,
  Volume2,
  VolumeX,
  Wrench,
  X,
  LayoutDashboard,
  PanelRightClose,
  PanelRightOpen,
  Database,
  BarChart3,
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
  KeyResetRequest,
} from "@/lib/store";
import { parseRawKeyList } from "@/lib/key-utils";
import { notify as notifyMgr } from "@/lib/notify";
import { ConfirmModal } from "@/components/ui/confirm-modal";

export type AdminSection =
  | "overview"
  | "products"
  | "inventory"
  | "customers"
  | "orders"
  | "logs"
  | "reset-requests"
  | "search-customer"
  | "logs-activations"
  | "logs-logins"
  | "settings";

export type CustomField = {
  id: string;
  name: string;
  key: string;
  type: string;
  value: string;
};

type Props = {
  products: Product[];
  inventory: Product[];
  dashboardStats: any;
  orders: Order[];
  allGuides: Guide[];
  settings: SystemSettings;
  resetRequests?: KeyResetRequest[];
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
  resetRequests: initialResetRequests = [],
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

  const [activeSection, setActiveSection] = useState<AdminSection>("overview");
  const [busy, setBusy] = useState(false);
  const [navCollapsed, setNavCollapsed] = useState(false);

  // Key Reset Requests State
  const [resetRequestsList, setResetRequestsList] = useState<KeyResetRequest[]>(initialResetRequests);
  const [resetFilter, setResetFilter] = useState<"ALL" | "PENDING" | "APPROVED" | "REJECTED">("ALL");
  const [resetSearch, setResetSearch] = useState("");
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [logsTab, setLogsTab] = useState<"activations" | "sessions">("activations");

  useEffect(() => {
    if (initialResetRequests) {
      setResetRequestsList(initialResetRequests);
    }
  }, [initialResetRequests]);

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

  // Handle Review Key Reset Request (Approve / Reject)
  async function handleReviewReset(id: string, status: "APPROVED" | "REJECTED") {
    setReviewingId(id);
    try {
      const notes = reviewNotes[id] || "";
      await apiAction({
        action: "reviewKeyReset",
        id,
        status,
        adminNotes: notes,
      });
      notify(
        status === "APPROVED"
          ? t("تمت الموافقة على طلب رستات المفتاح بنجاح", "Key reset request approved successfully")
          : t("تم رفض طلب رستات المفتاح", "Key reset request rejected"),
        status === "APPROVED" ? "success" : "error"
      );
      setResetRequestsList((prev) =>
        prev.map((r) =>
          r.id === id
            ? {
                ...r,
                status,
                admin_notes: notes || r.admin_notes,
                reviewed_by: currentUser,
                reviewed_at: new Date().toISOString(),
              }
            : r
        )
      );
      await onRefresh();
    } catch (err: any) {
      notify(err.message || t("فشل تحديث حالة الطلب", "Failed to update request"), "error");
    } finally {
      setReviewingId(null);
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
    if (isNaN(d.getTime())) return t("—", "—");
    try {
      return new Intl.DateTimeFormat(ar ? "ar-SA" : "en-US", {
        timeZone: "Asia/Riyadh",
        hour: "numeric",
        minute: "numeric",
        hour12: true,
      }).format(d);
    } catch {
      return d.toLocaleTimeString("ar-SA");
    }
  }

  /** Human-readable audit activity: icon + Arabic label instead of raw action codes. */
  function describeActivity(log: any): {
    Icon: typeof Clock;
    tone: string;
    title: string;
    subtitle: string;
  } {
    const d = log?.details && typeof log.details === "object" ? (log.details as Record<string, any>) : {};
    const product = String(d.product || d.product_name || d.productName || "");
    const reason = String(d.reason || d.notes || "");
    const subject = String(d.subject || "");
    const count = d.importedCount ?? d.generated ?? d.count ?? "";
    const action = String(log?.action || "");

    switch (action) {
      case "KEY_RESET_REQUESTED":
        return {
          Icon: RotateCcw,
          tone: "yellow",
          title: t("تم عمل فورمات", "Reset Requested"),
          subtitle: reason || "",
        };
      case "KEY_RESET_APPROVED":
        return {
          Icon: CheckCircle2,
          tone: "green",
          title: t("تمت الموافقة على الرستة", "Reset Approved"),
          subtitle: product,
        };
      case "KEY_RESET_REJECTED":
        return {
          Icon: X,
          tone: "red",
          title: t("تم رفض الرستة", "Reset Rejected"),
          subtitle: product,
        };
      case "KEY_REDEEMED_SUCCESS":
        return {
          Icon: KeyRound,
          tone: "green",
          title: t("تفعيل مفتاح", "Key Activated"),
          subtitle: product,
        };
      case "KEYS_IMPORTED":
        return {
          Icon: Upload,
          tone: "cyan",
          title: t("استيراد مفاتيح", "Keys Imported"),
          subtitle: count !== "" ? t(`تم استيراد ${count} مفتاح`, `${count} keys imported`) : "",
        };
      case "KEYS_GENERATED":
        return {
          Icon: CopyPlus,
          tone: "cyan",
          title: t("توليد مفاتيح", "Keys Generated"),
          subtitle: count !== "" ? t(`تم توليد ${count} مفتاح`, `${count} keys generated`) : "",
        };
      case "KEYS_CLEARED":
        return { Icon: Trash2, tone: "red", title: t("مسح المفاتيح", "Keys Cleared"), subtitle: product };
      case "KEY_DELETED":
        return { Icon: Trash2, tone: "red", title: t("حذف مفتاح", "Key Deleted"), subtitle: product };
      case "KEY_ALLOCATED_TO_ORDER":
        return { Icon: Package, tone: "blue", title: t("إسناد مفتاح لطلب", "Key Allocated to Order"), subtitle: product };
      case "PRODUCT_CREATED":
        return { Icon: Package, tone: "blue", title: t("إنشاء منتج", "Product Created"), subtitle: product };
      case "PRODUCT_UPDATED":
        return { Icon: Wrench, tone: "blue", title: t("تعديل منتج", "Product Updated"), subtitle: product };
      case "PRODUCT_DUPLICATED":
        return { Icon: CopyPlus, tone: "purple", title: t("نسخ منتج", "Product Duplicated"), subtitle: product };
      case "PRODUCT_SHOWN":
        return { Icon: Eye, tone: "green", title: t("إظهار منتج", "Product Shown"), subtitle: product };
      case "PRODUCT_HIDDEN":
        return { Icon: EyeOff, tone: "yellow", title: t("إخفاء منتج", "Product Hidden"), subtitle: product };
      case "PRODUCT_DELETED":
      case "PRODUCT_ARCHIVED_AS_DELETED":
        return { Icon: Trash2, tone: "red", title: t("حذف منتج", "Product Deleted"), subtitle: product };
      case "ORDER_CREATED":
        return { Icon: Package, tone: "blue", title: t("إنشاء طلب", "Order Created"), subtitle: product };
      case "CUSTOMER_MESSAGE_SENT":
        return { Icon: Mail, tone: "purple", title: t("رسالة من عميل", "Customer Message"), subtitle: subject };
      case "LICENSE_EXTENDED":
        return { Icon: Clock, tone: "cyan", title: t("تمديد رخصة", "License Extended"), subtitle: product };
      case "LICENSE_REVOKED":
        return { Icon: Lock, tone: "red", title: t("إلغاء رخصة", "License Revoked"), subtitle: product };
      case "DIRECT_LICENSE_GRANTED":
        return { Icon: Gift, tone: "green", title: t("منح رخصة مباشرة", "Direct License Granted"), subtitle: product };
      case "COMPENSATION_ISSUED":
        return { Icon: Gift, tone: "purple", title: t("إصدار تعويض", "Compensation Issued"), subtitle: product };
      case "SYSTEM_SETTINGS_UPDATED":
        return { Icon: Settings, tone: "purple", title: t("تحديث إعدادات النظام", "System Settings Updated"), subtitle: "" };
      case "REDEEM_FAILED_ALREADY_USED":
        return { Icon: AlertTriangle, tone: "red", title: t("فشل تفعيل — مستخدم مسبقاً", "Redeem Failed — Already Used"), subtitle: "" };
      case "REDEEM_FAILED_INVALID_KEY":
        return { Icon: AlertTriangle, tone: "red", title: t("فشل تفعيل — مفتاح غير صالح", "Redeem Failed — Invalid Key"), subtitle: "" };
      default:
        return {
          Icon: Database,
          tone: "blue",
          title: action ? action.replaceAll("_", " ") : t("حدث", "Event"),
          subtitle: product,
        };
    }
  }



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
  // 3. PRODUCTS STATE & ACTIONS (MATCHING IMAGES 2 & 3)
  // ====================================================
  const [productSearch, setProductSearch] = useState("");
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [showProductModal, setShowProductModal] = useState(false);
  const [productModalTab, setProductModalTab] = useState<"details" | "custom_fields" | "keys">("details");
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Synchronize editingProduct with latest products state whenever products refresh
  useEffect(() => {
    if (editingProduct?.id) {
      const live = products.find((prod) => prod.id === editingProduct.id);
      if (live) {
        setEditingProduct((prev) => (prev ? { ...prev, ...live } : live));
      }
    }
  }, [products]);

  const [productForm, setProductForm] = useState<{
    name: string;
    nameEn: string;
    sku: string;
    stockType: string;
    status: "ACTIVE" | "INACTIVE";
    visibility: "VISIBLE" | "HIDDEN";
    sortOrder: number;
    version: string;
    fileSize: string;
    description: string;
    category: string;
    accessUrl: string;
    imageUrl: string;
    instructions: string;
    defaultDurationDays: number;
    isVisible: boolean;
    isActive: boolean;
    files: ProductFile[];
    customFields: CustomField[];
  }>({
    name: "",
    nameEn: "",
    sku: "",
    stockType: "digital_keys",
    status: "ACTIVE",
    visibility: "VISIBLE",
    sortOrder: 1,
    version: "",
    fileSize: "",
    description: "",
    category: "General",
    accessUrl: "",
    imageUrl: "",
    instructions: "",
    defaultDurationDays: 3,
    isVisible: true,
    isActive: true,
    files: [],
    customFields: [],
  });

  // Local Image Upload Handler
  function handleLocalImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setProductForm((prev) => ({
          ...prev,
          imageUrl: reader.result as string,
        }));
      }
    };
    reader.readAsDataURL(file);
  }

  // Custom Fields Handlers (Image 3)
  function handleMoveFieldUp(index: number) {
    if (index === 0) return;
    setProductForm((prev) => {
      const list = [...prev.customFields];
      const temp = list[index - 1];
      list[index - 1] = list[index];
      list[index] = temp;
      return { ...prev, customFields: list };
    });
  }

  function handleMoveFieldDown(index: number) {
    setProductForm((prev) => {
      if (index >= prev.customFields.length - 1) return prev;
      const list = [...prev.customFields];
      const temp = list[index + 1];
      list[index + 1] = list[index];
      list[index] = temp;
      return { ...prev, customFields: list };
    });
  }

  function handleDeleteField(index: number) {
    setProductForm((prev) => ({
      ...prev,
      customFields: prev.customFields.filter((_, i) => i !== index),
    }));
  }

  function handleAddCustomField() {
    const newId = "cf_" + Date.now();
    setProductForm((prev) => ({
      ...prev,
      customFields: [
        ...prev.customFields,
        {
          id: newId,
          name: t("حقل مخصص جديد", "New Custom Field"),
          key: "field_" + (prev.customFields.length + 1),
          type: "TEXT",
          value: "",
        },
      ],
    }));
  }

  function handleFieldChange(index: number, val: string) {
    setProductForm((prev) => {
      const list = [...prev.customFields];
      list[index] = { ...list[index], value: val };
      return { ...prev, customFields: list };
    });
  }

  async function handlePasteFromClipboard(setter: (val: string) => void, fieldLabel: string) {
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard && navigator.clipboard.readText) {
        const text = await navigator.clipboard.readText();
        if (text && text.trim()) {
          setter(text.trim());
          notify(t(`تم اللصق من الحافظة (${fieldLabel})`, `Pasted from clipboard (${fieldLabel})`));
          return;
        }
      }
      notify(t("الحافظة فارغة أو يرجى منح إذن القراءة", "Clipboard is empty or access not allowed"), "error");
    } catch {
      notify(t("يرجى استخدام الاختصار Ctrl+V للصق مباشرة في الحقل", "Please press Ctrl+V to paste"), "error");
    }
  }

  function openEditProduct(p: Product, initialTab: "details" | "custom_fields" | "keys" = "details") {
    setEditingProduct(p);
    setProductModalTab(initialTab);

    let sku = `prod-${p.id.slice(0, 8)}`;
    let version = "";
    let fileSize = "";
    let sortOrder = 1;
    let customFields: CustomField[] = [];

    try {
      if (p.instructions && p.instructions.trim().startsWith("{")) {
        const parsed = JSON.parse(p.instructions);
        if (parsed.sku) sku = parsed.sku;
        if (parsed.version) version = parsed.version;
        if (parsed.fileSize) fileSize = parsed.fileSize;
        if (parsed.sortOrder) sortOrder = Number(parsed.sortOrder) || 1;
        if (Array.isArray(parsed.customFields) && parsed.customFields.length > 0) {
          customFields = parsed.customFields;
        }
      }
    } catch {}

    const currentFiles: ProductFile[] = Array.isArray(p.files) && p.files.length > 0 ? p.files : [];

    setProductForm({
      name: p.name,
      nameEn: p.name_en || "",
      sku: sku,
      stockType: "digital_keys",
      status: p.is_active !== false ? "ACTIVE" : "INACTIVE",
      visibility: p.is_visible !== false ? "VISIBLE" : "HIDDEN",
      sortOrder: sortOrder,
      version: version,
      fileSize: fileSize,
      description: p.description || "",
      category: p.category || "General",
      accessUrl: p.access_url || "",
      imageUrl: p.image_url || "",
      instructions: p.instructions || "",
      defaultDurationDays: p.default_duration_days || 3,
      isVisible: p.is_visible !== false,
      isActive: p.is_active !== false,
      files: currentFiles,
      customFields: customFields,
    });
    setShowProductModal(true);
  }

  function openAddProduct() {
    setEditingProduct(null);
    setProductModalTab("details");
    setProductForm({
      name: "",
      nameEn: "",
      sku: `prod-${Date.now().toString(36)}`,
      stockType: "digital_keys",
      status: "ACTIVE",
      visibility: "VISIBLE",
      sortOrder: products.length + 1,
      version: "",
      fileSize: "",
      description: "",
      category: "General",
      accessUrl: "",
      imageUrl: "",
      instructions: "",
      defaultDurationDays: 3,
      isVisible: true,
      isActive: true,
      files: [],
      customFields: [],
    });
    setShowProductModal(true);
  }

  async function handleSaveProduct(e?: FormEvent) {
    if (e) e.preventDefault();
    if (!productForm.name.trim()) {
      notify(t("يرجى إدخال اسم المنتج", "Please enter product name"), "error");
      return;
    }

    const fileField = productForm.customFields.find((f) => f.key === "fileUrl" || f.name.includes("تحميل"));
    const accessUrl = fileField?.value || productForm.accessUrl || "/api/download";

    const instructionsPayload = JSON.stringify({
      sku: productForm.sku,
      version: productForm.version,
      fileSize: productForm.fileSize,
      sortOrder: productForm.sortOrder,
      customFields: productForm.customFields,
      stockType: productForm.stockType,
    });

    try {
      await apiAction({
        action: editingProduct ? "updateProduct" : "createProduct",
        id: editingProduct?.id,
        name: productForm.name,
        nameEn: productForm.nameEn,
        description: productForm.description,
        category: productForm.category,
        accessUrl: accessUrl,
        imageUrl: productForm.imageUrl,
        instructions: instructionsPayload,
        defaultDurationDays: productForm.defaultDurationDays,
        isVisible: productForm.visibility === "VISIBLE",
        isActive: productForm.status === "ACTIVE",
        files: productForm.files,
      });
      notify(t(editingProduct ? "تم حفظ التعديلات بنجاح!" : "تمت إضافة المنتج بنجاح!", editingProduct ? "Product saved!" : "Product created!"));
      setShowProductModal(false);
      setEditingProduct(null);
      await onRefresh();
    } catch (err: any) {
      notify(err.message || t("فشل حفظ التعديلات", "Failed to save"), "error");
    }
  }

  // Keyboard shortcut Ctrl+S
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s" && showProductModal) {
        e.preventDefault();
        void handleSaveProduct();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showProductModal, productForm, editingProduct]);

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
          if (editingProduct?.id === product.id) {
            setShowProductModal(false);
            setEditingProduct(null);
          }
          setSelectedProductIds((prev) => prev.filter((id) => id !== product.id));
          await onRefresh();
        } catch (err: any) {
          notify(err.message || t("فشل حذف المنتج", "Failed to delete product"), "error");
        }
      },
    });
  }

  // Duplicate Product (استنساخ منتج)
  async function handleDuplicateProduct(product: Product) {
    try {
      await apiAction({ action: "duplicateProduct", id: product.id });
      notify(t(`تم استنساخ المنتج "${product.name}" بنجاح!`, `Product "${product.name}" duplicated successfully!`));
      await onRefresh();
    } catch (err: any) {
      notify(err.message || t("فشل استنساخ المنتج", "Failed to duplicate product"), "error");
    }
  }

  // Multi-select helpers
  function toggleSelectProduct(id: string) {
    setSelectedProductIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function toggleSelectAllProducts() {
    if (selectedProductIds.length === filteredProducts.length && filteredProducts.length > 0) {
      setSelectedProductIds([]);
    } else {
      setSelectedProductIds(filteredProducts.map((p) => p.id));
    }
  }

  // Batch Toggle Visibility (إظهار / إخفاء جماعي)
  async function handleBatchToggleVisibility(isVisible: boolean) {
    const idsToUpdate = selectedProductIds.length > 0 ? selectedProductIds : "ALL";
    const label = isVisible ? t("إظهار", "Show") : t("إخفاء", "Hide");
    try {
      await apiAction({
        action: "batchToggleVisibility",
        ids: idsToUpdate,
        isVisible,
      });
      notify(t(`تم ${label} المنتجات بنجاح!`, `Products ${label} successfully!`));
      setSelectedProductIds([]);
      await onRefresh();
    } catch (err: any) {
      notify(err.message || t("فشل تحديث الظهور الجماعي", "Failed to batch update visibility"), "error");
    }
  }

  // Bulk Delete (حذف جماعي)
  function handleBulkDelete() {
    if (!selectedProductIds.length) return;
    setConfirmState({
      isOpen: true,
      title: t("حذف المنتجات المحددة نهائياً", "Delete Selected Products"),
      message: t(
        `هل أنت متأكد من حذف ${selectedProductIds.length} منتج محدد نهائياً؟ سيتم حذفها وإزالتها من النظام.`,
        `Are you sure you want to permanently delete ${selectedProductIds.length} selected products?`
      ),
      variant: "danger",
      confirmText: t("تأكيد الحذف الجماعي", "Delete All Selected"),
      onConfirm: async () => {
        setConfirmState((prev) => ({ ...prev, isOpen: false }));
        try {
          await apiAction({ action: "deleteProducts", ids: selectedProductIds });
          notify(t(`تم حذف ${selectedProductIds.length} منتج بنجاح!`, `Deleted ${selectedProductIds.length} products successfully!`));
          setSelectedProductIds([]);
          await onRefresh();
        } catch (err: any) {
          notify(err.message || t("فشل الحذف الجماعي", "Failed to bulk delete"), "error");
        }
      },
    });
  }

  // Platform & Store Settings State & Handlers (ضبط لوحة الإدارة والمتجر)
  const [settingsForm, setSettingsForm] = useState<SystemSettings>(initialSettings || {
    site_name: "SpooFX",
    description: "بوابتك الرقمية المتكاملة لإدارة المنتجات والمفاتيح والتراخيص",
    maintenance_mode: false,
    maintenance_message: "الموقع تحت الصيانة الدورية حالياً وسيعود للعمل قريباً.",
    allow_new_activations: true,
    low_stock_threshold: 5,
  });

  // Keep settings form in sync with props
  useEffect(() => {
    if (initialSettings) {
      setSettingsForm(initialSettings);
    }
  }, [initialSettings]);

  async function handleSaveSettings(e?: FormEvent) {
    if (e) e.preventDefault();
    try {
      await apiAction({
        action: "updateSettings",
        settings: settingsForm,
      });
      notify(t("تم حفظ وضبط إعدادات المنصة بنجاح!", "Platform settings saved successfully!"));
      await onRefresh();
    } catch (err: any) {
      notify(err.message || t("فشل حفظ إعدادات المنصة", "Failed to save settings"), "error");
    }
  }

  function handleClearConsumedKeys() {
    setConfirmState({
      isOpen: true,
      title: t("مسح وتنظيف الأكواد المستهلكة", "Clear Consumed Keys"),
      message: t(
        "هل أنت متأكد من تنظيف وحذف المفاتيح المستهلكة من قاعدة البيانات؟ لن يتم المساس بالأكواد المتاحة للبيع.",
        "Are you sure you want to clean up consumed keys? Available stock keys will not be touched."
      ),
      variant: "warning",
      confirmText: t("تأكيد تنظيف الأكواد", "Confirm Clean Keys"),
      onConfirm: async () => {
        setConfirmState((prev) => ({ ...prev, isOpen: false }));
        try {
          for (const p of products) {
            await apiAction({ action: "clearProductKeys", productId: p.id, type: "REDEEMED" });
          }
          notify(t("تم تنظيف الأكواد المستهلكة بنجاح!", "Consumed keys cleaned up successfully!"));
          await onRefresh();
        } catch (err: any) {
          notify(err.message || t("فشل تنظيف الأكواد", "Failed to clear keys"), "error");
        }
      },
    });
  }

  // ====================================================
  // 4. INVENTORY & STOCK FILLING MODAL (SINGLE KEY & BULK KEYS - MANUAL STOCK)
  // ====================================================
  const [showStockModal, setShowStockModal] = useState(false);
  const [stockModalProductId, setStockModalProductId] = useState<string>(products[0]?.id || "");
  const [stockMode, setStockMode] = useState<"single" | "bulk" | "generate">("bulk");
  const [singleKeyText, setSingleKeyText] = useState("");
  const [singleKeyDuration, setSingleKeyDuration] = useState(3);
  const [bulkKeysText, setBulkKeysText] = useState("");
  const [bulkDuration, setBulkDuration] = useState(3);

  function generateRandomKeyCode() {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
    const part1 = Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
    const part2 = Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
    return `KEY-${part1}-${part2}`;
  }

  const bulkKeysDetectedCount = useMemo(() => {
    return parseRawKeyList(bulkKeysText).length;
  }, [bulkKeysText]);

  const selectedStockProduct = useMemo(() => {
    return products.find((p) => p.id === stockModalProductId) || products[0];
  }, [products, stockModalProductId]);

  function openStockModal(productId?: string, initialMode: "single" | "bulk" | "generate" = "bulk") {
    if (productId) setStockModalProductId(productId);
    else if (!stockModalProductId && products[0]) setStockModalProductId(products[0].id);
    setSingleKeyText(generateRandomKeyCode());
    setBulkKeysText("");
    setStockMode(initialMode);
    setShowStockModal(true);
  }

  async function handleAddSingleKey(e: FormEvent) {
    e.preventDefault();
    if (!stockModalProductId) return;
    const keyToAdd = singleKeyText.trim();
    if (!keyToAdd || keyToAdd.length < 2) {
      notify(t("يرجى إدخال رمز مفتاح صالح", "Please enter a valid key code"), "error");
      return;
    }

    setBusy(true);
    try {
      const res = await apiAction({
        action: "importKeys",
        rawKeys: [keyToAdd],
        productId: stockModalProductId,
        durationDays: singleKeyDuration,
      });
      if (res?.importedCount === 0 && res?.duplicates?.length > 0) {
        notify(t("هذا المفتاح مستخدم ومباع مسبقاً لعميل في النظام!", "This key already exists or is assigned to a customer!"), "error");
      } else {
        notify(t(`تمت إضافة المفتاح (${keyToAdd}) إلى المخزون بنجاح!`, `Key added to stock successfully!`));
        setSingleKeyText(generateRandomKeyCode());
        setShowStockModal(false);
        await onRefresh();
      }
    } catch (err: any) {
      notify(err.message || t("فشلت إضافة المفتاح", "Failed to add key"), "error");
    } finally {
      setBusy(false);
    }
  }

  async function handleAddBulkKeys(e: FormEvent) {
    e.preventDefault();
    if (!stockModalProductId) return;
    const keyList = parseRawKeyList(bulkKeysText);

    if (!keyList.length) {
      notify(t("يرجى إدخال أو لصق مفتاح واحد على الأقل", "Please enter at least one key"), "error");
      return;
    }

    setBusy(true);
    try {
      const res = await apiAction({
        action: "importKeys",
        rawKeys: keyList,
        productId: stockModalProductId,
        durationDays: bulkDuration,
      });
      const imported = Number(res?.importedCount ?? 0);
      const reassigned = Number(res?.reassignedCount ?? 0);
      const dupes = Array.isArray(res?.duplicates) ? res.duplicates.length : 0;
      if (imported === 0 && dupes > 0) {
        notify(
          t(
            `لم تتم الإضافة: جميع المفاتيح المدخلة (${dupes}) مستخدمة ومباعة مسبقاً لعملاء آخرين!`,
            `Failed: All entered keys (${dupes}) are already assigned/redeemed!`
          ),
          "error"
        );
      } else {
        const extra = reassigned > 0 ? ` (تم استعادة ${reassigned} كود مسبقاً)` : "";
        const skipped = dupes > 0 ? ` (${dupes} مستخدم تم تخطيه)` : "";
        notify(
          t(
            `تمت إضافة ${imported} مفتاحاً للمخزون بنجاح!${extra}${skipped}`,
            `Imported ${imported} keys successfully!${extra}${skipped}`
          )
        );
        setBulkKeysText("");
        setShowStockModal(false);
        await onRefresh();
      }
    } catch (err: any) {
      notify(err.message || t("فشلت إضافة المفاتيح", "Failed to import keys"), "error");
    } finally {
      setBusy(false);
    }
  }

  async function handleQuickStockGenerate(count: number) {
    if (!stockModalProductId) return;
    setBusy(true);
    try {
      const res = await apiAction({
        action: "generateKeys",
        productId: stockModalProductId,
        count,
        durationDays: bulkDuration,
      });
      notify(
        t(
          `تم توليد وإضافة ${res?.count ?? count} مفتاحاً للمخزون بنجاح!`,
          `Generated and added ${res?.count ?? count} keys to stock!`
        )
      );
      setShowStockModal(false);
      await onRefresh();
    } catch (err: any) {
      notify(err.message || t("فشل توليد المفاتيح", "Failed to generate keys"), "error");
    } finally {
      setBusy(false);
    }
  }

  // ====================================================
  // 4b. TAB 3 LUXURY KEYS & INVENTORY (MATCHING SCREENSHOT)
  // ====================================================
  const [productInventoryKeys, setProductInventoryKeys] = useState<any[]>([]);
  const [loadingProductKeys, setLoadingProductKeys] = useState(false);
  const [productKeysSearch, setProductKeysSearch] = useState("");
  const [productKeysFilter, setProductKeysFilter] = useState<
    "ALL" | "AVAILABLE" | "PENDING" | "ACTIVE" | "EXPIRED" | "BLOCKED"
  >("ALL");
  const [keysSort, setKeysSort] = useState<"newest" | "oldest" | "code">("newest");
  const [keysPage, setKeysPage] = useState(1);
  const [keysPerPage, setKeysPerPage] = useState(20);
  const [revealedKeyIds, setRevealedKeyIds] = useState<Record<string, boolean>>({});
  const [sallaKeysInput, setSallaKeysInput] = useState("");
  const [sallaDuration, setSallaDuration] = useState(3);
  const [showSingleKeyInline, setShowSingleKeyInline] = useState(false);
  const [singleInlineKey, setSingleInlineKey] = useState("");
  const [singleInlineDuration, setSingleInlineDuration] = useState(3);
  const [copiedKeyId, setCopiedKeyId] = useState<string | null>(null);

  function toggleKeyReveal(id: string) {
    setRevealedKeyIds((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  const detectedKeysCount = useMemo(() => {
    return parseRawKeyList(sallaKeysInput).length;
  }, [sallaKeysInput]);

  const availableKeysCount = useMemo(() => {
    if (productInventoryKeys.length > 0) {
      return productInventoryKeys.filter((k) => k.status === "AVAILABLE").length;
    }
    return Number(editingProduct?.available_keys ?? 0);
  }, [productInventoryKeys, editingProduct?.available_keys]);

  const fetchProductKeys = useCallback(async (productId: string) => {
    if (!productId) return;
    setLoadingProductKeys(true);
    try {
      const res = await fetch(`/api/portal?view=admin-inventory&productId=${productId}`);
      if (res.ok) {
        const data = await res.json();
        setProductInventoryKeys(Array.isArray(data.keys) ? data.keys : []);
      }
    } catch (e) {
      console.error("Failed to load inventory keys:", e);
    } finally {
      setLoadingProductKeys(false);
    }
  }, []);

  useEffect(() => {
    if (showProductModal && productModalTab === "keys" && editingProduct?.id) {
      fetchProductKeys(editingProduct.id);
    }
  }, [showProductModal, productModalTab, editingProduct?.id, fetchProductKeys]);

  const filteredProductKeys = useMemo(() => {
    return productInventoryKeys
      .filter((k) => {
        if (productKeysFilter !== "ALL") {
          const s = String(k.status || "").toUpperCase();
          if (productKeysFilter === "AVAILABLE" && s !== "AVAILABLE") return false;
          if (productKeysFilter === "PENDING" && s !== "PENDING" && s !== "WAITING") return false;
          if (productKeysFilter === "ACTIVE" && s !== "ACTIVE" && s !== "ISSUED" && s !== "USED") return false;
          if (productKeysFilter === "EXPIRED" && s !== "EXPIRED") return false;
          if (
            productKeysFilter === "BLOCKED" &&
            s !== "BLOCKED" &&
            s !== "SUSPENDED" &&
            s !== "REVOKED" &&
            s !== "DISABLED"
          )
            return false;
        }
        if (productKeysSearch.trim()) {
          const q = productKeysSearch.toLowerCase();
          const code = (k.raw_code || k.masked_code || k.code_suffix || k.code || "").toLowerCase();
          const batch = (k.batch_id || "").toLowerCase();
          const order = (k.order_id || k.order_number || "").toLowerCase();
          const cust = (k.customer_name || k.customer_email || k.issued_to || "").toLowerCase();
          const status = (k.status || "").toLowerCase();
          return (
            code.includes(q) ||
            batch.includes(q) ||
            order.includes(q) ||
            cust.includes(q) ||
            status.includes(q)
          );
        }
        return true;
      })
      .sort((a, b) => {
        if (keysSort === "newest") {
          return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
        }
        if (keysSort === "oldest") {
          return new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime();
        }
        if (keysSort === "code") {
          return (a.raw_code || a.masked_code || "").localeCompare(b.raw_code || b.masked_code || "");
        }
        return 0;
      });
  }, [productInventoryKeys, productKeysFilter, productKeysSearch, keysSort]);

  const totalKeysPages = Math.max(1, Math.ceil(filteredProductKeys.length / keysPerPage));
  const paginatedProductKeys = useMemo(() => {
    const start = (keysPage - 1) * keysPerPage;
    return filteredProductKeys.slice(start, start + keysPerPage);
  }, [filteredProductKeys, keysPage, keysPerPage]);

  async function handleToggleSuspendKey(keyId: string) {
    try {
      const res = await apiAction({ action: "toggleSuspendKey", keyId });
      notify(
        res?.newStatus === "REVOKED"
          ? t("تم تعطيل المفتاح بنجاح", "Key suspended successfully")
          : t("تم تنشيط المفتاح بنجاح", "Key reactivated successfully")
      );
      if (editingProduct?.id) {
        await fetchProductKeys(editingProduct.id);
      }
      await onRefresh();
    } catch (err: any) {
      notify(err.message || t("فشل تحديث حالة المفتاح", "Failed to update key status"), "error");
    }
  }

  async function handleInsertSallaKeys() {
    if (!editingProduct?.id) return;
    const rawList = parseRawKeyList(sallaKeysInput);
    if (!rawList.length) {
      notify(t("يرجى لصق كود واحد على الأقل", "Please enter at least one key code"), "error");
      return;
    }
    setBusy(true);
    try {
      const res = await apiAction({
        action: "importKeys",
        productId: editingProduct.id,
        rawKeys: rawList,
        durationDays: sallaDuration,
      });

      const imported = Number(res?.importedCount ?? 0);
      const reassigned = Number(res?.reassignedCount ?? 0);
      const dupes = Array.isArray(res?.duplicates) ? res.duplicates.length : 0;
      const invalid = Array.isArray(res?.invalid) ? res.invalid.length : 0;
      const currentStock = res?.availableStock !== undefined ? Number(res.availableStock) : undefined;

      if (imported === 0) {
        if (dupes > 0) {
          notify(
            t(
              `تنبيه: جميع المفاتيح المدخلة (${dupes}) مستخدمة ومباعة مسبقاً لعملاء آخرين في النظام!`,
              `All entered keys (${dupes}) are already assigned/redeemed by customers!`
            ),
            "error"
          );
        } else if (invalid > 0) {
          notify(
            t("صيغة الأكواد المدخلة غير صالحة. يرجى التأكد من كتابة كود صالح.", "Invalid key format"),
            "error"
          );
        } else {
          notify(t("لم يتم إدراج أي مفاتيح، يرجى مراجعة الأكواد المدخلة", "No keys imported"), "error");
        }
      } else {
        const extraNote = reassigned > 0 ? ` (تم استعادة ${reassigned} كود مسبقاً للمخزون)` : "";
        const skippedNote = dupes > 0 ? ` (تم تخطي ${dupes} كود مستخدم)` : "";
        notify(
          t(
            `تم إدراج ${imported} مفتاحاً بنجاح في المخزون!${extraNote}${skippedNote}`,
            `Imported ${imported} keys successfully into stock!${extraNote}${skippedNote}`
          )
        );
        setSallaKeysInput("");
        if (currentStock !== undefined) {
          setEditingProduct((prev) => (prev ? { ...prev, available_keys: currentStock } : prev));
        }
        await fetchProductKeys(editingProduct.id);
        await onRefresh();
      }
    } catch (err: any) {
      notify(err.message || t("فشل إدراج الأكواد", "Failed to insert keys"), "error");
    } finally {
      setBusy(false);
    }
  }

  async function handleQuickGenerateKeys(count: number, durationDays = 3) {
    if (!editingProduct?.id) return;
    setBusy(true);
    try {
      const res = await apiAction({
        action: "generateKeys",
        productId: editingProduct.id,
        count,
        durationDays,
      });
      const generatedCount = res?.count ?? count;
      notify(
        t(
          `تم توليد ${generatedCount} مفتاحاً وإضافتها للمخزون فوراً!`,
          `Generated and added ${generatedCount} keys to stock!`
        )
      );
      if (res?.availableStock !== undefined) {
        setEditingProduct((prev) => (prev ? { ...prev, available_keys: res.availableStock } : prev));
      }
      await fetchProductKeys(editingProduct.id);
      await onRefresh();
    } catch (err: any) {
      notify(err.message || t("فشل توليد المفاتيح", "Failed to generate keys"), "error");
    } finally {
      setBusy(false);
    }
  }

  async function handleInsertSingleInlineKey() {
    if (!editingProduct?.id) return;
    const keyToAdd = singleInlineKey.trim() || generateRandomKeyCode();
    setBusy(true);
    try {
      const res = await apiAction({
        action: "importKeys",
        productId: editingProduct.id,
        rawKeys: [keyToAdd],
        durationDays: singleInlineDuration,
      });
      if (res?.importedCount === 0 && res?.duplicates?.length > 0) {
        notify(t("هذا المفتاح مستخدم ومباع مسبقاً لعميل في النظام!", "Key is already assigned/redeemed"), "error");
      } else {
        notify(t(`تمت إضافة المفتاح (${keyToAdd}) بنجاح للمخزون!`, "Key added successfully!"));
        setSingleInlineKey("");
        setShowSingleKeyInline(false);
        if (res?.availableStock !== undefined) {
          setEditingProduct((prev) => (prev ? { ...prev, available_keys: res.availableStock } : prev));
        }
        await fetchProductKeys(editingProduct.id);
        await onRefresh();
      }
    } catch (err: any) {
      notify(err.message || t("فشل إضافة المفتاح", "Failed to add key"), "error");
    } finally {
      setBusy(false);
    }
  }

  function handleDeleteProductKey(keyId: string, maskedCode: string) {
    setConfirmState({
      isOpen: true,
      title: t("حذف الكود نهائياً", "Delete Code Permanently"),
      message: t(
        `هل أنت متأكد من حذف الكود (${maskedCode}) نهائياً من مخزون هذا المنتج؟`,
        `Are you sure you want to permanently delete code ${maskedCode}?`
      ),
      confirmText: t("نعم، احذف الكود", "Yes, Delete Code"),
      cancelText: t("إلغاء", "Cancel"),
      variant: "danger",
      onConfirm: async () => {
        setConfirmState((prev) => ({ ...prev, isOpen: false }));
        try {
          await apiAction({ action: "deleteKey", keyId });
          notify(t("تم حذف الكود من المخزون بنجاح", "Code deleted successfully"));
          if (editingProduct?.id) {
            await fetchProductKeys(editingProduct.id);
          }
          await onRefresh();
        } catch (err: any) {
          notify(err.message || t("فشل حذف الكود", "Failed to delete code"), "error");
        }
      },
    });
  }

  function handleCopyKeyItem(code: string, id: string) {
    navigator.clipboard.writeText(code);
    setCopiedKeyId(id);
    notify(t("تم نسخ الكود للحافظة", "Code copied to clipboard"));
    setTimeout(() => setCopiedKeyId(null), 2000);
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
        (log.raw_code || "").toLowerCase().includes(q) ||
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
          auth_provider: "Google",
          last_active: log.created_at || new Date().toISOString(),
          ip: log.ip || null,
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
        auth_provider: "Google",
        last_active: new Date().toISOString(),
        ip: null,
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
    return products.filter((p) => {
      if (!productSearch.trim()) return true;
      return (p.name + (p.name_en || "") + (p.description || "") + (p.category || "")).toLowerCase().includes(productSearch.toLowerCase());
    });
  }, [products, productSearch]);

  function handleOpenKeysTabForProduct(product: Product) {
    setEditingProduct(product);
    setProductForm({
      name: product.name,
      nameEn: product.name_en || "",
      sku: `prod-${product.id.slice(0, 8)}`,
      stockType: "digital_keys",
      status: product.is_active !== false ? "ACTIVE" : "INACTIVE",
      visibility: product.is_visible !== false ? "VISIBLE" : "HIDDEN",
      sortOrder: 1,
      version: "",
      fileSize: "",
      description: product.description || "",
      category: product.category || "General",
      accessUrl: product.access_url || "",
      imageUrl: product.image_url || "",
      instructions: product.instructions || "",
      defaultDurationDays: product.default_duration_days || 30,
      isVisible: product.is_visible !== false,
      isActive: product.is_active !== false,
      files: Array.isArray(product.files) ? product.files : [],
      customFields: [],
    });
    setProductModalTab("keys");
    setShowProductModal(true);
    fetchProductKeys(product.id);
  }

  const navItems = [
    {
      id: "overview" as AdminSection,
      icon: LayoutDashboard,
      ar: "نظرة عامة",
      en: "Overview",
    },
    {
      id: "products" as AdminSection,
      icon: Package,
      ar: "المنتجات",
      en: "Products",
      badge: products.length,
    },
    {
      id: "inventory" as AdminSection,
      icon: KeyRound,
      ar: "المخزون",
      en: "Inventory",
      badge: dashboardStats?.keys?.available_keys !== undefined ? dashboardStats.keys.available_keys : undefined,
    },
    {
      id: "customers" as AdminSection,
      icon: Users,
      ar: "العملاء",
      en: "Customers",
      badge: customerTotalCount || customers.length || undefined,
    },
    {
      id: "orders" as AdminSection,
      icon: RotateCcw,
      ar: "الطلبات",
      en: "Orders & Resets",
      badge: resetRequestsList.filter((r) => r.status === "PENDING").length || undefined,
    },
    {
      id: "logs" as AdminSection,
      icon: ShieldCheck,
      ar: "السجلات",
      en: "Logs",
    },
    {
      id: "settings" as AdminSection,
      icon: Settings,
      ar: "الإعدادات",
      en: "Settings",
    },
  ];

  return (
    <div className={`admin-reference-container saas-admin ${navCollapsed ? "admin-collapsed" : ""}`} data-theme={isDark ? "dark" : "light"} dir={ar ? "rtl" : "ltr"}>
      {/* NAVIGATION BAR WITH CLEAN EXIT PILL */}
      <nav className="admin-ref-nav-bar" aria-label={t("أقسام الإدارة", "Admin sections")}>
        <div className="admin-sidebar-heading"><span>{t("إدارة المنصة", "WORKSPACE")}</span><button type="button" onClick={() => setNavCollapsed(v => !v)} aria-expanded={!navCollapsed} aria-label={navCollapsed ? t("توسيع أقسام الإدارة", "Expand admin navigation") : t("طي أقسام الإدارة", "Collapse admin navigation")} title={navCollapsed ? t("توسيع القائمة", "Expand menu") : t("طي القائمة", "Collapse menu")}>{navCollapsed ? <PanelRightOpen size={18}/> : <PanelRightClose size={18}/>}</button></div>
        <div className="admin-ref-nav-track">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = activeSection === item.id ||
              (item.id === "orders" && activeSection === "reset-requests") ||
              (item.id === "logs" && (activeSection === "logs-activations" || activeSection === "logs-logins")) ||
              (item.id === "customers" && activeSection === "search-customer");
            return (
              <button
                key={item.id}
                className={`admin-ref-nav-pill ${active ? "active" : ""}`}
                aria-current={active ? "page" : undefined}
                title={t(item.ar, item.en)}
                onClick={() => {
                  setActiveSection(item.id);
                  if (item.id === "customers") {
                    loadCustomers(customerSearch, customerStatusFilter, customerPage);
                  } else if (item.id === "logs") {
                    void loadActivationLogs();
                    void loadLoginLogs();
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
        {/* VIEW 0: نظرة عامة على قاعدة البيانات (Live DB Stats) */}
        {/* ==================================================== */}
        {activeSection === "overview" && (
          <div className="ref-view-section">
            <div className="ref-overview-admin-header">
              <div className="ref-admin-hero-title">
                <div className="ref-admin-live-pulse-badge">
                  <span className="pulse-green-dot" />
                  <span>{t("قاعدة البيانات متصلة ومباشرة", "Live Database Connected")}</span>
                </div>
                <h2>{t("نظرة عامة على النظام وقاعدة البيانات", "System & Database Overview")}</h2>
                <p className="ref-admin-hero-desc">
                  {t(
                    "إحصاءات حقيقية مباشرة مستخرجة من قاعدة البيانات للتحكم بالمنتجات والمخزون والعملاء والطلبات.",
                    "Live database metrics for products, stock inventory, customers, and operations."
                  )}
                </p>
              </div>

              <div className="ref-admin-hero-actions">
                <button
                  type="button"
                  className="ref-btn-create-product"
                  onClick={openAddProduct}
                >
                  <Plus size={15} />
                  <span>{t("إضافة منتج جديد", "Add New Product")}</span>
                </button>
              </div>
            </div>

            {/* Live Database Metrics Grid (6 Real Cards) */}
            <div className="ref-admin-stats-grid">
              {/* Stat 1: Total Products */}
              <div className="ref-stat-card">
                <div className="ref-stat-icon-wrap blue">
                  <Package size={20} />
                </div>
                <div className="ref-stat-data">
                  <span className="ref-stat-label">{t("إجمالي المنتجات", "Total Products")}</span>
                  <strong className="ref-stat-number">
                    {dashboardStats?.products?.total_products ?? products.length}
                  </strong>
                  <span className="ref-stat-sub">
                    {t(
                      `منها ${dashboardStats?.products?.active_products ?? products.filter((p) => p.is_active).length} منتج نشط`,
                      `${dashboardStats?.products?.active_products ?? products.filter((p) => p.is_active).length} active products`
                    )}
                  </span>
                </div>
              </div>

              {/* Stat 2: Stock Available Keys */}
              <div className="ref-stat-card">
                <div className="ref-stat-icon-wrap cyan">
                  <KeyRound size={20} />
                </div>
                <div className="ref-stat-data">
                  <span className="ref-stat-label">{t("المفاتيح المتوفرة بالمخزون", "Available Stock Keys")}</span>
                  <strong className="ref-stat-number text-cyan">
                    {dashboardStats?.keys?.available_keys ?? 0}
                  </strong>
                  <span className="ref-stat-sub">
                    {t(
                      `من إجمالي ${dashboardStats?.keys?.total_keys ?? 0} مفتاح`,
                      `out of ${dashboardStats?.keys?.total_keys ?? 0} total keys`
                    )}
                  </span>
                </div>
              </div>

              {/* Stat 3: Redeemed Keys */}
              <div className="ref-stat-card">
                <div className="ref-stat-icon-wrap green">
                  <CheckCircle2 size={20} />
                </div>
                <div className="ref-stat-data">
                  <span className="ref-stat-label">{t("المفاتيح المفعلة", "Redeemed Keys")}</span>
                  <strong className="ref-stat-number text-success">
                    {dashboardStats?.keys?.redeemed_keys ?? 0}
                  </strong>
                  <span className="ref-stat-sub">
                    {t("تراخيص مرتبطة بحسابات العملاء", "Active linked licenses")}
                  </span>
                </div>
              </div>

              {/* Stat 4: Registered Customers */}
              <div className="ref-stat-card">
                <div className="ref-stat-icon-wrap purple">
                  <Users size={20} />
                </div>
                <div className="ref-stat-data">
                  <span className="ref-stat-label">{t("العملاء المسجلون", "Total Customers")}</span>
                  <strong className="ref-stat-number">
                    {dashboardStats?.customers?.total_customers ?? customerTotalCount ?? customers.length}
                  </strong>
                  <span className="ref-stat-sub">
                    {t("حسابات حقيقية مسجلة بالنظام", "Real registered accounts")}
                  </span>
                </div>
              </div>

              {/* Stat 5: Activations Today */}
              <div className="ref-stat-card">
                <div className="ref-stat-icon-wrap orange">
                  <Clock size={20} />
                </div>
                <div className="ref-stat-data">
                  <span className="ref-stat-label">{t("تفعيلات اليوم", "Today's Activations")}</span>
                  <strong className="ref-stat-number">
                    {dashboardStats?.activationsToday ?? 0}
                  </strong>
                  <span className="ref-stat-sub">
                    {t("تفعيلات خلال الـ 24 ساعة الماضية", "Activations last 24h")}
                  </span>
                </div>
              </div>

              {/* Stat 6: Pending Reset Requests */}
              <div className="ref-stat-card">
                <div className="ref-stat-icon-wrap yellow">
                  <RotateCcw size={20} />
                </div>
                <div className="ref-stat-data">
                  <span className="ref-stat-label">{t("طلبات الرستات المعلقة", "Pending Key Resets")}</span>
                  <strong className="ref-stat-number text-warning">
                    {resetRequestsList.filter((r) => r.status === "PENDING").length}
                  </strong>
                  <span className="ref-stat-sub">
                    {t("طلبات تبديل HWID بانتظار التدقيق", "Awaiting review")}
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Navigation Shortcuts */}
            <div className="ref-admin-shortcuts-grid">
              <button
                type="button"
                className="ref-admin-shortcut-card"
                onClick={() => setActiveSection("products")}
              >
                <div className="shortcut-icon-box blue"><Package size={18} /></div>
                <div className="shortcut-info">
                  <strong>{t("إدارة المنتجات", "Manage Products")}</strong>
                  <span>{t("تعديل وإضافة باقات المنتجات والملفات والشروحات", "Create, edit and manage packages")}</span>
                </div>
                <ArrowRight size={16} className={ar ? "rotate-180" : ""} />
              </button>

              <button
                type="button"
                className="ref-admin-shortcut-card"
                onClick={() => setActiveSection("inventory")}
              >
                <div className="shortcut-icon-box cyan"><KeyRound size={18} /></div>
                <div className="shortcut-info">
                  <strong>{t("المخزون والمفاتيح", "Manage Inventory")}</strong>
                  <span>{t("فحص أرصدة المخزون وتوليد واستيراد المفاتيح", "Generate, import and monitor keys")}</span>
                </div>
                <ArrowRight size={16} className={ar ? "rotate-180" : ""} />
              </button>

              <button
                type="button"
                className="ref-admin-shortcut-card"
                onClick={() => {
                  setActiveSection("customers");
                  loadCustomers(customerSearch, customerStatusFilter, customerPage);
                }}
              >
                <div className="shortcut-icon-box purple"><Users size={18} /></div>
                <div className="shortcut-info">
                  <strong>{t("إدارة العملاء", "Manage Customers")}</strong>
                  <span>{t("فحص التراخيص والبحث وتعديل حالات الحسابات", "Inspect licenses and manage users")}</span>
                </div>
                <ArrowRight size={16} className={ar ? "rotate-180" : ""} />
              </button>

              <button
                type="button"
                className="ref-admin-shortcut-card"
                onClick={() => setActiveSection("orders")}
              >
                <div className="shortcut-icon-box yellow"><RotateCcw size={18} /></div>
                <div className="shortcut-info">
                  <strong>{t("الطلبات ورستات المفاتيح", "Orders & Key Resets")}</strong>
                  <span>{t("مراجعة وقبول أو رفض طلبات تبديل HWID", "Review HWID reset requests")}</span>
                </div>
                <ArrowRight size={16} className={ar ? "rotate-180" : ""} />
              </button>

              <button
                type="button"
                className="ref-admin-shortcut-card"
                onClick={() => {
                  setActiveSection("logs");
                  void loadActivationLogs();
                  void loadLoginLogs();
                }}
              >
                <div className="shortcut-icon-box green"><ShieldCheck size={18} /></div>
                <div className="shortcut-info">
                  <strong>{t("السجلات والنشاط", "Logs & Audit")}</strong>
                  <span>{t("سجل التفعيلات الحقيقية والجلسات النشطة", "Real activations and active sessions")}</span>
                </div>
                <ArrowRight size={16} className={ar ? "rotate-180" : ""} />
              </button>
            </div>

            {/* Recent Live Activity Feed from Database */}
            <div className="ref-admin-recent-box">
              <div className="ref-admin-recent-header">
                <div className="recent-title-cluster">
                  <ShieldCheck size={18} className="text-cyan" />
                  <h3>{t("آخر العمليات المسجلة في قاعدة البيانات", "Recent Database Activity")}</h3>
                </div>
                <button
                  type="button"
                  className="ref-timeline-refresh-btn"
                  onClick={() => {
                    setActiveSection("logs");
                    void loadActivationLogs();
                    void loadLoginLogs();
                  }}
                >
                  <span>{t("عرض جميع السجلات", "View All Logs")}</span>
                  <ArrowRight size={14} className={ar ? "rotate-180" : ""} />
                </button>
              </div>

              {dashboardStats?.recentActivity && dashboardStats.recentActivity.length > 0 ? (
                <div className="ref-recent-logs-list">
                  {dashboardStats.recentActivity.map((log: any) => {
                    const info = describeActivity(log);
                    const RowIcon = info.Icon;
                    return (
                      <div className="ref-recent-log-row" key={log.id}>
                        <span className={`recent-log-icon ${info.tone}`} aria-hidden="true">
                          <RowIcon size={15} />
                        </span>
                        <div className="recent-log-desc">
                          <strong>{info.title}</strong>
                          {info.subtitle && <span className="recent-log-sub">{info.subtitle}</span>}
                        </div>
                        <div className="recent-log-actor" dir="ltr">{log.actor_email}</div>
                        <div className="recent-log-time">
                          <Clock size={12} />
                          <time>{new Date(log.created_at).toLocaleTimeString(ar ? "ar-SA" : "en-US")}</time>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="ref-empty-admin-state">
                  <Database size={24} />
                  <span>{t("لا توجد عمليات مسجلة حديثاً في قاعدة البيانات.", "No recent recorded operations.")}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ==================================================== */}
        {/* VIEW 0B: إدارة المخزون (Stock & Inventory) */}
        {/* ==================================================== */}
        {activeSection === "inventory" && (
          <div className="ref-view-section">
            <div className="ref-products-header-clean">
              <div className="ref-toolbar-text-wrap">
                <h3 className="ref-section-title">
                  <KeyRound size={20} />
                  <span>{t("إدارة المخزون والمفاتيح", "Stock & License Keys")}</span>
                </h3>
                <p className="ref-section-subtitle">
                  {t(
                    "توليد واستيراد الأكواد، فحص الأرصدة المتاحة لكل منتج، والتحكم بمفاتيح التراخيص.",
                    "Manage key stock, bulk generate or import keys for products."
                  )}
                </p>
              </div>
            </div>

            <div className="ref-inventory-product-cards-grid">
              {products.map((p) => {
                const avail = p.available_keys ?? 0;
                const redeemed = p.redeemed_keys ?? 0;
                const isLow = avail < (settingsForm?.low_stock_threshold || initialSettings?.low_stock_threshold || 5);

                return (
                  <div className="ref-inventory-product-card" key={p.id}>
                    <div className="ref-inv-card-top">
                      <div className="ref-inv-art">
                        {p.image_url ? (
                          <img src={p.image_url} alt="" />
                        ) : (
                          <Package size={24} />
                        )}
                      </div>
                      <div className="ref-inv-meta">
                        <strong>{p.name}</strong>
                        <span className="ref-inv-category">{p.category || "SpooFX"}</span>
                      </div>
                      <span className={`ref-stock-pill ${isLow ? "low" : "ok"}`}>
                        {avail} {t("متاح", "Available")}
                      </span>
                    </div>

                    <div className="ref-inv-stats-row">
                      <div className="inv-stat-item">
                        <span>{t("المتوفر:", "Available:")}</span>
                        <strong className="text-cyan">{avail}</strong>
                      </div>
                      <div className="inv-stat-item">
                        <span>{t("المفعل:", "Redeemed:")}</span>
                        <strong className="text-success">{redeemed}</strong>
                      </div>
                    </div>

                    <button
                      type="button"
                      className="ref-btn-manage-stock"
                      onClick={() => handleOpenKeysTabForProduct(p)}
                    >
                      <KeyRound size={14} />
                      <span>{t("إدارة مفاتيح المنتج", "Manage Product Keys")}</span>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ==================================================== */}
        {/* ==================================================== */}
        {/* VIEW 1: المنتجات والمخزون (Matching Image 2 Exactly) */}
        {/* ==================================================== */}
        {activeSection === "products" && (
          <div className="ref-view-section">
            {/* Header matching Image 2 */}
            <div className="ref-products-header-clean">
              <div className="ref-toolbar-text-wrap">
                <h3 className="ref-section-title">
                  <Package size={20} />
                  <span>{t("منتجات المتجر والمخزون المتاح", "Store Products & Available Stock")}</span>
                </h3>
                <p className="ref-section-subtitle">
                  {t(
                    "انقر على أي منتج لفتحه وتعديله وتعبئة مفاتيحه",
                    "Click on any product to open, edit, and fill its keys"
                  )}
                </p>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                {selectedProductIds.length > 0 && (
                  <button
                    type="button"
                    className="ref-btn-batch-danger"
                    onClick={handleBulkDelete}
                    title={t("حذف المنتجات المحددة نهائياً", "Delete selected products")}
                  >
                    <Trash2 size={14} />
                    <span>{t(`حذف المحددة (${selectedProductIds.length})`, `Delete (${selectedProductIds.length})`)}</span>
                  </button>
                )}
                <button className="ref-btn-add-prod-blue" onClick={openAddProduct}>
                  <Plus size={16} />
                  <span>{t("إضافة منتج جديد", "Add New Product")}</span>
                </button>
              </div>
            </div>

            {/* 3-Column Product Cards Grid Matching Image 2 */}
            <div className="ref-products-grid-3col">
              {filteredProducts.map((p) => {
                const stockCount = Number(p.available_keys || 0);
                return (
                  <div className="ref-prod-card-exact" key={p.id}>
                    {/* 16:9 Banner with Top-Right Stock Pill */}
                    <div className="ref-prod-card-banner">
                      {p.image_url ? (
                        <img src={p.image_url} alt={p.name} />
                      ) : (
                        <div className="ref-card-img-placeholder">
                          <Package size={48} />
                        </div>
                      )}
                      <div className="ref-prod-card-stock-pill">
                        {t(`المخزون المتاح: ${stockCount}`, `Available Stock: ${stockCount}`)}
                      </div>
                    </div>

                    {/* Card Content Body */}
                    <div className="ref-prod-card-content">
                      <div className="ref-prod-card-title-row">
                        <div className="ref-prod-card-icon-box">
                          <Package size={18} />
                        </div>
                        <h4>{p.name}</h4>
                      </div>

                      <div className="ref-prod-card-badge-row">
                        <span className="ref-prod-card-cat-badge">{p.category || "General"}</span>
                        {(p as any).version && (
                          <span className="ref-prod-card-cat-badge">{(p as any).version}</span>
                        )}
                      </div>

                      <p className="ref-prod-card-description">
                        {p.description || t("لا يوجد وصف إضافي.", "No description provided.")}
                      </p>
                    </div>

                    {/* Exactly 2 Wide Action Buttons Side-by-Side (Image 2) */}
                    <div className="ref-prod-card-actions-2btn">
                      <button
                        type="button"
                        className="ref-btn-card-blue"
                        onClick={() => openEditProduct(p, "keys")}
                        title={t("إضافة وتعبئة مفاتيح", "Add Keys")}
                      >
                        <KeyRound size={15} />
                        <span>{t("إضافة مفاتيح", "Add Keys")}</span>
                      </button>

                      <button
                        type="button"
                        className="ref-btn-card-dark"
                        onClick={() => openEditProduct(p, "details")}
                        title={t("تعديل المنتج", "Edit Product")}
                      >
                        <Sliders size={15} />
                        <span>{t("تعديل المنتج", "Edit Product")}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}



        {/* ==================================================== */}
        {/* VIEW 2B: الطلبات ورستات المفاتيح (Orders & Key Reset Requests) */}
        {/* ==================================================== */}
        {(activeSection === "orders" || activeSection === "reset-requests") && (
          <div className="ref-view-section">
            <div className="ref-table-card">
              {/* Toolbar & Filter Bar */}
              <div className="ref-table-card-header">
                <div className="ref-reset-header-info">
                  <h3 className="ref-card-main-title">
                    <RotateCcw size={20} className="text-warning" />
                    <span>{t("إدارة الطلبات ورستات المفاتيح", "Orders & Key Reset Requests")}</span>
                  </h3>
                  <p className="ref-section-subtitle">
                    {t(
                      "تظهر هنا طلبات العملاء لإعادة تعيين مفاتيحهم لأجهزة جديدة. يمكنك الموافقة أو الرفض فوراً مع إرسال ملاحظات تظهر للعميل.",
                      "Customer requests to re-bind licenses to new hardware. Approve or reject with custom feedback visible to customer."
                    )}
                  </p>
                </div>

                <div className="ref-table-search-box">
                  <Search size={16} />
                  <input
                    type="text"
                    value={resetSearch}
                    onChange={(e) => setResetSearch(e.target.value)}
                    placeholder={t("ابحث بالعميل، اسم المنتج، أو السبب...", "Search customer, product, or reason...")}
                  />
                </div>
              </div>

              {/* Status Filter Chips */}
              <div className="ref-products-filter-bar">
                <div className="ref-filter-chips-cluster">
                  <button
                    type="button"
                    className={`ref-filter-chip ${resetFilter === "ALL" ? "active" : ""}`}
                    onClick={() => setResetFilter("ALL")}
                  >
                    <span>{t("الكل", "All")}</span>
                    <span className="ref-chip-count">{resetRequestsList.length}</span>
                  </button>

                  <button
                    type="button"
                    className={`ref-filter-chip ${resetFilter === "PENDING" ? "active-warning" : ""}`}
                    onClick={() => setResetFilter("PENDING")}
                  >
                    <Clock size={13} />
                    <span>{t("قيد الانتظار", "Pending")}</span>
                    <span className="ref-chip-count">{resetRequestsList.filter((r) => r.status === "PENDING").length}</span>
                  </button>

                  <button
                    type="button"
                    className={`ref-filter-chip ${resetFilter === "APPROVED" ? "active-green" : ""}`}
                    onClick={() => setResetFilter("APPROVED")}
                  >
                    <CheckCircle2 size={13} />
                    <span>{t("تمت الموافقة", "Approved")}</span>
                    <span className="ref-chip-count">{resetRequestsList.filter((r) => r.status === "APPROVED").length}</span>
                  </button>

                  <button
                    type="button"
                    className={`ref-filter-chip ${resetFilter === "REJECTED" ? "active-danger" : ""}`}
                    onClick={() => setResetFilter("REJECTED")}
                  >
                    <X size={13} />
                    <span>{t("تم الرفض", "Rejected")}</span>
                    <span className="ref-chip-count">{resetRequestsList.filter((r) => r.status === "REJECTED").length}</span>
                  </button>
                </div>

                <button
                  type="button"
                  className="ref-btn-batch-subtle"
                  onClick={() => void onRefresh()}
                  title={t("تحديث القائمة", "Refresh List")}
                >
                  <RefreshCw size={14} className={busy ? "spin" : ""} />
                  <span>{t("تحديث الطلبات", "Refresh Requests")}</span>
                </button>
              </div>

              {/* Reset Requests Cards List */}
              <div className="ref-reset-requests-list">
                {(() => {
                  const filtered = resetRequestsList.filter((r) => {
                    if (resetFilter !== "ALL" && r.status !== resetFilter) return false;
                    if (resetSearch.trim()) {
                      const q = resetSearch.toLowerCase();
                      const match =
                        (r.customer_email || "").toLowerCase().includes(q) ||
                        (r.customer_name || "").toLowerCase().includes(q) ||
                        (r.product_name || "").toLowerCase().includes(q) ||
                        (r.reason || "").toLowerCase().includes(q) ||
                        (r.license_code || "").toLowerCase().includes(q);
                      if (!match) return false;
                    }
                    return true;
                  });

                  if (filtered.length === 0) {
                    return (
                      <div className="ref-timeline-empty">
                        <RotateCcw size={32} className="text-muted" />
                        <p>{t("لا توجد طلبات رستات مفاتيح مطابقة في هذا القسم.", "No matching key reset requests found.")}</p>
                      </div>
                    );
                  }

                  return filtered.map((req) => {
                    const isPending = req.status === "PENDING";
                    const isApproved = req.status === "APPROVED";
                    const isRejected = req.status === "REJECTED";
                    const userName = req.customer_name || req.customer_email.split("@")[0] || "User";

                    return (
                      <div className={`ref-reset-request-card ${req.status.toLowerCase()}`} key={req.id}>
                        {/* Top row: Customer & Product & Status */}
                        <div className="ref-reset-card-header">
                          <div className="ref-reset-user-block">
                            <div className="ref-session-avatar-wrap">
                              {req.customer_image ? (
                                <img src={req.customer_image} alt="" className="ref-session-avatar" />
                              ) : (
                                <div className="ref-session-avatar-fallback">{userName[0].toUpperCase()}</div>
                              )}
                            </div>
                            <div className="ref-reset-user-meta">
                              <strong>{userName}</strong>
                              <span className="ref-user-email-text" dir="ltr">{req.customer_email}</span>
                              <span className="ref-session-google-tag" dir="ltr"><span className="ref-google-dot" /> Google</span>
                            </div>
                          </div>

                          <div className="ref-reset-product-block">
                            <span className="ref-reset-prod-pill">
                              <Package size={14} />
                              <span>{req.product_name}</span>
                            </span>
                            {req.license_code && (
                              <span className="ref-reset-key-pill" dir="ltr">
                                <KeyRound size={12} />
                                <span>{req.license_code}</span>
                              </span>
                            )}
                          </div>

                          <div className="ref-reset-status-block">
                            <span className={`ref-status-badge-pill ${req.status.toLowerCase()}`}>
                              {isPending && <><Clock size={13} /> {t("قيد الانتظار", "Pending")}</>}
                              {isApproved && <><CheckCircle2 size={13} /> {t("تمت الموافقة", "Approved")}</>}
                              {isRejected && <><X size={13} /> {t("مرفوض", "Rejected")}</>}
                            </span>
                            <div className="ref-reset-date-stamp">
                              <Calendar size={13} />
                              <span>{formatRiyadhTime(req.created_at)}</span>
                            </div>
                          </div>
                        </div>

                        {/* Customer Reason Box */}
                        <div className="ref-reset-reason-bubble">
                          <div className="ref-reason-label-row">
                            <Info size={14} />
                            <span>{t("سبب طلب الرستات من العميل:", "Customer Stated Reason:")}</span>
                          </div>
                          <p className="ref-reason-text">"{req.reason}"</p>
                        </div>

                        {/* Reviewed Audit Note if reviewed */}
                        {req.reviewed_by && (
                          <div className="ref-reset-audit-note-box">
                            <div className="ref-audit-meta-row">
                              <span>
                                <strong>{t("تمت المراجعة بواسطة:", "Reviewed by:")}</strong> {req.reviewed_by}
                              </span>
                              {req.reviewed_at && (
                                <span>
                                  <strong>{t("التاريخ:", "Date:")}</strong> {formatRiyadhTime(req.reviewed_at)}
                                </span>
                              )}
                            </div>
                            {req.admin_notes && (
                              <p className="ref-audit-notes-text">
                                <strong>{t("ملاحظة الإدارة للعميل:", "Admin Note:")}</strong> {req.admin_notes}
                              </p>
                            )}
                          </div>
                        )}

                        {/* Action Row (Approve / Reject & Note input) */}
                        <div className="ref-reset-action-row">
                          <div className="ref-reset-note-input-wrap">
                            <input
                              type="text"
                              className="ref-text-input ref-admin-note-input"
                              placeholder={t("اكتب ملاحظة للعميل (اختياري)...", "Write note for customer (optional)...")}
                              value={reviewNotes[req.id] !== undefined ? reviewNotes[req.id] : (req.admin_notes || "")}
                              onChange={(e) => setReviewNotes((prev) => ({ ...prev, [req.id]: e.target.value }))}
                            />
                          </div>

                          <div className="ref-reset-btns-wrap">
                            <button
                              type="button"
                              className={`ref-btn-approve-reset ${isApproved ? "already-active" : ""}`}
                              disabled={reviewingId === req.id}
                              onClick={() => void handleReviewReset(req.id, "APPROVED")}
                              title={t("الموافقة على طلب الرستات وإعادة تعيين المفتاح", "Approve reset request")}
                            >
                              {reviewingId === req.id ? <LoaderCircle size={15} className="spin" /> : <Check size={15} />}
                              <span>{isApproved ? t("معتمد مسبقاً (إعادة اعتماد)", "Re-Approve") : t("موافقة على الرستات", "Approve Reset")}</span>
                            </button>

                            <button
                              type="button"
                              className={`ref-btn-reject-reset ${isRejected ? "already-active" : ""}`}
                              disabled={reviewingId === req.id}
                              onClick={() => void handleReviewReset(req.id, "REJECTED")}
                              title={t("رفض طلب الرستات", "Reject reset request")}
                            >
                              {reviewingId === req.id ? <LoaderCircle size={15} className="spin" /> : <X size={15} />}
                              <span>{isRejected ? t("مرفوض مسبقاً", "Rejected") : t("رفض الطلب", "Reject")}</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
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
                    placeholder={t("ابحث باسم العميل أو بريده الإلكتروني...", "Search by customer name or email...")}
                  />
                </div>
              </div>

              <div className="ref-table-responsive-container">
                <table className="ref-data-table">
                  <thead>
                    <tr>
                      <th>{t("العميل", "Customer")}</th>
                      <th>{t("البريد الإلكتروني / الحساب", "Email / Account")}</th>
                      <th>{t("الرتبة", "Role")}</th>
                      <th>{t("عنوان IP", "IP Address")}</th>
                      <th>{t("الإجراءات والاشتراكات", "Actions & Subscriptions")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {customers.length > 0 ? (
                      customers.map((c) => {
                        const isMuted = c.status === "SUSPENDED";
                        const clientIp = (c as any).last_ip || null;
                        const role = (c as any).role || "Customer";
                        const userId = `user-${c.id.slice(0, 16)}...`;

                        return (
                          <tr key={c.id}>
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

                            <td className="ref-email-auth-col">
                              <span className="ref-customer-email" dir="ltr">{c.email}</span>
                              <span className="ref-customer-google-tag" dir="ltr">
                                <span className="ref-google-dot" />
                                <span>Google</span>
                              </span>
                            </td>

                            <td>
                              <span className="ref-role-pill">{role}</span>
                            </td>

                            <td dir="ltr" className="ref-ip-text">
                              {clientIp || "—"}
                            </td>

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
                placeholder={t("ابحث بالاسم أو البريد الإلكتروني...", "Type name or email to search...")}
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
        {activeSection === "logs" && (
          <div className="ref-logs-subnav-bar">
            <button
              type="button"
              className={`ref-logs-tab-pill ${logsTab === "activations" ? "active" : ""}`}
              onClick={() => {
                setLogsTab("activations");
                void loadActivationLogs();
              }}
            >
              <KeyRound size={15} />
              <span>{t("سجل النشاط والتفعيلات", "Activity & Activations")}</span>
              {activationLogs.length > 0 && <span className="nav-pill-counter">{activationLogs.length}</span>}
            </button>
            <button
              type="button"
              className={`ref-logs-tab-pill ${logsTab === "sessions" ? "active" : ""}`}
              onClick={() => {
                setLogsTab("sessions");
                void loadLoginLogs();
              }}
            >
              <ShieldCheck size={15} />
              <span>{t("جلسات الدخول والاتصال", "Active Sessions")}</span>
              {activeSessions.length > 0 && <span className="nav-pill-counter">{activeSessions.length}</span>}
            </button>
          </div>
        )}

        {(activeSection === "logs-activations" || (activeSection === "logs" && logsTab === "activations")) && (
          <div className="ref-view-section">
            <div className="ref-table-card">
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

                <div className="ref-timeline-stats-row">
                  <div className="ref-timeline-stat-pill">
                    <strong>{activationLogs.length}</strong>
                    <span>{t("الأحداث المسجلة", "Logged Events")}</span>
                  </div>

                  <div className="ref-timeline-stat-pill">
                    <strong>{new Set(activationLogs.map((l) => l.redeemed_by).filter(Boolean)).size}</strong>
                    <span>{t("أصحاب النشاط", "Active Users")}</span>
                  </div>

                  <div className="ref-timeline-stat-pill time-pill">
                    <Clock size={14} />
                    <span>{formatRiyadhHour()}</span>
                    <small>{t("آخر تحديث", "Last Update")}</small>
                  </div>
                </div>

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

              <div className="ref-timeline-cards-list">
                {filteredActivationLogs.length > 0 ? (
                  filteredActivationLogs.map((log) => {
                    const clientIp = log.ip || null;
                    const userName = log.redeemed_by ? log.redeemed_by.split("@")[0] : t("مستخدم", "User");
                    const displayCode = log.raw_code || log.masked_code || (log.code_suffix ? `••••-••••-${log.code_suffix}` : "••••••••");

                    return (
                      <div className="ref-timeline-event-card" key={log.id}>
                        <div className="ref-event-info-side">
                          <span className="ref-event-action-pill green">
                            {t("تفعيل مفتاح", "Key Activation")}
                          </span>
                          <div className="ref-event-title-stack">
                            <strong>{t(`تم تفعيل مفتاح ${log.product_name || "المنتج"}`, `Activated key for ${log.product_name || "Product"}`)}</strong>
                            <small dir="ltr" className="ref-key-code-masked">
                              {displayCode}
                            </small>
                          </div>
                        </div>

                        <div className="ref-event-user-side">
                          <div className="ref-event-avatar-wrap">
                            <div className="ref-event-avatar-fallback">{userName[0].toUpperCase()}</div>
                          </div>
                          <div className="ref-event-user-details">
                            <strong>{userName}</strong>
                            <span dir="ltr" className="ref-google-user-tag"><span className="ref-google-dot" /> Google</span>
                            {clientIp && <small dir="ltr">IP {clientIp}</small>}
                          </div>
                        </div>

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
        {(activeSection === "logs-logins" || (activeSection === "logs" && logsTab === "sessions")) && (
          <div className="ref-view-section">
            <div className="ref-table-card">
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

              <div className="ref-sessions-list">
                {activeSessions.map((session) => {
                  return (
                    <div className="ref-session-card-row" key={session.id}>
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
                          <span dir="ltr" className="ref-session-google-tag"><span className="ref-google-dot" /> Google</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ==================================================== */}
        {/* VIEW 7: ضبط لوحة الإدارة والمتجر الشامل */}
        {/* ==================================================== */}
        {activeSection === "settings" && (
          <div className="ref-view-section">
            <div className="ref-section-toolbar">
              <div className="ref-toolbar-text-wrap">
                <h3 className="ref-section-title">
                  <Settings size={20} />
                  <span>{t("ضبط لوحة التحكم وإعدادات المتجر", "Control Panel & Store Settings")}</span>
                </h3>
                <p className="ref-section-subtitle">
                  {t(
                    "صلاحيات كاملة للتحكم في وضع الصيانة، إيقاف وتشغيل التفعيلات، الإجراءات الجماعية للمنتجات، وهوية المنصة.",
                    "Full administrative control over maintenance mode, activation rules, batch product operations, and brand identity."
                  )}
                </p>
              </div>

              <div className="ref-toolbar-actions">
                <button
                  type="button"
                  className="ref-btn-primary-gradient"
                  onClick={() => void handleSaveSettings()}
                  disabled={busy}
                >
                  {busy ? <LoaderCircle className="spin" size={16} /> : <Save size={16} />}
                  <span>{t("حفظ الإعدادات بالكامل", "Save All Settings")}</span>
                </button>
              </div>
            </div>

            {/* Grid of Settings Control Cards */}
            <div className="ref-settings-grid">
              {/* Card 1: وضع الصيانة للمتجر */}
              <div className="ref-setting-card">
                <div className="ref-setting-card-header">
                  <div className="ref-setting-icon-cube">
                    <Power size={20} className={settingsForm.maintenance_mode ? "text-warning" : "text-cyan"} />
                  </div>
                  <div className="ref-setting-header-titles">
                    <h4 className="ref-setting-title">{t("وضع الصيانة للمتجر", "Store Maintenance Mode")}</h4>
                    <p className="ref-setting-desc">
                      {t("إغلاق المتجر مؤقتاً أمام العملاء وإظهار رسالة صيانة رسمية.", "Temporarily close store for customers with official maintenance banner.")}
                    </p>
                  </div>
                  <div className="ref-setting-toggle-wrap">
                    <button
                      type="button"
                      className={`ref-toggle-pill ${settingsForm.maintenance_mode ? "active-warning" : "inactive"}`}
                      onClick={() =>
                        setSettingsForm((prev) => ({ ...prev, maintenance_mode: !prev.maintenance_mode }))
                      }
                    >
                      <span className="ref-toggle-thumb" />
                      <span>{settingsForm.maintenance_mode ? t("مفعّل (صيانة)", "Active (Maintenance)") : t("معطّل (يعمل)", "Disabled (Online)")}</span>
                    </button>
                  </div>
                </div>

                <div className="ref-setting-card-body">
                  <label className="ref-field-label">{t("رسالة الصيانة التي تظهر للزوار", "Maintenance Announcement Message")}</label>
                  <input
                    type="text"
                    value={settingsForm.maintenance_message}
                    onChange={(e) => setSettingsForm((prev) => ({ ...prev, maintenance_message: e.target.value }))}
                    className="ref-text-input"
                    placeholder={t("الموقع تحت الصيانة الدورية حالياً وسيعود للعمل قريباً...", "Store is currently under scheduled maintenance...")}
                  />
                </div>
              </div>

              {/* Card 2: صلاحيات تفعيل المفاتيح والتراخيص */}
              <div className="ref-setting-card">
                <div className="ref-setting-card-header">
                  <div className="ref-setting-icon-cube">
                    <KeyRound size={20} className={settingsForm.allow_new_activations ? "text-green" : "text-danger"} />
                  </div>
                  <div className="ref-setting-header-titles">
                    <h4 className="ref-setting-title">{t("صلاحيات تفعيل التراخيص", "License Key Activations")}</h4>
                    <p className="ref-setting-desc">
                      {t("السماح للعملاء بإدخال واسترداد مفاتيح التفعيل وربطها بحساباتهم.", "Allow or pause customer key redemptions across the platform.")}
                    </p>
                  </div>
                  <div className="ref-setting-toggle-wrap">
                    <button
                      type="button"
                      className={`ref-toggle-pill ${settingsForm.allow_new_activations ? "active-green" : "inactive-danger"}`}
                      onClick={() =>
                        setSettingsForm((prev) => ({ ...prev, allow_new_activations: !prev.allow_new_activations }))
                      }
                    >
                      <span className="ref-toggle-thumb" />
                      <span>{settingsForm.allow_new_activations ? t("التفعيل متاح", "Activations Open") : t("التفعيل مجمّد", "Activations Frozen")}</span>
                    </button>
                  </div>
                </div>

                <div className="ref-setting-card-body">
                  <p className="ref-setting-tip">
                    {settingsForm.allow_new_activations
                      ? t("العملاء يمكنهم تفعيل المفاتيح واستلام ملفات SpooFX فوراً دون قيود.", "Customers can redeem keys and download SpooFX files instantly.")
                      : t("التفعيلات مجمّدة مؤقتاً: أي محاولة تفعيل مفتاح ستُرفض لحين إعادة الفتح.", "Key redemptions paused: any attempt will be held until re-opened.")}
                  </p>
                </div>
              </div>

              {/* Card 3: تنبيه انخفاض المخزون */}
              <div className="ref-setting-card">
                <div className="ref-setting-card-header">
                  <div className="ref-setting-icon-cube">
                    <ShieldAlert size={20} className="text-cyan" />
                  </div>
                  <div className="ref-setting-header-titles">
                    <h4 className="ref-setting-title">{t("حد تنبيه انخفاض المخزون", "Low Stock Alert Threshold")}</h4>
                    <p className="ref-setting-desc">
                      {t("تحديد عدد المفاتيح المتبقية التي يعتبر عندها المخزون حرجاً ويحتاج تعبئة.", "Keys threshold below which inventory is marked critical.")}
                    </p>
                  </div>
                </div>

                <div className="ref-setting-card-body">
                  <div className="ref-input-group-row">
                    <input
                      type="number"
                      min={1}
                      max={50}
                      value={settingsForm.low_stock_threshold}
                      onChange={(e) => setSettingsForm((prev) => ({ ...prev, low_stock_threshold: Number(e.target.value) || 5 }))}
                      className="ref-number-input"
                    />
                    <span className="ref-input-unit">{t("مفاتيح أو أقل", "keys or less")}</span>
                  </div>

                  {/* Products currently below threshold */}
                  {(() => {
                    const lowStockProds = products.filter((p) => Number(p.available_keys || 0) <= settingsForm.low_stock_threshold);
                    return lowStockProds.length > 0 ? (
                      <div className="ref-low-stock-alert-box">
                        <AlertTriangle size={15} />
                        <span>
                          {t(
                            `يوجد ${lowStockProds.length} منتجات يقل مخزونها عن هذا الحد: `,
                            `${lowStockProds.length} products have low stock: `
                          )}
                          <strong>{lowStockProds.map((p) => `${p.name} (${p.available_keys || 0})`).join("، ")}</strong>
                        </span>
                      </div>
                    ) : (
                      <div className="ref-stock-healthy-box">
                        <CheckCircle2 size={15} />
                        <span>{t("جميع المنتجات تمتلك مخزوناً كافياً أعلى من حد التنبيه.", "All products have sufficient stock above threshold.")}</span>
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* Card 4: بيانات وهوية المتجر */}
              <div className="ref-setting-card">
                <div className="ref-setting-card-header">
                  <div className="ref-setting-icon-cube">
                    <Sliders size={20} className="text-blue" />
                  </div>
                  <div className="ref-setting-header-titles">
                    <h4 className="ref-setting-title">{t("هوية المتجر وبيانات المنصة", "Store Brand & Identity")}</h4>
                    <p className="ref-setting-desc">
                      {t("اسم المنصة والوصف التعريفي الذي يظهر في العناوين والتقارير.", "Platform title and description in banners and reports.")}
                    </p>
                  </div>
                </div>

                <div className="ref-setting-card-body">
                  <div className="ref-form-field-group">
                    <label className="ref-field-label">{t("اسم المنصة / المتجر", "Store Title")}</label>
                    <input
                      type="text"
                      value={settingsForm.site_name}
                      onChange={(e) => setSettingsForm((prev) => ({ ...prev, site_name: e.target.value }))}
                      className="ref-text-input"
                    />
                  </div>

                  <div className="ref-form-field-group" style={{ marginTop: "12px" }}>
                    <label className="ref-field-label">{t("وصف المنصة والخدمات", "Store Description")}</label>
                    <textarea
                      rows={2}
                      value={settingsForm.description}
                      onChange={(e) => setSettingsForm((prev) => ({ ...prev, description: e.target.value }))}
                      className="ref-textarea-input"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Universal Batch Powers Section */}
            <div className="ref-universal-powers-card">
              <div className="ref-universal-powers-header">
                <div className="ref-universal-title-row">
                  <Wrench size={20} className="text-cyan" />
                  <div>
                    <h4 className="ref-universal-powers-title">{t("صلاحيات التحكم الجماعي السريعة في المتجر", "Universal Store Batch Powers")}</h4>
                    <p className="ref-universal-powers-desc">
                      {t("إجراءات فورية تنطبق على كامل منتجات ومخزون وقاعدة بيانات المتجر بنقرة واحدة.", "Instant operations across all products, inventory, and database in 1 click.")}
                    </p>
                  </div>
                </div>
              </div>

              <div className="ref-universal-actions-row">
                <button
                  type="button"
                  className="ref-power-action-btn primary"
                  onClick={() => void handleBatchToggleVisibility(true)}
                >
                  <Eye size={16} />
                  <div>
                    <strong>{t("إظهار كافة المنتجات", "Show All Products")}</strong>
                    <small>{t("جعل جميع المنتجات معروضة فوراً في المتجر", "Make 100% of products visible")}</small>
                  </div>
                </button>

                <button
                  type="button"
                  className="ref-power-action-btn warning"
                  onClick={() => void handleBatchToggleVisibility(false)}
                >
                  <EyeOff size={16} />
                  <div>
                    <strong>{t("إخفاء كافة المنتجات", "Hide All Products")}</strong>
                    <small>{t("حجب جميع المنتجات عن المتجر مؤقتاً", "Hide all products from public view")}</small>
                  </div>
                </button>

                <button
                  type="button"
                  className="ref-power-action-btn danger"
                  onClick={handleClearConsumedKeys}
                >
                  <Trash2 size={16} />
                  <div>
                    <strong>{t("تنظيف الأكواد المستهلكة", "Clear Consumed Keys")}</strong>
                    <small>{t("حذف المفاتيح المستهلكة وإبقاء المخزون المتاح", "Purge sold keys, keep stock safe")}</small>
                  </div>
                </button>

                <button
                  type="button"
                  className="ref-power-action-btn subtle"
                  onClick={() => onRefresh()}
                >
                  <RefreshCw size={16} className={busy ? "spin" : ""} />
                  <div>
                    <strong>{t("مزامنة وتحديث شامل", "Full System Sync")}</strong>
                    <small>{t("تحديث الجلسات والتراخيص والإحصائيات", "Sync live sessions & licenses")}</small>
                  </div>
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ==================================================== */}
      {/* 5. EDIT PRODUCT MODAL (MATCHING IMAGES 2 & 3 ACCURATELY) */}
      {/* ==================================================== */}
      {showProductModal && (
        <ModalBackdrop className="modal-backdrop" onClick={() => setShowProductModal(false)}>
          <div className="modal-card ref-product-edit-modal-card" onClick={(e) => e.stopPropagation()}>
            {/* Modal Header with 3 Tabs (Images 1 & 3: Keys tab first) */}
            <div className="ref-edit-modal-tabs-header">
              <div className="ref-modal-tabs-cluster">
                {/* Tab 1: الأكواد المتاحة */}
                <button
                  type="button"
                  className={`ref-modal-tab-pill ${productModalTab === "keys" ? "active-blue" : ""}`}
                  onClick={() => setProductModalTab("keys")}
                >
                  <KeyRound size={15} />
                  <span>{t("الأكواد المتاحة", "Available Codes")}</span>
                  <span className="ref-tab-counter-badge">
                    {availableKeysCount}
                  </span>
                </button>

                {/* Tab 2: الحقول المخصصة */}
                <button
                  type="button"
                  className={`ref-modal-tab-pill ${productModalTab === "custom_fields" ? "active-blue" : ""}`}
                  onClick={() => setProductModalTab("custom_fields")}
                >
                  <Layers size={15} />
                  <span>{t("الحقول المخصصة", "Custom Fields")}</span>
                  <span className="ref-tab-counter-badge">{productForm.customFields.length}</span>
                </button>

                {/* Tab 3: بيانات المنتج */}
                <button
                  type="button"
                  className={`ref-modal-tab-pill ${productModalTab === "details" ? "active-blue" : ""}`}
                  onClick={() => setProductModalTab("details")}
                >
                  <FileText size={15} />
                  <span>{t("بيانات المنتج", "Product Data")}</span>
                </button>
              </div>

              <button className="ref-modal-close-icon" onClick={() => setShowProductModal(false)}>
                <X size={18} />
              </button>
            </div>

            {/* TAB 1: بيانات المنتج الأساسية (Image 2) */}
            {productModalTab === "details" && (
              <div className="ref-edit-tab-content">
                <div className="ref-tab-section-heading">
                  <FileText size={18} />
                  <span>{t("بيانات المنتج الأساسية", "Basic Product Information")}</span>
                </div>

                {/* Image Upload Card */}
                <div className="ref-edit-image-card">
                  <div className="ref-edit-image-left-preview">
                    {productForm.imageUrl ? (
                      <img src={productForm.imageUrl} alt="" className="ref-preview-thumbnail" />
                    ) : (
                      <div className="ref-preview-placeholder">
                        <Package size={32} />
                      </div>
                    )}
                  </div>

                  <div className="ref-edit-image-right-info">
                    <label className="ref-image-label">{t("صورة المنتج", "Product Image")}</label>
                    <p className="ref-image-hint">
                      {t("ألصق رابط الصورة أو اختر صورة من جهازك، وستظهر المعاينة فوراً.", "Paste image URL or choose image from device, preview will appear immediately.")}
                    </p>
                    <input
                      type="text"
                      dir="ltr"
                      value={productForm.imageUrl}
                      onChange={(e) => setProductForm({ ...productForm, imageUrl: e.target.value })}
                      placeholder="https://..."
                      className="ref-image-url-input"
                    />
                    <input
                      type="file"
                      ref={fileInputRef}
                      accept="image/*"
                      style={{ display: "none" }}
                      onChange={handleLocalImageUpload}
                    />
                    <button
                      type="button"
                      className="ref-btn-pick-image"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Upload size={14} />
                      <span>{t("اختيار صورة من الجهاز", "Choose Image from Device")}</span>
                    </button>
                  </div>
                </div>

                {/* 2-Column Grid of Product Fields (Image 2) */}
                <div className="ref-edit-fields-grid">
                  {/* Row 1 */}
                  <div className="ref-field-group">
                    <label>{t("اسم المنتج", "Product Name")} *</label>
                    <input
                      type="text"
                      value={productForm.name}
                      onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                      placeholder={t("اسم المنتج بالعربية...", "Product Name...")}
                      required
                    />
                  </div>

                  <div className="ref-field-group">
                    <label>{t("رمز التخزين التعريفي (SKU)", "SKU Identifier")}</label>
                    <input
                      type="text"
                      dir="ltr"
                      value={productForm.sku}
                      onChange={(e) => setProductForm({ ...productForm, sku: e.target.value })}
                      placeholder="prod-fortnite"
                    />
                  </div>

                  {/* Row 2 */}
                  <div className="ref-field-group">
                    <label>{t("نوع المخزون", "Inventory Type")}</label>
                    <div className="ref-readonly-pill-input">
                      <KeyRound size={15} />
                      <span>{t("مفاتيح رقمية (Digital Keys)", "Digital Keys")}</span>
                    </div>
                  </div>

                  <div className="ref-field-group">
                    <label>{t("حالة المنتج", "Product Status")}</label>
                    <select
                      value={productForm.status}
                      onChange={(e) => setProductForm({ ...productForm, status: e.target.value as any })}
                    >
                      <option value="ACTIVE">{t("نشط في المتجر", "Active in Store")}</option>
                      <option value="INACTIVE">{t("معطل مؤقتاً", "Temporarily Disabled")}</option>
                    </select>
                  </div>

                  {/* Row 3 */}
                  <div className="ref-field-group">
                    <label>{t("ظهور المنتج في المتجر", "Store Visibility")}</label>
                    <select
                      value={productForm.visibility}
                      onChange={(e) => setProductForm({ ...productForm, visibility: e.target.value as any })}
                    >
                      <option value="VISIBLE">{t("ظاهر للعملاء", "Visible to Customers")}</option>
                      <option value="HIDDEN">{t("مخفي عن العملاء", "Hidden from Store")}</option>
                    </select>
                  </div>

                  <div className="ref-field-group">
                    <label>{t("ترتيب العرض", "Display Order")}</label>
                    <input
                      type="number"
                      min={1}
                      value={productForm.sortOrder}
                      onChange={(e) => setProductForm({ ...productForm, sortOrder: Number(e.target.value) || 1 })}
                    />
                  </div>

                  {/* Row 4 */}
                  <div className="ref-field-group">
                    <label>{t("الإصدار (Version)", "Version")}</label>
                    <input
                      type="text"
                      dir="ltr"
                      value={productForm.version}
                      onChange={(e) => setProductForm({ ...productForm, version: e.target.value })}
                      placeholder={t("اختياري", "Optional")}
                    />
                  </div>

                  <div className="ref-field-group">
                    <label>{t("حجم الملف (File Size)", "File Size")}</label>
                    <input
                      type="text"
                      dir="ltr"
                      value={productForm.fileSize}
                      onChange={(e) => setProductForm({ ...productForm, fileSize: e.target.value })}
                      placeholder={t("اختياري", "Optional")}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: الحقول والخصائص المخصصة (Image 3) */}
            {productModalTab === "custom_fields" && (
              <div className="ref-edit-tab-content">
                <div className="ref-custom-fields-top-bar">
                  <div className="ref-tab-section-heading">
                    <Layers size={18} />
                    <span>{t("الحقول والخصائص المخصصة", "Custom Fields & Properties")}</span>
                  </div>

                  <button
                    type="button"
                    className="ref-btn-add-field-blue"
                    onClick={handleAddCustomField}
                  >
                    <Plus size={15} />
                    <span>{t("إضافة حقل جديد", "Add New Field")}</span>
                  </button>
                </div>

                <div className="ref-custom-fields-list">
                  {productForm.customFields.map((field, idx) => (
                    <div className="ref-custom-field-card" key={field.id}>
                      <div className="ref-cf-card-header">
                        <div className="ref-cf-header-title-tags">
                          <strong className="ref-cf-title">{field.name}</strong>
                          <span className="ref-cf-tag-type">{field.type}</span>
                          <span className="ref-cf-tag-key" dir="ltr">{field.key}</span>
                        </div>

                        <div className="ref-cf-header-actions">
                          <button
                            type="button"
                            className="ref-cf-icon-btn"
                            onClick={() => handleMoveFieldUp(idx)}
                            disabled={idx === 0}
                            title={t("تحريك للأعلى", "Move Up")}
                          >
                            <ArrowUp size={14} />
                          </button>
                          <button
                            type="button"
                            className="ref-cf-icon-btn"
                            onClick={() => handleMoveFieldDown(idx)}
                            disabled={idx === productForm.customFields.length - 1}
                            title={t("تحريك للأسفل", "Move Down")}
                          >
                            <ArrowDown size={14} />
                          </button>
                          <button
                            type="button"
                            className="ref-cf-icon-btn danger"
                            onClick={() => handleDeleteField(idx)}
                            title={t("حذف الحقل", "Delete Field")}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>

                      <div className="ref-cf-input-wrap">
                        <input
                          type="text"
                          dir="ltr"
                          value={field.value}
                          onChange={(e) => handleFieldChange(idx, e.target.value)}
                          placeholder="https://..."
                          className="ref-cf-value-input"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 1 (or Keys Tab): الأكواد المتاحة (Matching Image 1 Exactly) */}
            {productModalTab === "keys" && (
              <div className="ref-edit-tab-content" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                {/* 1. Exact Upper Box: إضافة الأكواد للمخزون (Image 1) */}
                <div className="ref-keys-add-box">
                  <div className="ref-keys-add-header">
                    <div className="ref-keys-add-title">
                      <Sparkles size={16} />
                      <span>{t("الأكواد والمفاتيح المتاحة لهذا المنتج", "Available Codes & Keys for this Product")}</span>
                      <span className="ref-keys-status-badge available" style={{ marginInlineStart: "10px", fontSize: "11px", padding: "2px 8px", borderRadius: "6px" }}>
                        {availableKeysCount} {t("متاح للبيع", "Available")}
                      </span>
                    </div>

                    <div className="ref-keys-duration-row">
                      <span>{t("المدة:", "Duration:")}</span>
                      <select
                        value={sallaDuration}
                        onChange={(e) => setSallaDuration(Number(e.target.value))}
                        className="ref-keys-duration-select"
                      >
                        <option value={1}>{t("يوم واحد", "1 Day")}</option>
                        <option value={3}>{t("3 أيام (افتراضي)", "3 Days (Default)")}</option>
                        <option value={7}>{t("7 أيام", "7 Days")}</option>
                        <option value={30}>{t("30 يوماً", "30 Days")}</option>
                        <option value={90}>{t("90 يوماً", "90 Days")}</option>
                        <option value={3650}>{t("مدى الحياة", "Lifetime")}</option>
                      </select>
                    </div>
                  </div>

                  <textarea
                    dir="ltr"
                    value={sallaKeysInput}
                    onChange={(e) => setSallaKeysInput(e.target.value)}
                    placeholder={t(
                      "...أدخل الأكواد هنا (كود واحد في كل سطر أو مفصولة بفواصل) ... مثال: KEY-ABC123-DEF456",
                      "Enter codes here (one per line or comma-separated) ... e.g. KEY-ABC123-DEF456"
                    )}
                    className="ref-keys-bulk-textarea"
                  />

                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px", flexWrap: "wrap", marginTop: "4px" }}>
                    <button
                      type="button"
                      className="ref-btn-add-keys-submit"
                      disabled={busy || detectedKeysCount === 0}
                      onClick={handleInsertSallaKeys}
                      style={{ margin: 0 }}
                    >
                      {busy ? <LoaderCircle className="spin" size={15} /> : <Check size={15} />}
                      <span>{t(`إضافة الأكواد للمخزون (${detectedKeysCount}) ✓`, `Add Codes to Inventory (${detectedKeysCount}) ✓`)}</span>
                    </button>

                    <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                      <span style={{ fontSize: "12px", color: "#94a3b8" }}>{t("أو تعبئة تلقائية:", "Or Auto-Fill:")}</span>
                      {[5, 10, 20, 50].map((qty) => (
                        <button
                          key={qty}
                          type="button"
                          className="ref-btn-quick-qty"
                          disabled={busy}
                          onClick={() => void handleQuickGenerateKeys(qty, sallaDuration)}
                          style={{
                            padding: "6px 12px",
                            background: "rgba(56, 189, 248, 0.12)",
                            border: "1px solid rgba(56, 189, 248, 0.3)",
                            borderRadius: "8px",
                            color: "#38bdf8",
                            fontSize: "12px",
                            fontWeight: 600,
                            cursor: "pointer",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px",
                          }}
                          title={t(`توليد ${qty} مفتاحاً وإضافتها فوراً للمخزون`, `Generate ${qty} keys`)}
                        >
                          <Plus size={12} />
                          <span>+{qty} {t("مفتاح", "Keys")}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* 2. Filter & Search Toolbar (Image 1) */}
                <div className="ref-keys-table-toolbar">
                  {/* Search Input */}
                  <div className="ref-keys-search-wrap">
                    <input
                      type="text"
                      value={productKeysSearch}
                      onChange={(e) => {
                        setProductKeysSearch(e.target.value);
                        setKeysPage(1);
                      }}
                      placeholder={t("🔍 بحث بكود المفتاح، رقم الطلب، أو الحالة...", "Search by key, order #, or status...")}
                    />
                  </div>

                  {/* Filter Chips */}
                  <div className="ref-keys-filter-chips">
                    {[
                      { key: "ALL", label: t("الكل", "All") },
                      { key: "AVAILABLE", label: t("متاح", "Available") },
                      { key: "PENDING", label: t("بانتظار البدء", "Pending") },
                      { key: "ACTIVE", label: t("نشط", "Active") },
                      { key: "EXPIRED", label: t("منتهي", "Expired") },
                      { key: "BLOCKED", label: t("معطل", "Blocked") },
                    ].map((f) => (
                      <button
                        type="button"
                        key={f.key}
                        className={`ref-keys-filter-chip ${productKeysFilter === f.key ? "active" : ""}`}
                        onClick={() => {
                          setProductKeysFilter(f.key as any);
                          setKeysPage(1);
                        }}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>

                  {/* Sort and Per-Page Controls */}
                  <div className="ref-keys-controls-right">
                    <select
                      value={keysSort}
                      onChange={(e) => setKeysSort(e.target.value as any)}
                      className="ref-keys-control-select"
                    >
                      <option value="newest">{t("الأحدث", "Newest")}</option>
                      <option value="oldest">{t("الأقدم", "Oldest")}</option>
                      <option value="code">{t("الكود", "Code")}</option>
                    </select>

                    <select
                      value={keysPerPage}
                      onChange={(e) => {
                        setKeysPerPage(Number(e.target.value));
                        setKeysPage(1);
                      }}
                      className="ref-keys-control-select"
                    >
                      <option value={10}>10</option>
                      <option value={20}>20</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                    </select>
                  </div>
                </div>

                {/* 3. Exact Keys Data Table Card (Image 1) */}
                <div className="ref-keys-table-card">
                  <div style={{ overflowX: "auto" }}>
                    <table className="ref-keys-table">
                      <thead>
                        <tr>
                          <th>{t("المفتاح", "Key")}</th>
                          <th>{t("الحالة", "Status")}</th>
                          <th>{t("تاريخ الإضافة", "Date Added")}</th>
                          <th>{t("تاريخ الاستخدام", "Date Used")}</th>
                          <th>{t("الطلب / العميل", "Order / Customer")}</th>
                          <th>{t("الإجراءات", "Actions")}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedProductKeys.length > 0 ? (
                          paginatedProductKeys.map((k, idx) => {
                            const isRevealed = revealedKeyIds[k.id] ?? true;
                            const isCopied = copiedKeyId === k.id;
                            const rawCode = k.raw_code || k.code || k.masked_code || "";
                            const displayCode = isRevealed
                              ? rawCode
                              : rawCode
                              ? `${rawCode.slice(0, 4)}-****-****`
                              : "KEY-****-****";

                            const s = String(k.status || "").toUpperCase();
                            const isAvailable = s === "AVAILABLE";
                            const isPending = s === "PENDING" || s === "WAITING";
                            const isActive = s === "ACTIVE" || s === "ISSUED" || s === "USED";
                            const isExpired = s === "EXPIRED";
                            const isBlocked = s === "BLOCKED" || s === "SUSPENDED" || s === "REVOKED" || s === "DISABLED";

                            const statusClass = isAvailable
                              ? "available"
                              : isActive
                              ? "active"
                              : isPending
                              ? "pending"
                              : isExpired
                              ? "expired"
                              : isBlocked
                              ? "blocked"
                              : "available";

                            const statusLabel = isAvailable
                              ? t("متاح", "Available")
                              : isActive
                              ? t("نشط", "Active")
                              : isPending
                              ? t("بانتظار البدء", "Pending")
                              : isExpired
                              ? t("منتهي", "Expired")
                              : isBlocked
                              ? t("معطل", "Blocked")
                              : t("متاح", "Available");

                            return (
                              <tr key={k.id || idx}>
                                {/* المفتاح with Eye (reveal/mask) and Copy buttons */}
                                <td>
                                  <div className="ref-key-code-cell">
                                    <code dir="ltr">{displayCode}</code>
                                    <button
                                      type="button"
                                      className="ref-key-action-icon-btn"
                                      onClick={() => toggleKeyReveal(k.id)}
                                      title={isRevealed ? t("إخفاء المفتاح", "Mask Key") : t("إظهار المفتاح كاملاً", "Reveal Key")}
                                    >
                                      {isRevealed ? <Eye size={13} /> : <EyeOff size={13} />}
                                    </button>
                                    <button
                                      type="button"
                                      className="ref-key-action-icon-btn"
                                      onClick={() => handleCopyKeyItem(rawCode || displayCode, k.id)}
                                      title={t("نسخ الكود للحافظة", "Copy Key")}
                                    >
                                      {isCopied ? <Check size={13} style={{ color: "#10B981" }} /> : <Copy size={13} />}
                                    </button>
                                  </div>
                                </td>

                                {/* الحالة Pill with Dot */}
                                <td>
                                  <span className={`ref-key-status-pill ${statusClass}`}>
                                    <span className="dot" />
                                    <span>{statusLabel}</span>
                                  </span>
                                </td>

                                {/* تاريخ الإضافة */}
                                <td>
                                  {k.created_at
                                    ? new Date(k.created_at).toLocaleDateString(ar ? "ar-SA" : "en-US", {
                                        year: "numeric",
                                        month: "2-digit",
                                        day: "2-digit",
                                      })
                                    : "-"}
                                </td>

                                {/* تاريخ الاستخدام */}
                                <td>
                                  {k.redeemed_at || k.activated_at || k.used_at
                                    ? new Date(k.redeemed_at || k.activated_at || k.used_at).toLocaleDateString(
                                        ar ? "ar-SA" : "en-US",
                                        {
                                          year: "numeric",
                                          month: "2-digit",
                                          day: "2-digit",
                                        }
                                      )
                                    : "-"}
                                </td>

                                {/* الطلب / العميل */}
                                <td>
                                  {k.order_number || k.order_id ? (
                                    <span style={{ color: "#38BDF8", fontWeight: 700 }}>
                                      #{String(k.order_number || k.order_id).replace(/^ord_/i, "").slice(0, 8)}
                                    </span>
                                  ) : k.customer_name || k.customer_email || k.issued_to ? (
                                    <span>{k.customer_name || k.customer_email || k.issued_to}</span>
                                  ) : (
                                    <span style={{ color: "#64748B" }}>-</span>
                                  )}
                                </td>

                                {/* الإجراءات: Trash & Lock Buttons */}
                                <td>
                                  <div className="ref-key-row-actions">
                                    <button
                                      type="button"
                                      className="ref-btn-row-trash"
                                      onClick={() => handleDeleteProductKey(k.id, displayCode)}
                                      title={t("حذف المفتاح نهائياً", "Delete Key")}
                                    >
                                      <Trash2 size={13} />
                                    </button>
                                    <button
                                      type="button"
                                      className="ref-btn-row-lock"
                                      onClick={() => handleToggleSuspendKey(k.id)}
                                      title={isBlocked ? t("تنشيط المفتاح", "Activate Key") : t("تعطيل المفتاح", "Suspend Key")}
                                    >
                                      <Lock size={13} />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })
                        ) : (
                          <tr>
                            <td colSpan={6} style={{ textAlign: "center", padding: "40px 18px", color: "#64748B" }}>
                              {loadingProductKeys ? (
                                <div style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
                                  <LoaderCircle className="spin" size={16} />
                                  <span>{t("جارٍ تحميل المفاتيح...", "Loading keys...")}</span>
                                </div>
                              ) : (
                                <span>{t("لا توجد أكواد مطابقة للمعايير المحددة", "No matching keys found")}</span>
                              )}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Table Footer with Total Count and Pagination Controls (Image 1) */}
                  <div className="ref-keys-table-footer">
                    <div>
                      {t(`إجمالي النتائج: ${filteredProductKeys.length}`, `Total results: ${filteredProductKeys.length}`)}
                    </div>

                    <div className="ref-keys-pagination-btns">
                      <button
                        type="button"
                        className="ref-keys-page-nav-btn"
                        disabled={keysPage <= 1}
                        onClick={() => setKeysPage((p) => Math.max(1, p - 1))}
                        title={t("الصفحة السابقة", "Previous page")}
                      >
                        ‹
                      </button>
                      <span>
                        {keysPage} / {totalKeysPages}
                      </span>
                      <button
                        type="button"
                        className="ref-keys-page-nav-btn"
                        disabled={keysPage >= totalKeysPages}
                        onClick={() => setKeysPage((p) => Math.min(totalKeysPages, p + 1))}
                        title={t("الصفحة التالية", "Next page")}
                      >
                        ›
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Modal Bottom Actions Bar Matching Image 1 Exactly */}
            <div className="ref-modal-bottom-actions-exact">
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <button
                  type="button"
                  className="ref-btn-modal-cancel-exact"
                  onClick={() => setShowProductModal(false)}
                >
                  {t("إلغاء", "Cancel")}
                </button>

                {editingProduct && (
                  <>
                    <button
                      type="button"
                      className="ref-btn-modal-cancel-exact"
                      style={{ color: "#F87171", borderColor: "rgba(239, 68, 68, 0.3)" }}
                      onClick={() => handleDeleteProduct(editingProduct)}
                      title={t("حذف المنتج", "Delete Product")}
                    >
                      <Trash2 size={14} style={{ display: "inline", verticalAlign: "middle", marginInlineEnd: 4 }} />
                      <span>{t("حذف المنتج", "Delete")}</span>
                    </button>
                    <button
                      type="button"
                      className="ref-btn-modal-cancel-exact"
                      onClick={() => void handleDuplicateProduct(editingProduct)}
                      title={t("استنساخ المنتج", "Duplicate Product")}
                    >
                      <CopyPlus size={14} style={{ display: "inline", verticalAlign: "middle", marginInlineEnd: 4 }} />
                      <span>{t("استنساخ", "Duplicate")}</span>
                    </button>
                  </>
                )}
              </div>

              <button
                type="button"
                className={`ref-btn-modal-save-exact ${productForm.name.trim() ? "ready" : ""}`}
                onClick={() => void handleSaveProduct()}
                disabled={busy || !productForm.name.trim()}
              >
                {busy ? <LoaderCircle className="spin" size={15} /> : <Save size={15} />}
                <span>{t("حفظ التغييرات (Ctrl+S) 💾", "Save Changes (Ctrl+S) 💾")}</span>
              </button>
            </div>
          </div>
        </ModalBackdrop>
      )}

      {/* STOCK FILLING MODAL (SINGLE KEY & BULK KEYS - LARGER & BETTER ORGANIZED) */}
      {showStockModal && (
        <ModalBackdrop className="modal-backdrop" onClick={() => setShowStockModal(false)}>
          <div className="modal-card ref-stock-modal-card" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="ref-stock-modal-header">
              <div className="ref-stock-header-title-wrap">
                <div className="ref-stock-icon-cube">
                  <KeyRound size={22} />
                </div>
                <div>
                  <h2 className="ref-stock-modal-title">{t("إدارة وتعبئة مخزون المفاتيح", "Stock Keys Management")}</h2>
                  <p className="ref-stock-modal-subdesc">
                    {t("تعبئة المخزون يدوياً: إضافة مفتاح واحد، أو لصق قائمة مفاتيح دفعة واحدة من الحافظة.", "Manual stock filling: Add a single key, or paste bulk keys from clipboard.")}
                  </p>
                </div>
              </div>

              <button className="ref-modal-close-icon" onClick={() => setShowStockModal(false)}>
                <X size={18} />
              </button>
            </div>

            {/* Target Product Selector Card */}
            <div className="ref-stock-target-product-card">
              <div className="ref-stock-target-info">
                {selectedStockProduct?.image_url ? (
                  <img src={selectedStockProduct.image_url} alt="" className="ref-stock-prod-thumb" />
                ) : (
                  <div className="ref-stock-prod-thumb-fallback"><Package size={20} /></div>
                )}
                <div className="ref-stock-prod-meta">
                  <div className="ref-stock-prod-name-row">
                    <strong>{selectedStockProduct?.name}</strong>
                    <span className="ref-stock-cat-pill">{selectedStockProduct?.category || "General"}</span>
                  </div>
                  <div className="ref-stock-live-badge">
                    <span className="hero-pulse-dot" />
                    <span>{t("المخزون المتوفر الآن:", "Current Available Stock:")} <strong>{selectedStockProduct?.available_keys ?? 0} {t("مفتاح", "Keys")}</strong></span>
                  </div>
                </div>
              </div>

              <div className="ref-stock-change-prod-select">
                <label>{t("تغيير المنتج المستهدف:", "Target Product:")}</label>
                <select
                  value={stockModalProductId}
                  onChange={(e) => setStockModalProductId(e.target.value)}
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({t("المخزون:", "Stock:")} {p.available_keys ?? 0})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* 3 Clear Segmented Mode Tabs */}
            <div className="ref-stock-mode-tabs-bar">
              <button
                type="button"
                className={`ref-stock-tab-btn ${stockMode === "bulk" ? "active" : ""}`}
                onClick={() => setStockMode("bulk")}
              >
                <Package size={16} />
                <span>{t("إضافة مفاتيح دفعة واحدة (لصق مجمّع)", "Bulk Keys")}</span>
              </button>

              <button
                type="button"
                className={`ref-stock-tab-btn ${stockMode === "generate" ? "active" : ""}`}
                onClick={() => setStockMode("generate")}
              >
                <Sparkles size={16} />
                <span>{t("توليد مفاتيح تلقائياً (تعبئة سريعة)", "Auto-Generate")}</span>
              </button>

              <button
                type="button"
                className={`ref-stock-tab-btn ${stockMode === "single" ? "active" : ""}`}
                onClick={() => setStockMode("single")}
              >
                <KeyRound size={16} />
                <span>{t("إضافة مفتاح مفرد", "Single Key")}</span>
              </button>
            </div>

            {/* TAB 1: SINGLE KEY (إضافة مفتاح واحد) */}
            {stockMode === "single" && (
              <form onSubmit={handleAddSingleKey} className="ref-stock-tab-body">
                <div className="ref-stock-input-group">
                  <div className="ref-label-row">
                    <label>{t("كود المفتاح المراد إضافته للمخزون", "Key Code to Add")} *</label>
                    <div className="ref-inline-tools-cluster">
                      <button
                        type="button"
                        className="ref-btn-paste-clipboard"
                        onClick={() => handlePasteFromClipboard((txt) => setSingleKeyText(txt), t("كود المفتاح", "Key Code"))}
                        title={t("لصق الكود من الحافظة", "Paste from clipboard")}
                      >
                        <ClipboardPaste size={12} />
                        <span>{t("لصق من الحافظة", "Paste Clipboard")}</span>
                      </button>
                      <button
                        type="button"
                        className="ref-btn-dice-random"
                        onClick={() => setSingleKeyText(generateRandomKeyCode())}
                        title={t("توليد كود عشوائي جديد", "Generate new random code")}
                      >
                        <span>🎲</span>
                        <span>{t("كود عشوائي جديد", "New Random Code")}</span>
                      </button>
                    </div>
                  </div>
                  <div className="ref-single-key-input-wrap">
                    <input
                      type="text"
                      dir="ltr"
                      value={singleKeyText}
                      onChange={(e) => setSingleKeyText(e.target.value)}
                      placeholder="KEY-gZcMty-H9whoQ"
                      className="ref-key-code-input"
                      required
                    />
                  </div>
                </div>

                <div className="ref-stock-duration-group">
                  <label>{t("مدة صلاحية هذا المفتاح", "Key Duration")}</label>
                  <div className="ref-duration-pills-row">
                    {[
                      { days: 1, label: t("يوم واحد", "1 Day") },
                      { days: 3, label: t("3 أيام (افتراضي)", "3 Days (Default)") },
                      { days: 7, label: t("أسبوع (7 أيام)", "7 Days") },
                      { days: 30, label: t("شهر (30 يوماً)", "30 Days") },
                      { days: 90, label: t("3 أشهر (90 يوماً)", "90 Days") },
                      { days: 3650, label: t("مدى الحياة", "Lifetime") },
                    ].map((opt) => (
                      <button
                        type="button"
                        key={opt.days}
                        className={`ref-duration-pill ${singleKeyDuration === opt.days ? "active" : ""}`}
                        onClick={() => setSingleKeyDuration(opt.days)}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="ref-key-preview-card">
                  <div className="ref-preview-row">
                    <small>{t("المفتاح كما سيظهر كاملاً في المخزون:", "Key as it will appear in stock:")}</small>
                    <code dir="ltr" style={{ color: "#38BDF8", fontWeight: 700 }}>{singleKeyText.trim() || "KEY-XXXXXX-XXXXXX"}</code>
                  </div>
                </div>

                <div className="ref-stock-footer-actions">
                  <button type="button" className="ref-btn-cancel-modal" onClick={() => setShowStockModal(false)}>
                    {t("إلغاء", "Cancel")}
                  </button>
                  <button type="submit" className="ref-btn-primary-stock" disabled={busy || !singleKeyText.trim()}>
                    {busy ? <LoaderCircle className="spin" size={16} /> : <Plus size={16} />}
                    <span>{t("إضافة هذا المفتاح للمخزون الآن", "Add Key to Stock Now")}</span>
                  </button>
                </div>
              </form>
            )}

            {/* TAB 2: BULK KEYS (إضافة مفاتيح دفعة واحدة) */}
            {stockMode === "bulk" && (
              <form onSubmit={handleAddBulkKeys} className="ref-stock-tab-body">
                <div className="ref-stock-input-group">
                  <div className="ref-label-row">
                    <label>{t("الصق قائمة المفاتيح (مفتاح في كل سطر)", "Paste Keys List (One per line)")} *</label>
                    <div className="ref-bulk-header-actions">
                      <button
                        type="button"
                        className="ref-btn-paste-clipboard"
                        onClick={() => handlePasteFromClipboard((txt) => {
                          setBulkKeysText((prev) => (prev ? `${prev}\n${txt}` : txt));
                        }, t("قائمة المفاتيح", "Keys List"))}
                        title={t("لصق قائمة المفاتيح من الحافظة", "Paste keys list from clipboard")}
                      >
                        <ClipboardPaste size={13} />
                        <span>{t("لصق من الحافظة", "Paste Clipboard")}</span>
                      </button>
                      {bulkKeysText && (
                        <button
                          type="button"
                          className="ref-btn-clear-input"
                          onClick={() => setBulkKeysText("")}
                          title={t("مسح الحقل", "Clear")}
                        >
                          <Trash2 size={12} />
                          <span>{t("مسح", "Clear")}</span>
                        </button>
                      )}
                      <span className={`ref-detected-counter ${bulkKeysDetectedCount > 0 ? "active" : ""}`}>
                        {t(`تم اكتشاف ${bulkKeysDetectedCount} مفاتيح جاهزة للإضافة`, `${bulkKeysDetectedCount} keys detected`)}
                      </span>
                    </div>
                  </div>
                  <textarea
                    rows={7}
                    dir="ltr"
                    value={bulkKeysText}
                    onChange={(e) => setBulkKeysText(e.target.value)}
                    placeholder={t("قم بنسخ الأكواد ولصقها هنا، علماً أن كل سطر يجب أن يحتوي على كود واحد فقط", "Paste keys here, one code per line")}
                    className="ref-bulk-keys-textarea"
                    required
                  />
                </div>

                <div className="ref-stock-duration-group">
                  <label>{t("مدة صلاحية جميع هذه المفاتيح", "Duration for all pasted keys")}</label>
                  <div className="ref-duration-pills-row">
                    {[
                      { days: 1, label: t("يوم واحد", "1 Day") },
                      { days: 3, label: t("3 أيام (افتراضي)", "3 Days (Default)") },
                      { days: 7, label: t("أسبوع (7 أيام)", "7 Days") },
                      { days: 30, label: t("شهر (30 يوماً)", "30 Days") },
                      { days: 90, label: t("3 أشهر (90 يوماً)", "90 Days") },
                      { days: 3650, label: t("مدى الحياة", "Lifetime") },
                    ].map((opt) => (
                      <button
                        type="button"
                        key={opt.days}
                        className={`ref-duration-pill ${bulkDuration === opt.days ? "active" : ""}`}
                        onClick={() => setBulkDuration(opt.days)}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="ref-stock-footer-actions">
                  <button type="button" className="ref-btn-cancel-modal" onClick={() => setShowStockModal(false)}>
                    {t("إلغاء", "Cancel")}
                  </button>
                  <button type="submit" className="ref-btn-primary-stock ref-btn-cyan-insert" disabled={busy || bulkKeysDetectedCount === 0}>
                    {busy ? <LoaderCircle className="spin" size={16} /> : <Package size={16} />}
                    <span>{t(`إدراج (${bulkKeysDetectedCount > 0 ? bulkKeysDetectedCount : ""}) مفاتيح للمخزون`, "Insert Keys")}</span>
                  </button>
                </div>
              </form>
            )}

            {/* TAB 3: GENERATE KEYS (توليد مفاتيح تلقائياً) */}
            {stockMode === "generate" && (
              <div className="ref-stock-tab-body">
                <div className="ref-stock-duration-group">
                  <label>{t("مدة صلاحية المفاتيح المنشأة", "Generated Keys Duration")}</label>
                  <div className="ref-duration-pills-row">
                    {[
                      { days: 1, label: t("يوم واحد", "1 Day") },
                      { days: 3, label: t("3 أيام (افتراضي)", "3 Days (Default)") },
                      { days: 7, label: t("أسبوع (7 أيام)", "7 Days") },
                      { days: 30, label: t("شهر (30 يوماً)", "30 Days") },
                      { days: 90, label: t("3 أشهر (90 يوماً)", "90 Days") },
                      { days: 3650, label: t("مدى الحياة", "Lifetime") },
                    ].map((opt) => (
                      <button
                        type="button"
                        key={opt.days}
                        className={`ref-duration-pill ${bulkDuration === opt.days ? "active" : ""}`}
                        onClick={() => setBulkDuration(opt.days)}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ marginTop: "16px" }}>
                  <label style={{ display: "block", marginBottom: "10px", fontWeight: 600, color: "#f8fafc" }}>
                    {t("اختر عدد المفاتيح لتوليدها فوراً في المخزون:", "Select quantity to generate instantly:")}
                  </label>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "10px" }}>
                    {[5, 10, 25, 50].map((qty) => (
                      <button
                        key={qty}
                        type="button"
                        disabled={busy}
                        onClick={() => void handleQuickStockGenerate(qty)}
                        style={{
                          padding: "14px 10px",
                          background: "rgba(56, 189, 248, 0.12)",
                          border: "1px solid rgba(56, 189, 248, 0.35)",
                          borderRadius: "10px",
                          color: "#38bdf8",
                          fontWeight: 700,
                          cursor: "pointer",
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          gap: "6px",
                          fontSize: "14px",
                        }}
                      >
                        {busy ? <LoaderCircle className="spin" size={18} /> : <Sparkles size={18} />}
                        <span>+{qty} {t("مفتاح", "Keys")}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="ref-stock-footer-actions" style={{ marginTop: "24px" }}>
                  <button type="button" className="ref-btn-cancel-modal" onClick={() => setShowStockModal(false)}>
                    {t("إلغاء", "Cancel")}
                  </button>
                </div>
              </div>
            )}


          </div>
        </ModalBackdrop>
      )}

      {/* COMPENSATION MODAL */}
      {showCompensationModal && (
        <ModalBackdrop className="modal-backdrop" onClick={() => setShowCompensationModal(false)}>
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
        </ModalBackdrop>
      )}

      {/* CUSTOMER DRAWER */}
      {showCustomerDrawer && customerDetails && (
        <ModalBackdrop className="drawer-backdrop" onClick={() => setShowCustomerDrawer(false)}>
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
                          <code dir="ltr">
                            {lic.raw_code || lic.masked_code || "—"}
                          </code>
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
        </ModalBackdrop>
      )}

      {/* SEND MESSAGE MODAL */}
      {messageModalState.isOpen && (
        <ModalBackdrop className="modal-backdrop" onClick={() => setMessageModalState((prev) => ({ ...prev, isOpen: false }))}>
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
        </ModalBackdrop>
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
