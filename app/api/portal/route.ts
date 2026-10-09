import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { authOptions, isAuthConfigured } from "@/lib/auth";
import {
  adminProducts,
  createProduct,
  generateKeys,
  myProducts,
  redeemKey,
  updateProduct,
} from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isAdmin(email: string) {
  return Boolean(process.env.ADMIN_EMAIL) &&
    email.toLowerCase() === process.env.ADMIN_EMAIL!.trim().toLowerCase();
}

async function currentUser() {
  if (!isAuthConfigured()) return null;
  const session = await getServerSession(authOptions);
  return session?.user?.email?.toLowerCase() || null;
}

const noStore = { "Cache-Control": "private, no-store" };
function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: noStore });
}

export async function GET() {
  const email = await currentUser();
  if (!email) return json({ error: "UNAUTHORIZED" }, 401);
  try {
    const admin = isAdmin(email);
    const [products, inventory] = await Promise.all([
      myProducts(email),
      admin ? adminProducts() : Promise.resolve([]),
    ]);
    return json({ products, inventory, isAdmin: admin });
  } catch (error) {
    console.error("Portal read failed", error);
    return json({ error: "SERVICE_UNAVAILABLE" }, 503);
  }
}

export async function POST(request: NextRequest) {
  const email = await currentUser();
  if (!email) return json({ error: "UNAUTHORIZED" }, 401);
  const origin = request.headers.get("origin");
  if (origin && origin !== request.nextUrl.origin) return json({ error: "FORBIDDEN" }, 403);
  if (!request.headers.get("content-type")?.startsWith("application/json"))
    return json({ error: "INVALID_REQUEST" }, 415);
  let data: Record<string, unknown>;
  try {
    data = await request.json();
  } catch {
    return json({ error: "INVALID_REQUEST" }, 400);
  }
  try {
    if (data.action === "redeem") {
      const code = typeof data.code === "string" ? data.code.trim() : "";
      if (!/^SPFX(?:-[A-F0-9]{6}){5}$/i.test(code))
        return json({ error: "INVALID_KEY" }, 400);
      const redeemed = await redeemKey(email, code);
      return redeemed
        ? json({ ok: true })
        : json({ error: "KEY_UNAVAILABLE" }, 404);
    }
    if (!isAdmin(email)) return json({ error: "FORBIDDEN" }, 403);
    if (data.action === "createProduct" || data.action === "updateProduct") {
      const name = typeof data.name === "string" ? data.name.trim() : "";
      const description = typeof data.description === "string" ? data.description.trim() : "";
      const accessUrl = typeof data.accessUrl === "string" ? data.accessUrl.trim() : "";
      if (!name || name.length > 120 || description.length > 2000 || accessUrl.length > 2000)
        return json({ error: "INVALID_PRODUCT" }, 400);
      if (accessUrl && (!/^https:\/\//i.test(accessUrl) || !URL.canParse(accessUrl)))
        return json({ error: "INVALID_URL" }, 400);
      const input = { name, description, accessUrl: accessUrl || null };
      const product = data.action === "createProduct"
        ? await createProduct(input)
        : typeof data.id === "string" && /^[0-9a-f-]{36}$/i.test(data.id)
          ? await updateProduct({ ...input, id: data.id })
          : undefined;
      return product ? json({ product }) : json({ error: "PRODUCT_NOT_FOUND" }, 404);
    }
    if (data.action === "generateKeys") {
      const productId = typeof data.productId === "string" ? data.productId : "";
      const count = Number(data.count);
      if (!/^[0-9a-f-]{36}$/i.test(productId) || !Number.isInteger(count) || count < 1 || count > 20)
        return json({ error: "INVALID_REQUEST" }, 400);
      const keys = await generateKeys(productId, count);
      return json({ keys });
    }
    return json({ error: "INVALID_REQUEST" }, 400);
  } catch (error) {
    console.error("Portal action failed", error);
    return json({ error: "SERVICE_UNAVAILABLE" }, 503);
  }
}
