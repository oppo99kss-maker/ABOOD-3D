import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { authOptions, isAuthConfigured } from "@/lib/auth";
import {
  adminGuides,
  adminProducts,
  archiveProduct,
  createCompensation,
  createOrder,
  createProduct,
  deleteGuide,
  deleteProduct,
  extendLicense,
  generateKeys,
  getAuditLogs,
  getCustomerDetails,
  getCustomers,
  getCompensations,
  getDashboardStats,
  getGuides,
  getKeyActivationLogs,
  getLoginLogs,
  getOrders,
  getProductInventory,
  getSystemSettings,
  grantDirectLicense,
  importCustomKeys,
  issueKeyToOrder,
  myProducts,
  recordCustomerLogin,
  redeemKey,
  saveGuide,
  sendCustomerMessage,
  suspendLicense,
  toggleProductVisibility,
  updateCustomerStatus,
  updateProduct,
  updateSystemSettings,
} from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isAdmin(email: string) {
  const admins = [process.env.ADMIN_EMAIL, process.env.ADMIN_EMAILS]
    .filter(Boolean)
    .join(",")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
  return admins.includes(email.toLowerCase());
}

async function currentUser() {
  if (!isAuthConfigured()) return null;
  const session = await getServerSession(authOptions);
  return session?.user?.email?.toLowerCase() || null;
}

const noStore = { "Cache-Control": "private, no-store, max-age=0, must-revalidate" };
function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: noStore });
}

export async function GET(request: NextRequest) {
  const email = await currentUser();
  if (!email) return json({ error: "UNAUTHORIZED" }, 401);

  const admin = isAdmin(email);
  const searchParams = request.nextUrl.searchParams;
  const view = searchParams.get("view");

  try {
    if (view === "admin-inventory" && admin) {
      const productId = searchParams.get("productId");
      if (!productId) return json({ error: "MISSING_PRODUCT_ID" }, 400);
      const keys = await getProductInventory(productId);
      return json({ keys });
    }

    if (view === "admin-customers" && admin) {
      const search = searchParams.get("search") || "";
      const status = searchParams.get("status") || "";
      const page = parseInt(searchParams.get("page") || "1", 10);
      const limit = parseInt(searchParams.get("limit") || "25", 10);
      const offset = Math.max(0, (page - 1) * limit);
      const result = await getCustomers({ search, status, limit, offset });
      return json(result);
    }

    if (view === "admin-customer-details" && admin) {
      const target = searchParams.get("email") || searchParams.get("id");
      if (!target) return json({ error: "MISSING_IDENTIFIER" }, 400);
      const details = await getCustomerDetails(target);
      return json(details);
    }

    if (view === "admin-orders" && admin) {
      const orders = await getOrders();
      return json({ orders });
    }

    if (view === "admin-logs" && admin) {
      const category = searchParams.get("category") || undefined;
      const logs = await getAuditLogs(category);
      return json({ logs });
    }

    if (view === "admin-compensations" && admin) {
      const compensations = await getCompensations();
      return json({ compensations });
    }

    if (view === "admin-activations" && admin) {
      const logs = await getKeyActivationLogs();
      return json({ logs });
    }

    if (view === "admin-logins" && admin) {
      const logs = await getLoginLogs();
      return json({ logs });
    }

    // Default portal load
    const session = await getServerSession(authOptions);
    if (email) {
      await recordCustomerLogin(email, session?.user?.name, session?.user?.image);
    }

    const [products, guides, settings, inventory, dashboardStats, orders, allGuides] = await Promise.all([
      myProducts(email),
      getGuides(),
      getSystemSettings(),
      admin ? adminProducts() : Promise.resolve([]),
      admin ? getDashboardStats() : Promise.resolve(null),
      admin ? getOrders() : Promise.resolve([]),
      admin ? adminGuides() : Promise.resolve([]),
    ]);

    return json({
      products,
      guides,
      settings,
      inventory,
      dashboardStats,
      orders,
      allGuides,
      isAdmin: admin,
      currentUser: email,
    });
  } catch (error) {
    console.error("Portal GET failed:", error);
    return json({ error: "SERVICE_UNAVAILABLE" }, 503);
  }
}

function optionalHttps(value: unknown) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return /^https?:\/\//i.test(trimmed) && URL.canParse(trimmed) ? trimmed : undefined;
}

export async function POST(request: NextRequest) {
  const email = await currentUser();
  if (!email) return json({ error: "UNAUTHORIZED" }, 401);

  const origin = request.headers.get("origin");
  if (origin && origin !== request.nextUrl.origin) return json({ error: "FORBIDDEN" }, 403);

  if (!request.headers.get("content-type")?.startsWith("application/json"))
    return json({ error: "INVALID_REQUEST" }, 415);

  let data: Record<string, any>;
  try {
    data = await request.json();
  } catch {
    return json({ error: "INVALID_REQUEST" }, 400);
  }

  const clientIp = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "127.0.0.1";
  const admin = isAdmin(email);

  try {
    // 1. Customer: Redeem key
    if (data.action === "redeem") {
      const code = typeof data.code === "string" ? data.code.trim() : "";
      if (!code || code.length < 10) return json({ error: "INVALID_KEY", message: "صيغة المفتاح غير صحيحة" }, 400);

      const result = await redeemKey(email, code, clientIp);
      return json(result, result.success ? 200 : 400);
    }

    // All actions below require ADMIN permissions
    if (!admin) return json({ error: "FORBIDDEN", message: "لا تملك صلاحية تنفيذ هذا الإجراء الإداري" }, 403);

    // 2. Admin: Create product
    if (data.action === "createProduct") {
      const name = typeof data.name === "string" ? data.name.trim() : "";
      const description = typeof data.description === "string" ? data.description.trim() : "";
      const accessUrl = optionalHttps(data.accessUrl);
      const imageUrl = optionalHttps(data.imageUrl);

      if (!name || name.length > 120) return json({ error: "INVALID_NAME", message: "اسم المنتج مطلوب (بين 1 و120 حرفاً)" }, 400);

      const product = await createProduct({
        name,
        nameEn: typeof data.nameEn === "string" ? data.nameEn.trim() : undefined,
        description,
        category: typeof data.category === "string" ? data.category.trim() : "General",
        accessUrl: accessUrl || null,
        imageUrl: imageUrl || null,
        instructions: typeof data.instructions === "string" ? data.instructions.trim() : null,
        defaultDurationDays: Number(data.defaultDurationDays) || 30,
        isVisible: data.isVisible !== false,
        isActive: data.isActive !== false,
        files: Array.isArray(data.files) ? data.files : [],
        actorEmail: email,
      });

      return json({ ok: true, product });
    }

    // 3. Admin: Update product
    if (data.action === "updateProduct") {
      const id = typeof data.id === "string" ? data.id : "";
      const name = typeof data.name === "string" ? data.name.trim() : "";
      if (!id || !name) return json({ error: "INVALID_PARAMS" }, 400);

      const accessUrl = optionalHttps(data.accessUrl);
      const imageUrl = optionalHttps(data.imageUrl);

      const product = await updateProduct({
        id,
        name,
        nameEn: typeof data.nameEn === "string" ? data.nameEn.trim() : undefined,
        description: typeof data.description === "string" ? data.description.trim() : "",
        category: typeof data.category === "string" ? data.category.trim() : "General",
        accessUrl: accessUrl || null,
        imageUrl: imageUrl || null,
        instructions: typeof data.instructions === "string" ? data.instructions.trim() : null,
        defaultDurationDays: Number(data.defaultDurationDays) || 30,
        isVisible: data.isVisible !== false,
        isActive: data.isActive !== false,
        isArchived: Boolean(data.isArchived),
        files: Array.isArray(data.files) ? data.files : [],
        actorEmail: email,
      });

      return json({ ok: true, product });
    }

    // 4. Admin: Archive product
    if (data.action === "archiveProduct") {
      const id = typeof data.id === "string" ? data.id : "";
      const archive = Boolean(data.archive);
      const product = await archiveProduct(id, email, archive);
      return json({ ok: true, product });
    }

    // 5. Admin: Generate keys
    if (data.action === "generateKeys") {
      const productId = typeof data.productId === "string" ? data.productId : "";
      const count = Number(data.count);
      const durationDays = Number(data.durationDays || 30);

      if (!productId || count < 1 || count > 500) {
        return json({ error: "INVALID_COUNT", message: "العدد يجب أن يكون بين 1 و500" }, 400);
      }

      const keys = await generateKeys(productId, count, durationDays, email);
      return json({ ok: true, keys, count: keys.length });
    }

    // 6. Admin: Import custom keys
    if (data.action === "importKeys") {
      const productId = typeof data.productId === "string" ? data.productId : "";
      const rawKeys = Array.isArray(data.rawKeys) ? data.rawKeys : [];
      const durationDays = Number(data.durationDays || 30);

      if (!productId || !rawKeys.length) {
        return json({ error: "EMPTY_KEYS", message: "يرجى تزويد قائمة مفاتيح للاستيراد" }, 400);
      }

      const result = await importCustomKeys(productId, rawKeys, durationDays, email);
      return json({ ok: true, ...result });
    }

    // 7. Admin: Grant direct license
    if (data.action === "grantDirectLicense") {
      const customerEmail = typeof data.customerEmail === "string" ? data.customerEmail.trim() : "";
      const productId = typeof data.productId === "string" ? data.productId : "";
      const durationDays = Number(data.durationDays || 30);
      const reason = typeof data.reason === "string" ? data.reason.trim() : "Direct administrative grant";

      if (!customerEmail || !productId) return json({ error: "INVALID_GRANT_INPUT" }, 400);

      const result = await grantDirectLicense({
        customerEmail,
        productId,
        durationDays,
        reason,
        actorEmail: email,
      });

      return json(result);
    }

    // 8. Admin: Extend license
    if (data.action === "extendLicense") {
      const licenseId = typeof data.licenseId === "string" ? data.licenseId : "";
      const additionalDays = Number(data.additionalDays || 30);
      if (!licenseId || additionalDays < 1) return json({ error: "INVALID_EXTEND_DAYS" }, 400);

      const result = await extendLicense(licenseId, additionalDays, email);
      return json({ ok: true, license: result });
    }

    // 9. Admin: Suspend license
    if (data.action === "suspendLicense") {
      const licenseId = typeof data.licenseId === "string" ? data.licenseId : "";
      if (!licenseId) return json({ error: "INVALID_LICENSE_ID" }, 400);

      const result = await suspendLicense(licenseId, email);
      return json({ ok: true, license: result });
    }

    // 10. Admin: Create order
    if (data.action === "createOrder") {
      const customerEmail = typeof data.customerEmail === "string" ? data.customerEmail.trim() : "";
      const productId = typeof data.productId === "string" ? data.productId : "";
      const quantity = Number(data.quantity || 1);
      const totalAmount = Number(data.totalAmount || 0);

      if (!customerEmail || !productId) return json({ error: "INVALID_ORDER_INPUT" }, 400);

      const order = await createOrder({
        customerEmail,
        customerName: data.customerName,
        productId,
        quantity,
        totalAmount,
        paymentMethod: data.paymentMethod,
        notes: data.notes,
        actorEmail: email,
      });

      return json({ ok: true, order });
    }

    // 11. Admin: Issue key to order
    if (data.action === "issueKeyToOrder") {
      const orderId = typeof data.orderId === "string" ? data.orderId : "";
      if (!orderId) return json({ error: "MISSING_ORDER_ID" }, 400);

      const result = await issueKeyToOrder(orderId, email);
      return json(result);
    }

    // 12. Admin: Create compensation
    if (data.action === "createCompensation") {
      const customerEmail = typeof data.customerEmail === "string" ? data.customerEmail.trim() : "";
      const originalProductId = typeof data.originalProductId === "string" ? data.originalProductId : "";
      const compensationType = data.compensationType || "REPLACEMENT_KEY";
      const details = typeof data.details === "string" ? data.details.trim() : "";
      const reason = typeof data.reason === "string" ? data.reason.trim() : "";

      if (!customerEmail || !originalProductId || !reason) {
        return json({ error: "INVALID_COMPENSATION_INPUT", message: "البريد والمنتج والسبب مطلوبة" }, 400);
      }

      const comp = await createCompensation({
        customerEmail,
        originalProductId,
        compensationType,
        details,
        reason,
        actorEmail: email,
      });

      return json({ ok: true, compensation: comp });
    }

    // 13. Admin: Save guide
    if (data.action === "saveGuide") {
      const title = typeof data.title === "string" ? data.title.trim() : "";
      const content = typeof data.content === "string" ? data.content.trim() : "";
      if (!title || !content) return json({ error: "INVALID_GUIDE", message: "العنوان والمحتوى مطلوبان" }, 400);

      const guide = await saveGuide({
        id: data.id,
        title,
        titleEn: data.titleEn,
        category: data.category || "General",
        content,
        contentEn: data.contentEn,
        productId: data.productId,
        sortOrder: Number(data.sortOrder || 0),
      });

      return json({ ok: true, guide });
    }

    // 14. Admin: Delete guide
    if (data.action === "deleteGuide") {
      const id = typeof data.id === "string" ? data.id : "";
      if (!id) return json({ error: "MISSING_ID" }, 400);
      await deleteGuide(id);
      return json({ ok: true });
    }

    // 15. Admin: Update system settings
    if (data.action === "updateSettings") {
      const updated = await updateSystemSettings(data.settings || {}, email);
      return json({ ok: true, settings: updated });
    }

    // 16. Admin: Update Customer Status
    if (data.action === "updateCustomerStatus") {
      const customerEmail = typeof data.email === "string" ? data.email.trim() : "";
      const status = data.status === "SUSPENDED" ? "SUSPENDED" : "ACTIVE";
      const notes = typeof data.notes === "string" ? data.notes.trim() : "";
      if (!customerEmail) return json({ error: "MISSING_EMAIL" }, 400);

      const res = await updateCustomerStatus(customerEmail, status, notes, email);
      return json(res);
    }

    // 17. Admin: Delete Product
    if (data.action === "deleteProduct") {
      const id = typeof data.id === "string" ? data.id : "";
      if (!id) return json({ error: "MISSING_ID" }, 400);
      await deleteProduct(id, email);
      return json({ ok: true });
    }

    // 18. Admin: Toggle Product Visibility
    if (data.action === "toggleProductVisibility") {
      const id = typeof data.id === "string" ? data.id : "";
      const isVisible = Boolean(data.isVisible);
      if (!id) return json({ error: "MISSING_ID" }, 400);
      const product = await toggleProductVisibility(id, isVisible, email);
      return json({ ok: true, product });
    }

    // 19. Admin: Send Customer Message
    if (data.action === "sendCustomerMessage") {
      const customerEmail = typeof data.customerEmail === "string" ? data.customerEmail.trim() : "";
      const subject = typeof data.subject === "string" ? data.subject.trim() : "";
      const message = typeof data.message === "string" ? data.message.trim() : "";
      if (!customerEmail || !message) return json({ error: "INVALID_MESSAGE", message: "البريد ونص الرسالة مطلوبان" }, 400);

      const res = await sendCustomerMessage(customerEmail, subject || "رسالة من إدارة SpooFX", message, email);
      return json(res);
    }

    return json({ error: "UNKNOWN_ACTION" }, 400);
  } catch (error: any) {
    console.error("Portal POST failed:", error);
    return json({ error: error.message || "INTERNAL_ERROR" }, 500);
  }
}
