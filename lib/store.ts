import { createHmac, randomBytes, randomUUID } from "node:crypto";
import { Pool, PoolClient } from "pg";

export type ProductFile = {
  id: string;
  name: string;
  url: string;
  size?: string;
  uploaded_at: string;
};

export type Product = {
  id: string;
  name: string;
  name_en?: string | null;
  description: string;
  category?: string;
  access_url: string | null;
  image_url: string | null;
  instructions?: string | null;
  default_duration_days: number;
  is_visible: boolean;
  is_active: boolean;
  is_archived: boolean;
  files?: ProductFile[];
  created_at: string;
  updated_at?: string;
  available_keys?: number;
  redeemed_keys?: number;
  redeemed_at?: string;
  expires_at?: string | null;
  license_status?: "ACTIVE" | "EXPIRED" | "SUSPENDED" | "REVOKED";
  duration_days?: number;
};

export type LicenseKey = {
  id: string;
  product_id: string;
  product_name?: string;
  code_hash: string;
  code_suffix: string;
  masked_code: string;
  status: "AVAILABLE" | "RESERVED" | "ISSUED" | "REDEEMED" | "BLOCKED" | "EXPIRED" | "REVOKED";
  duration_days: number;
  batch_id?: string | null;
  order_id?: string | null;
  issued_to?: string | null;
  redeemed_by?: string | null;
  redeemed_at?: string | null;
  expires_at?: string | null;
  created_by?: string | null;
  created_at: string;
};

export type Customer = {
  id: string;
  email: string;
  name: string;
  image?: string | null;
  status: "ACTIVE" | "SUSPENDED";
  created_at: string;
  last_login_at: string;
  notes?: string;
  products_count: number;
  active_licenses: number;
  orders_count: number;
};

export type Order = {
  id: string;
  order_number: string;
  customer_email: string;
  customer_name?: string | null;
  product_id: string;
  product_name?: string;
  quantity: number;
  status: "PENDING_PAYMENT" | "PAID" | "PROCESSING" | "FULFILLED" | "FAILED" | "CANCELLED" | "REFUNDED";
  payment_method: string;
  total_amount: number;
  assigned_keys: string[];
  notes?: string | null;
  created_at: string;
  fulfilled_at?: string | null;
};

export type Compensation = {
  id: string;
  reference_number: string;
  customer_email: string;
  original_product_id: string;
  original_product_name?: string;
  compensation_type: "REPLACEMENT_KEY" | "EXTEND_LICENSE" | "DIRECT_GRANT";
  details: string;
  reason: string;
  issued_by: string;
  created_at: string;
};

export type AuditLog = {
  id: string;
  category: "ADMIN" | "REDEMPTION" | "INVENTORY" | "CUSTOMER" | "ORDER" | "SECURITY";
  action: string;
  actor_email: string;
  actor_role: string;
  target_type?: string | null;
  target_id?: string | null;
  details: Record<string, unknown>;
  ip_address?: string | null;
  created_at: string;
};

export type Guide = {
  id: string;
  title: string;
  title_en?: string | null;
  category: string;
  content: string;
  content_en?: string | null;
  product_id?: string | null;
  product_name?: string;
  is_published: boolean;
  sort_order: number;
  created_at: string;
};

export type StaffMember = {
  id: string;
  email: string;
  name: string;
  role: "OWNER" | "ADMIN" | "MANAGER" | "SUPPORT" | "VIEWER";
  permissions: string[];
  is_active: boolean;
  assigned_by: string;
  created_at: string;
};

export type SystemSettings = {
  site_name: string;
  description: string;
  maintenance_mode: boolean;
  maintenance_message: string;
  allow_new_activations: boolean;
  low_stock_threshold: number;
};

const globalStore = globalThis as typeof globalThis & {
  spooPool?: Pool;
  spooSchema?: Promise<void>;
};

export function pool() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is missing");
  return (globalStore.spooPool ??= new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 10,
    connectionTimeoutMillis: 5000,
    idleTimeoutMillis: 30000,
  }));
}

export async function ready() {
  globalStore.spooSchema ??= (async () => {
    const p = pool();

    // 1. Products table
    await p.query(`
      CREATE TABLE IF NOT EXISTS products (
        id uuid PRIMARY KEY,
        name text NOT NULL CHECK (length(name) BETWEEN 1 AND 120),
        name_en text,
        description text NOT NULL DEFAULT '',
        category text NOT NULL DEFAULT 'General',
        access_url text,
        image_url text,
        instructions text,
        default_duration_days integer NOT NULL DEFAULT 30,
        is_visible boolean NOT NULL DEFAULT true,
        is_active boolean NOT NULL DEFAULT true,
        is_archived boolean NOT NULL DEFAULT false,
        files jsonb NOT NULL DEFAULT '[]'::jsonb,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );
      ALTER TABLE products ADD COLUMN IF NOT EXISTS name_en text;
      ALTER TABLE products ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'General';
      ALTER TABLE products ADD COLUMN IF NOT EXISTS access_url text;
      ALTER TABLE products ADD COLUMN IF NOT EXISTS image_url text;
      ALTER TABLE products ADD COLUMN IF NOT EXISTS instructions text;
      ALTER TABLE products ADD COLUMN IF NOT EXISTS default_duration_days integer NOT NULL DEFAULT 30;
      ALTER TABLE products ADD COLUMN IF NOT EXISTS is_visible boolean NOT NULL DEFAULT true;
      ALTER TABLE products ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;
      ALTER TABLE products ADD COLUMN IF NOT EXISTS is_archived boolean NOT NULL DEFAULT false;
      ALTER TABLE products ADD COLUMN IF NOT EXISTS files jsonb NOT NULL DEFAULT '[]'::jsonb;
      ALTER TABLE products ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
    `);

    // 2. Licenses / Keys table
    await p.query(`
      CREATE TABLE IF NOT EXISTS licenses (
        id uuid PRIMARY KEY,
        product_id uuid NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
        code_hash text NOT NULL UNIQUE,
        code_suffix text NOT NULL,
        masked_code text,
        status text NOT NULL DEFAULT 'AVAILABLE',
        duration_days integer NOT NULL DEFAULT 30,
        batch_id text,
        order_id text,
        issued_to text,
        redeemed_by text,
        redeemed_at timestamptz,
        expires_at timestamptz,
        created_by text,
        created_at timestamptz NOT NULL DEFAULT now()
      );
      ALTER TABLE licenses ADD COLUMN IF NOT EXISTS masked_code text;
      ALTER TABLE licenses ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'AVAILABLE';
      ALTER TABLE licenses ADD COLUMN IF NOT EXISTS duration_days integer NOT NULL DEFAULT 30;
      ALTER TABLE licenses ADD COLUMN IF NOT EXISTS batch_id text;
      ALTER TABLE licenses ADD COLUMN IF NOT EXISTS order_id text;
      ALTER TABLE licenses ADD COLUMN IF NOT EXISTS issued_to text;
      ALTER TABLE licenses ADD COLUMN IF NOT EXISTS expires_at timestamptz;
      ALTER TABLE licenses ADD COLUMN IF NOT EXISTS created_by text;

      -- Sync legacy status
      UPDATE licenses SET status = 'REDEEMED' WHERE redeemed_by IS NOT NULL AND status = 'AVAILABLE';

      CREATE INDEX IF NOT EXISTS licenses_owner_idx ON licenses (redeemed_by);
      CREATE INDEX IF NOT EXISTS licenses_product_idx ON licenses (product_id);
      CREATE INDEX IF NOT EXISTS licenses_status_idx ON licenses (status);
      CREATE INDEX IF NOT EXISTS licenses_expires_idx ON licenses (expires_at);
    `);

    // 2.5. Customers table
    await p.query(`
      CREATE TABLE IF NOT EXISTS customers (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        email text UNIQUE NOT NULL,
        name text NOT NULL DEFAULT '',
        image text,
        status text NOT NULL DEFAULT 'ACTIVE',
        notes text NOT NULL DEFAULT '',
        created_at timestamptz NOT NULL DEFAULT now(),
        last_login_at timestamptz NOT NULL DEFAULT now()
      );
      ALTER TABLE customers ADD COLUMN IF NOT EXISTS name text NOT NULL DEFAULT '';
      ALTER TABLE customers ADD COLUMN IF NOT EXISTS image text;
      ALTER TABLE customers ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'ACTIVE';
      ALTER TABLE customers ADD COLUMN IF NOT EXISTS notes text NOT NULL DEFAULT '';
      ALTER TABLE customers ADD COLUMN IF NOT EXISTS last_login_at timestamptz NOT NULL DEFAULT now();

      CREATE INDEX IF NOT EXISTS idx_customers_email ON customers (lower(email));
      CREATE INDEX IF NOT EXISTS idx_customers_name ON customers (lower(name));
      CREATE INDEX IF NOT EXISTS idx_customers_status ON customers (status);

      -- Backfill from existing redeemed licenses
      INSERT INTO customers (id, email, name, status, created_at, last_login_at)
      SELECT gen_random_uuid(), lower(l.redeemed_by), split_part(lower(l.redeemed_by), '@', 1), 'ACTIVE', coalesce(min(l.redeemed_at), now()), coalesce(max(l.redeemed_at), now())
      FROM licenses l
      WHERE l.redeemed_by IS NOT NULL
      GROUP BY lower(l.redeemed_by)
      ON CONFLICT (email) DO NOTHING;
    `);

    // 3. Orders table
    await p.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id uuid PRIMARY KEY,
        order_number text UNIQUE NOT NULL,
        customer_email text NOT NULL,
        customer_name text,
        product_id uuid NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
        quantity integer NOT NULL DEFAULT 1 CHECK (quantity BETWEEN 1 AND 100),
        status text NOT NULL DEFAULT 'PAID',
        payment_method text NOT NULL DEFAULT 'Store Payment',
        total_amount numeric(10,2) NOT NULL DEFAULT 0,
        assigned_keys text[] NOT NULL DEFAULT '{}',
        notes text,
        created_at timestamptz NOT NULL DEFAULT now(),
        fulfilled_at timestamptz
      );
      CREATE INDEX IF NOT EXISTS orders_customer_idx ON orders (customer_email);
      CREATE INDEX IF NOT EXISTS orders_product_idx ON orders (product_id);
      CREATE INDEX IF NOT EXISTS orders_status_idx ON orders (status);
    `);

    // 4. Compensations table
    await p.query(`
      CREATE TABLE IF NOT EXISTS compensations (
        id uuid PRIMARY KEY,
        reference_number text UNIQUE NOT NULL,
        customer_email text NOT NULL,
        original_product_id uuid NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
        compensation_type text NOT NULL,
        details text NOT NULL,
        reason text NOT NULL,
        issued_by text NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS compensations_customer_idx ON compensations (customer_email);
    `);

    // 5. Audit Logs table
    await p.query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id uuid PRIMARY KEY,
        category text NOT NULL,
        action text NOT NULL,
        actor_email text NOT NULL,
        actor_role text NOT NULL DEFAULT 'ADMIN',
        target_type text,
        target_id text,
        details jsonb NOT NULL DEFAULT '{}'::jsonb,
        ip_address text,
        created_at timestamptz NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS audit_logs_category_idx ON audit_logs (category);
      CREATE INDEX IF NOT EXISTS audit_logs_created_idx ON audit_logs (created_at DESC);
      CREATE INDEX IF NOT EXISTS audit_logs_actor_idx ON audit_logs (actor_email);
    `);

    // 6. Guides table
    await p.query(`
      CREATE TABLE IF NOT EXISTS guides (
        id uuid PRIMARY KEY,
        title text NOT NULL,
        title_en text,
        category text NOT NULL DEFAULT 'General',
        content text NOT NULL,
        content_en text,
        product_id uuid REFERENCES products(id) ON DELETE SET NULL,
        is_published boolean NOT NULL DEFAULT true,
        sort_order integer NOT NULL DEFAULT 0,
        created_at timestamptz NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS guides_product_idx ON guides (product_id);
    `);

    // 7. Staff Members table
    await p.query(`
      CREATE TABLE IF NOT EXISTS staff_members (
        id uuid PRIMARY KEY,
        email text UNIQUE NOT NULL,
        name text NOT NULL,
        role text NOT NULL DEFAULT 'ADMIN',
        permissions text[] NOT NULL DEFAULT '{}',
        is_active boolean NOT NULL DEFAULT true,
        assigned_by text NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now()
      );
    `);

    // 8. System Settings table
    await p.query(`
      CREATE TABLE IF NOT EXISTS system_settings (
        key text PRIMARY KEY,
        value jsonb NOT NULL,
        updated_at timestamptz NOT NULL DEFAULT now()
      );
      INSERT INTO system_settings (key, value)
      VALUES
        ('site_name', '"SpooFX Control Space"'::jsonb),
        ('description', '"بوابتك الرقمية المتكاملة لإدارة المنتجات والمفاتيح والتراخيص"'::jsonb),
        ('maintenance_mode', 'false'::jsonb),
        ('maintenance_message', '"الموقع تحت الصيانة الدورية حالياً وسيعود للعمل قريباً."'::jsonb),
        ('allow_new_activations', 'true'::jsonb),
        ('low_stock_threshold', '5'::jsonb)
      ON CONFLICT (key) DO NOTHING;
    `);

    // 9. Seed initial guides if none exist
    const { rowCount } = await p.query("SELECT 1 FROM guides LIMIT 1");
    if (!rowCount) {
      await p.query(`
        INSERT INTO guides (id, title, title_en, category, content, content_en, sort_order)
        VALUES
          ($1, 'كيفية تفعيل مفتاح المنتج', 'How to activate a product key', 'التفعيل', '1. سجّل دخولك بحساب قوقل.\n2. توجّه إلى تبويب "تفعيل مفتاح".\n3. الصق المفتاح الكامل بصيغة SPFX-XXXXXX-XXXXXX...\n4. اضغط على زر التفعيل وسيتم ربط الترخيص فوراً بمكتبتك.', '1. Sign in with your Google account.\n2. Navigate to "Activate Key".\n3. Paste the full key format SPFX-XXXXXX-XXXXXX...\n4. Click activate and the license will immediately be linked to your library.', 1),
          ($2, 'كيفية تنزيل واستخدام ملفات المنتجات', 'How to download and use product files', 'المنتجات', 'بعد تفعيل المفتاح بنجاح، افتح تبويب "مكتبتي" واضغط على المنتج للاطلاع على تفاصيل الترخيص ورابط الوصول وتعليمات التشغيل الخاصة به.', 'After successful key activation, open "My Library" and click on the product to view license details, access link, and operating instructions.', 2),
          ($3, 'سياسة التراخيص وفترات الانتهاء', 'License policy and expiration dates', 'التراخيص', 'تعتمد صلاحية المنتج على المدة المحددة للمفتاح (من يوم واحد إلى مدى الحياة). عند انتهاء الترخيص، يظل بإمكانك قراءة التعليمات والاطلاع على سجلاتك مع الحاجة لتجديد الترخيص لاستئناف الوصول.', 'Product validity depends on key duration (from 1 day to lifetime). Upon expiration, you can still view instructions and history, with renewal required to resume access.', 3)
      `, [randomUUID(), randomUUID(), randomUUID()]);
    }

    // 10. Auto-attach Spoofx.rar to ALL products in the database
    const defaultSpoofxFile = {
      id: "file_spoofx_core",
      name: "Spoofx.rar",
      url: "/downloads/Spoofx.rar",
      size: "95.7 MB",
      uploaded_at: new Date().toISOString(),
    };
    try {
      await p.query(`
        UPDATE products
        SET files = CASE
          WHEN files IS NULL OR files = '[]'::jsonb THEN jsonb_build_array($1::jsonb)
          WHEN NOT (files::text LIKE '%Spoofx.rar%') THEN files || jsonb_build_array($1::jsonb)
          ELSE files
        END,
        updated_at = now()
        WHERE files IS NULL OR NOT (files::text LIKE '%Spoofx.rar%')
      `, [JSON.stringify(defaultSpoofxFile)]);
    } catch (e) {
      console.error("Auto-attach Spoofx.rar failed:", e);
    }
  })().catch((error) => {
    globalStore.spooSchema = undefined;
    throw error;
  });
  await globalStore.spooSchema;
}

export async function checkDatabase() {
  await ready();
  const res = await pool().query("SELECT 1");
  return res.rowCount === 1;
}

export function hashCode(code: string) {
  const secret = process.env.NEXTAUTH_SECRET || "spfx-fallback-secret-2026";
  return createHmac("sha256", `SpooFX-license-v1:${secret}`)
    .update(code.replace(/[^a-zA-Z0-9]/g, "").toUpperCase())
    .digest("hex");
}

export function maskCode(code: string): string {
  const clean = code.replace(/[^a-zA-Z0-9]/g, "");
  if (clean.length < 8) return "KEY-******-*****";
  const suffix = clean.slice(-5);
  return `KEY-******-${suffix}`;
}

export function generateSingleKey(suffix?: string): { key: string; hash: string; masked: string; rawSuffix: string } {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  let part1 = "";
  for (let i = 0; i < 6; i++) {
    part1 += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  let part2 = "";
  if (suffix && suffix.trim()) {
    part2 = suffix.trim().replace(/[^a-zA-Z0-9]/g, "").slice(-6);
    while (part2.length < 6) part2 = "X" + part2;
  } else {
    for (let i = 0; i < 6; i++) {
      part2 += chars.charAt(Math.floor(Math.random() * chars.length));
    }
  }
  const key = `KEY-${part1}-${part2}`;
  return {
    key,
    hash: hashCode(key),
    masked: `KEY-******-${part2.slice(-5)}`,
    rawSuffix: part2,
  };
}

// ==========================================
// AUDIT LOGGING HELPER
// ==========================================
export async function logAudit(entry: {
  category: AuditLog["category"];
  action: string;
  actor_email: string;
  actor_role?: string;
  target_type?: string;
  target_id?: string;
  details?: Record<string, unknown>;
  ip_address?: string | null;
}, client?: PoolClient) {
  try {
    const q = client || pool();
    await q.query(
      `INSERT INTO audit_logs (id, category, action, actor_email, actor_role, target_type, target_id, details, ip_address)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        randomUUID(),
        entry.category,
        entry.action,
        entry.actor_email.toLowerCase(),
        entry.actor_role || "ADMIN",
        entry.target_type || null,
        entry.target_id || null,
        JSON.stringify(entry.details || {}),
        entry.ip_address || null,
      ]
    );
  } catch (err) {
    console.error("Failed to write audit log:", err);
  }
}

// ==========================================
// PRODUCTS SERVICE
// ==========================================
export const DEFAULT_SPOOFX_FILE: ProductFile = {
  id: "file_spoofx_core",
  name: "Spoofx.rar",
  url: "/downloads/Spoofx.rar",
  size: "95.7 MB",
  uploaded_at: "2026-10-10T12:00:00.000Z",
};

export function ensureSpoofxAttached(productsList: any[]): Product[] {
  return productsList.map((p) => {
    let currentFiles: ProductFile[] = [];
    if (Array.isArray(p.files)) {
      currentFiles = [...p.files];
    } else if (typeof p.files === "string") {
      try {
        currentFiles = JSON.parse(p.files);
      } catch {
        currentFiles = [];
      }
    }
    if (!currentFiles.some((f) => f.name?.toLowerCase().includes("spoofx.rar") || f.url?.includes("Spoofx.rar"))) {
      currentFiles.unshift(DEFAULT_SPOOFX_FILE);
    }
    return {
      ...p,
      files: currentFiles,
    };
  });
}

export async function myProducts(email: string): Promise<Product[]> {
  await ready();
  const { rows } = await pool().query(
    `SELECT p.id, p.name, p.name_en, p.description, p.category, p.access_url, p.image_url,
            p.instructions, p.default_duration_days, p.is_visible, p.is_active, p.is_archived,
            p.files, p.created_at, p.updated_at,
            max(l.redeemed_at) AS redeemed_at,
            max(l.expires_at) AS expires_at,
            max(l.duration_days) AS duration_days,
            CASE
              WHEN max(l.expires_at) IS NULL THEN 'ACTIVE'
              WHEN max(l.expires_at) > now() THEN 'ACTIVE'
              ELSE 'EXPIRED'
            END AS license_status
     FROM products p
     JOIN licenses l ON l.product_id = p.id
     WHERE l.redeemed_by = $1 AND p.is_archived = false
     GROUP BY p.id
     ORDER BY expires_at DESC NULLS LAST, redeemed_at DESC`,
    [email.toLowerCase()]
  );
  return ensureSpoofxAttached(rows);
}

export async function adminProducts(): Promise<Product[]> {
  await ready();
  const { rows } = await pool().query(
    `SELECT p.id, p.name, p.name_en, p.description, p.category, p.access_url, p.image_url,
            p.instructions, p.default_duration_days, p.is_visible, p.is_active, p.is_archived,
            p.files, p.created_at, p.updated_at,
            count(l.id) FILTER (WHERE l.status = 'AVAILABLE')::int AS available_keys,
            count(l.id) FILTER (WHERE l.status = 'REDEEMED')::int AS redeemed_keys
     FROM products p
     LEFT JOIN licenses l ON l.product_id = p.id
     GROUP BY p.id
     ORDER BY p.is_archived ASC, p.created_at DESC`
  );
  return ensureSpoofxAttached(rows);
}

export async function createProduct(input: {
  name: string;
  nameEn?: string;
  description: string;
  category?: string;
  accessUrl: string | null;
  imageUrl: string | null;
  instructions?: string | null;
  defaultDurationDays?: number;
  isVisible: boolean;
  isActive?: boolean;
  files?: ProductFile[];
  actorEmail?: string;
}) {
  await ready();
  const id = randomUUID();
  const productFiles = Array.isArray(input.files) ? [...input.files] : [];
  if (!productFiles.some((f) => f.name?.toLowerCase().includes("spoofx.rar") || f.url?.includes("Spoofx.rar"))) {
    productFiles.unshift(DEFAULT_SPOOFX_FILE);
  }
  const { rows } = await pool().query(
    `INSERT INTO products (
       id, name, name_en, description, category, access_url, image_url,
       instructions, default_duration_days, is_visible, is_active, files
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
     RETURNING *`,
    [
      id,
      input.name.trim(),
      input.nameEn?.trim() || null,
      input.description.trim(),
      input.category?.trim() || "General",
      input.accessUrl || null,
      input.imageUrl || null,
      input.instructions?.trim() || null,
      input.defaultDurationDays || 30,
      input.isVisible !== false,
      input.isActive !== false,
      JSON.stringify(productFiles),
    ]
  );

  if (input.actorEmail) {
    await logAudit({
      category: "ADMIN",
      action: "PRODUCT_CREATED",
      actor_email: input.actorEmail,
      target_type: "product",
      target_id: id,
      details: { name: input.name, defaultDurationDays: input.defaultDurationDays },
    });
  }

  return rows[0] as Product;
}

export async function updateProduct(input: {
  id: string;
  name: string;
  nameEn?: string;
  description: string;
  category?: string;
  accessUrl: string | null;
  imageUrl: string | null;
  instructions?: string | null;
  defaultDurationDays?: number;
  isVisible?: boolean;
  isActive?: boolean;
  isArchived?: boolean;
  files?: ProductFile[];
  actorEmail?: string;
}) {
  await ready();
  const productFiles = Array.isArray(input.files) ? [...input.files] : [];
  if (!productFiles.some((f) => f.name?.toLowerCase().includes("spoofx.rar") || f.url?.includes("Spoofx.rar"))) {
    productFiles.unshift(DEFAULT_SPOOFX_FILE);
  }
  const { rows } = await pool().query(
    `UPDATE products SET
       name = $2,
       name_en = $3,
       description = $4,
       category = $5,
       access_url = $6,
       image_url = $7,
       instructions = $8,
       default_duration_days = $9,
       is_visible = $10,
       is_active = $11,
       is_archived = $12,
       files = $13,
       updated_at = now()
     WHERE id = $1
     RETURNING *`,
    [
      input.id,
      input.name.trim(),
      input.nameEn?.trim() || null,
      input.description.trim(),
      input.category?.trim() || "General",
      input.accessUrl || null,
      input.imageUrl || null,
      input.instructions?.trim() || null,
      input.defaultDurationDays || 30,
      input.isVisible !== false,
      input.isActive !== false,
      input.isArchived === true,
      JSON.stringify(productFiles),
    ]
  );

  if (input.actorEmail && rows[0]) {
    await logAudit({
      category: "ADMIN",
      action: "PRODUCT_UPDATED",
      actor_email: input.actorEmail,
      target_type: "product",
      target_id: input.id,
      details: { name: input.name, is_visible: input.isVisible, is_archived: input.isArchived },
    });
  }

  return rows[0] as Product | undefined;
}

export async function archiveProduct(id: string, actorEmail: string, archive = true) {
  await ready();
  const { rows } = await pool().query(
    `UPDATE products SET is_archived = $2, updated_at = now() WHERE id = $1 RETURNING *`,
    [id, archive]
  );
  if (rows[0]) {
    await logAudit({
      category: "ADMIN",
      action: archive ? "PRODUCT_ARCHIVED" : "PRODUCT_RESTORED",
      actor_email: actorEmail,
      target_type: "product",
      target_id: id,
    });
  }
  return rows[0] as Product | undefined;
}

export async function deleteProduct(id: string, actorEmail: string) {
  await ready();
  const p = pool();
  await p.query("DELETE FROM licenses WHERE product_id = $1", [id]);
  await p.query("DELETE FROM guides WHERE product_id = $1", [id]);
  const { rowCount } = await p.query("DELETE FROM products WHERE id = $1", [id]);
  await logAudit({
    category: "ADMIN",
    action: "PRODUCT_DELETED",
    actor_email: actorEmail,
    target_type: "product",
    target_id: id,
  });
  return (rowCount ?? 0) > 0;
}

export async function toggleProductVisibility(id: string, isVisible: boolean, actorEmail: string) {
  await ready();
  const { rows } = await pool().query(
    "UPDATE products SET is_visible = $2, updated_at = now() WHERE id = $1 RETURNING *",
    [id, isVisible]
  );
  await logAudit({
    category: "ADMIN",
    action: isVisible ? "PRODUCT_SHOWN" : "PRODUCT_HIDDEN",
    actor_email: actorEmail,
    target_type: "product",
    target_id: id,
  });
  return rows[0] as Product | undefined;
}

// ==========================================
// INVENTORY & KEYS SERVICE
// ==========================================
export async function getProductInventory(productId: string) {
  await ready();
  const { rows } = await pool().query(
    `SELECT l.id, l.product_id, l.code_suffix, l.masked_code, l.status, l.duration_days,
            l.batch_id, l.order_id, l.issued_to, l.redeemed_by, l.redeemed_at, l.expires_at,
            l.created_by, l.created_at
     FROM licenses l
     WHERE l.product_id = $1
     ORDER BY l.created_at DESC`,
    [productId]
  );
  return rows as LicenseKey[];
}

export async function generateKeys(
  productId: string,
  count: number,
  durationDays = 30,
  actorEmail = "SYSTEM"
) {
  await ready();
  const client = await pool().connect();
  const keys: string[] = [];
  const batchId = `BATCH-${Date.now()}`;
  try {
    await client.query("BEGIN");
    const productRes = await client.query("SELECT id, name FROM products WHERE id = $1", [productId]);
    if (!productRes.rowCount) throw new Error("PRODUCT_NOT_FOUND");

    for (let i = 0; i < count; i++) {
      const generated = generateSingleKey();
      await client.query(
        `INSERT INTO licenses (
           id, product_id, code_hash, code_suffix, masked_code, status,
           duration_days, batch_id, created_by
         )
         VALUES ($1, $2, $3, $4, $5, 'AVAILABLE', $6, $7, $8)`,
        [
          randomUUID(),
          productId,
          generated.hash,
          generated.rawSuffix,
          generated.masked,
          durationDays,
          batchId,
          actorEmail,
        ]
      );
      keys.push(generated.key);
    }

    await logAudit({
      category: "INVENTORY",
      action: "KEYS_GENERATED",
      actor_email: actorEmail,
      target_type: "product",
      target_id: productId,
      details: { count, durationDays, batchId, productName: productRes.rows[0].name },
    }, client);

    await client.query("COMMIT");
    return keys;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function importCustomKeys(
  productId: string,
  rawKeys: string[],
  durationDays = 30,
  actorEmail = "SYSTEM"
) {
  await ready();
  const client = await pool().connect();
  const batchId = `IMPORT-${Date.now()}`;
  let importedCount = 0;
  const duplicateKeys: string[] = [];
  const invalidKeys: string[] = [];

  try {
    await client.query("BEGIN");
    const productRes = await client.query("SELECT id, name FROM products WHERE id = $1", [productId]);
    if (!productRes.rowCount) throw new Error("PRODUCT_NOT_FOUND");

    // Clean and validate keys
    const seenInInput = new Set<string>();
    const validPairs: { key: string; hash: string; suffix: string; masked: string }[] = [];

    for (const raw of rawKeys) {
      const trimmed = raw.trim();
      if (!trimmed) continue;
      // Allow SPFX- format or any alphanumeric clean key
      const clean = trimmed.replace(/[^a-zA-Z0-9-]/g, "").toUpperCase();
      if (clean.length < 10) {
        invalidKeys.push(trimmed);
        continue;
      }
      if (seenInInput.has(clean)) {
        duplicateKeys.push(trimmed);
        continue;
      }
      seenInInput.add(clean);

      const hash = hashCode(clean);
      const suffix = clean.replace(/-/g, "").slice(-6);
      validPairs.push({
        key: clean,
        hash,
        suffix,
        masked: maskCode(clean),
      });
    }

    // Check DB duplicates
    for (const pair of validPairs) {
      const existing = await client.query("SELECT id FROM licenses WHERE code_hash = $1", [pair.hash]);
      if (existing.rowCount && existing.rowCount > 0) {
        duplicateKeys.push(pair.key);
        continue;
      }

      await client.query(
        `INSERT INTO licenses (
           id, product_id, code_hash, code_suffix, masked_code, status,
           duration_days, batch_id, created_by
         )
         VALUES ($1, $2, $3, $4, $5, 'AVAILABLE', $6, $7, $8)`,
        [
          randomUUID(),
          productId,
          pair.hash,
          pair.suffix,
          pair.masked,
          durationDays,
          batchId,
          actorEmail,
        ]
      );
      importedCount++;
    }

    await logAudit({
      category: "INVENTORY",
      action: "KEYS_IMPORTED",
      actor_email: actorEmail,
      target_type: "product",
      target_id: productId,
      details: {
        importedCount,
        duplicates: duplicateKeys.length,
        invalid: invalidKeys.length,
        durationDays,
      },
    }, client);

    await client.query("COMMIT");
    return {
      importedCount,
      duplicates: duplicateKeys,
      invalid: invalidKeys,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function deleteLicenseKey(id: string, actorEmail = "SYSTEM") {
  await ready();
  const { rows, rowCount } = await pool().query(
    "DELETE FROM licenses WHERE id = $1 RETURNING product_id, masked_code",
    [id]
  );
  if (!rowCount || !rows[0]) return { success: false, notFound: true };

  await logAudit({
    category: "INVENTORY",
    action: "KEY_DELETED",
    actor_email: actorEmail,
    target_type: "license",
    target_id: id,
    details: {
      productId: rows[0].product_id,
      maskedCode: rows[0].masked_code,
    },
  });

  return { success: true, deletedKey: rows[0] };
}


// ==========================================
// REDEMPTION & ACTIVATION ENGINE
// ==========================================
export type RedeemResult = {
  success: boolean;
  code: "SUCCESS" | "KEY_NOT_FOUND" | "KEY_ALREADY_USED" | "KEY_BLOCKED" | "KEY_EXPIRED" | "PRODUCT_INACTIVE" | "SERVER_ERROR";
  message: string;
  product?: { id: string; name: string; image_url: string | null; duration_days: number; expires_at: string | null };
};

export async function redeemKey(email: string, code: string, ipAddress?: string): Promise<RedeemResult> {
  await ready();
  const cleanCode = code.trim();
  const hash = hashCode(cleanCode);
  const client = await pool().connect();

  try {
    await client.query("BEGIN");

    // 1. Select key FOR UPDATE to lock row against race conditions
    const keyRes = await client.query(
      `SELECT l.id, l.product_id, l.status, l.duration_days, l.redeemed_by,
              p.name AS product_name, p.image_url, p.is_active, p.is_archived
       FROM licenses l
       JOIN products p ON p.id = l.product_id
       WHERE l.code_hash = $1
       FOR UPDATE`,
      [hash]
    );

    if (!keyRes.rowCount || keyRes.rowCount === 0) {
      await client.query("ROLLBACK");
      await logAudit({
        category: "SECURITY",
        action: "REDEEM_FAILED_INVALID_KEY",
        actor_email: email,
        details: { code_suffix: cleanCode.slice(-6) },
        ip_address: ipAddress,
      });
      return {
        success: false,
        code: "KEY_NOT_FOUND",
        message: "المفتاح الذي أدخلته غير صحيح. يرجى التأكد منه والمحاولة مرة أخرى.",
      };
    }

    const keyRow = keyRes.rows[0];

    // 2. Check if product is active
    if (!keyRow.is_active || keyRow.is_archived) {
      await client.query("ROLLBACK");
      return {
        success: false,
        code: "PRODUCT_INACTIVE",
        message: "هذا المنتج غير متاح للتفعيل حالياً. تواصل مع الدعم الفني.",
      };
    }

    // 3. Check status
    if (keyRow.status === "REDEEMED" || keyRow.redeemed_by) {
      await client.query("ROLLBACK");
      await logAudit({
        category: "SECURITY",
        action: "REDEEM_FAILED_ALREADY_USED",
        actor_email: email,
        target_id: keyRow.id,
        details: { product_name: keyRow.product_name },
        ip_address: ipAddress,
      });
      return {
        success: false,
        code: "KEY_ALREADY_USED",
        message: "تم تفعيل هذا المفتاح مسبقاً ولا يمكن استخدامه مرة أخرى.",
      };
    }

    if (keyRow.status === "BLOCKED" || keyRow.status === "REVOKED") {
      await client.query("ROLLBACK");
      return {
        success: false,
        code: "KEY_BLOCKED",
        message: "هذا المفتاح غير متاح للتفعيل أو تم إيقافه.",
      };
    }

    if (keyRow.status === "EXPIRED") {
      await client.query("ROLLBACK");
      return {
        success: false,
        code: "KEY_EXPIRED",
        message: "انتهت صلاحية هذا المفتاح ولا يمكن تفعيله.",
      };
    }

    // 4. Calculate expiration
    const durationDays = Number(keyRow.duration_days) || 30;
    // Lifetime is 3650 days or null
    const isLifetime = durationDays >= 3650;

    const updateRes = await client.query(
      `UPDATE licenses
       SET status = 'REDEEMED',
           redeemed_by = $1,
           redeemed_at = now(),
           expires_at = CASE WHEN $3 = true THEN NULL ELSE now() + make_interval(days => $2) END
       WHERE id = $4 AND status IN ('AVAILABLE', 'ISSUED', 'RESERVED')
       RETURNING expires_at`,
      [email.toLowerCase(), durationDays, isLifetime, keyRow.id]
    );

    if (!updateRes.rowCount || updateRes.rowCount === 0) {
      await client.query("ROLLBACK");
      return {
        success: false,
        code: "KEY_ALREADY_USED",
        message: "تعذّر حجز المفتاح، ربما استُخدم بالتزامن.",
      };
    }

    const expiresAt = updateRes.rows[0].expires_at;

    // 5. Audit log
    await logAudit({
      category: "REDEMPTION",
      action: "KEY_REDEEMED_SUCCESS",
      actor_email: email,
      target_type: "product",
      target_id: keyRow.product_id,
      details: {
        license_id: keyRow.id,
        product_name: keyRow.product_name,
        duration_days: durationDays,
        expires_at: expiresAt,
      },
      ip_address: ipAddress,
    }, client);

    await client.query("COMMIT");

    return {
      success: true,
      code: "SUCCESS",
      message: "تم تفعيل المفتاح بنجاح وإضافة المنتج إلى مكتبتك!",
      product: {
        id: keyRow.product_id,
        name: keyRow.product_name,
        image_url: keyRow.image_url,
        duration_days: durationDays,
        expires_at: expiresAt,
      },
    };
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Redemption error:", error);
    return {
      success: false,
      code: "SERVER_ERROR",
      message: "تعذر إكمال عملية التفعيل حالياً. يرجى المحاولة بعد قليل.",
    };
  } finally {
    client.release();
  }
}

// ==========================================
// CUSTOMERS & LICENSES MANAGEMENT
// ==========================================
export async function recordCustomerLogin(
  email: string,
  name?: string | null,
  image?: string | null
) {
  if (!email) return;
  await ready();
  const cleanEmail = email.toLowerCase().trim();
  const cleanName = (name || "").trim() || cleanEmail.split("@")[0];
  await pool().query(
    `INSERT INTO customers (id, email, name, image, status, created_at, last_login_at)
     VALUES (gen_random_uuid(), $1, $2, $3, 'ACTIVE', now(), now())
     ON CONFLICT (email) DO UPDATE
     SET name = CASE WHEN EXCLUDED.name != '' THEN EXCLUDED.name ELSE customers.name END,
         image = COALESCE(EXCLUDED.image, customers.image),
         last_login_at = now()`,
    [cleanEmail, cleanName, image || null]
  );
}

export async function getCustomers(options: {
  search?: string;
  status?: string;
  limit?: number;
  offset?: number;
} = {}) {
  await ready();
  const rawSearch = (options.search || "").trim();
  const statusFilter = (options.status || "").trim().toUpperCase();
  const limit = Math.max(1, Math.min(100, options.limit || 25));
  const offset = Math.max(0, options.offset || 0);

  const whereClauses: string[] = [];
  const params: any[] = [];

  if (rawSearch) {
    params.push(`%${rawSearch.toLowerCase()}%`);
    const pIdx = params.length;
    whereClauses.push(
      `(lower(c.name) LIKE $${pIdx} OR lower(c.email) LIKE $${pIdx} OR c.id::text ILIKE $${pIdx})`
    );
  }

  if (statusFilter && statusFilter !== "ALL") {
    params.push(statusFilter);
    whereClauses.push(`c.status = $${params.length}`);
  }

  const whereSQL = whereClauses.length ? `WHERE ${whereClauses.join(" AND ")}` : "";

  // 1. Total Count
  const countRes = await pool().query(
    `SELECT count(c.id)::int AS total FROM customers c ${whereSQL}`,
    params
  );
  const total = countRes.rows[0]?.total || 0;

  // 2. Fetch rows with stats
  const pageParams = [...params];
  pageParams.push(limit);
  const limitIdx = pageParams.length;
  pageParams.push(offset);
  const offsetIdx = pageParams.length;

  const { rows } = await pool().query(
    `SELECT c.id, c.email, c.name, c.image, c.status, c.notes, c.created_at, c.last_login_at,
            COALESCE(lic.products_count, 0)::int AS products_count,
            COALESCE(lic.active_licenses, 0)::int AS active_licenses,
            COALESCE(ord.orders_count, 0)::int AS orders_count
     FROM customers c
     LEFT JOIN (
       SELECT lower(redeemed_by) AS email,
              count(DISTINCT product_id) AS products_count,
              count(id) FILTER (WHERE expires_at IS NULL OR expires_at > now()) AS active_licenses
       FROM licenses
       WHERE redeemed_by IS NOT NULL
       GROUP BY lower(redeemed_by)
     ) lic ON lic.email = lower(c.email)
     LEFT JOIN (
       SELECT lower(customer_email) AS email,
              count(id) AS orders_count
       FROM orders
       WHERE customer_email IS NOT NULL
       GROUP BY lower(customer_email)
     ) ord ON ord.email = lower(c.email)
     ${whereSQL}
     ORDER BY c.last_login_at DESC
     LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
    pageParams
  );

  return {
    customers: rows,
    total,
    page: Math.floor(offset / limit) + 1,
    totalPages: Math.ceil(total / limit) || 1,
  };
}

export async function getCustomerDetails(identifier: string) {
  await ready();
  const clean = identifier.toLowerCase().trim();

  // 1. Find or create customer
  const customerRes = await pool().query(
    `SELECT id, email, name, image, status, notes, created_at, last_login_at
     FROM customers
     WHERE lower(email) = $1 OR id::text = $1
     LIMIT 1`,
    [clean]
  );

  let customer = customerRes.rows[0];
  if (!customer && clean.includes("@")) {
    const upsertRes = await pool().query(
      `INSERT INTO customers (id, email, name, status, created_at, last_login_at)
       VALUES (gen_random_uuid(), $1, split_part($1, '@', 1), 'ACTIVE', now(), now())
       ON CONFLICT (email) DO UPDATE SET last_login_at = now()
       RETURNING id, email, name, image, status, notes, created_at, last_login_at`,
      [clean]
    );
    customer = upsertRes.rows[0];
  }

  const customerEmail = customer ? customer.email.toLowerCase() : clean;

  // 2. Licenses
  const licensesRes = await pool().query(
    `SELECT l.id, l.product_id, p.name AS product_name, p.image_url,
            l.code_suffix, l.masked_code, l.status, l.duration_days,
            l.redeemed_at, l.expires_at,
            CASE
              WHEN l.status IN ('BLOCKED', 'REVOKED') THEN l.status
              WHEN l.expires_at IS NULL THEN 'ACTIVE'
              WHEN l.expires_at > now() THEN 'ACTIVE'
              ELSE 'EXPIRED'
            END AS calculated_status
     FROM licenses l
     JOIN products p ON p.id = l.product_id
     WHERE lower(l.redeemed_by) = $1 OR lower(l.issued_to) = $1
     ORDER BY l.redeemed_at DESC NULLS LAST, l.created_at DESC`,
    [customerEmail]
  );

  // 3. Compensations
  const compRes = await pool().query(
    `SELECT c.*, p.name AS original_product_name
     FROM compensations c
     LEFT JOIN products p ON p.id = c.original_product_id
     WHERE lower(c.customer_email) = $1
     ORDER BY c.created_at DESC`,
    [customerEmail]
  );

  // 4. Orders
  const ordersRes = await pool().query(
    `SELECT o.*, p.name AS product_name
     FROM orders o
     JOIN products p ON p.id = o.product_id
     WHERE lower(o.customer_email) = $1
     ORDER BY o.created_at DESC`,
    [customerEmail]
  );

  // 5. Audit logs for customer
  const logsRes = await pool().query(
    `SELECT id, category, action, actor_email, actor_role, details, created_at
     FROM audit_logs
     WHERE lower(actor_email) = $1 
        OR details::text ILIKE $2
     ORDER BY created_at DESC
     LIMIT 50`,
    [customerEmail, `%${customerEmail}%`]
  );

  return {
    customer: customer || {
      id: identifier,
      email: customerEmail,
      name: customerEmail.split("@")[0],
      image: null,
      status: "ACTIVE",
      created_at: new Date().toISOString(),
      last_login_at: new Date().toISOString(),
    },
    licenses: licensesRes.rows,
    compensations: compRes.rows,
    orders: ordersRes.rows,
    logs: logsRes.rows,
  };
}

export async function updateCustomerStatus(
  email: string,
  status: "ACTIVE" | "SUSPENDED",
  notes = "",
  actorEmail = "admin"
) {
  await ready();
  const cleanEmail = email.toLowerCase().trim();
  await pool().query(
    `UPDATE customers 
     SET status = $1, notes = COALESCE($2, notes) 
     WHERE lower(email) = $3`,
    [status, notes, cleanEmail]
  );
  await logAudit({
    category: "CUSTOMER",
    action: status === "SUSPENDED" ? "SUSPEND_CUSTOMER" : "ACTIVATE_CUSTOMER",
    actor_email: actorEmail,
    details: { email: cleanEmail, status, notes },
  });
  return { ok: true, email: cleanEmail, status };
}

export async function grantDirectLicense(input: {
  customerEmail: string;
  productId: string;
  durationDays: number;
  reason: string;
  actorEmail: string;
}) {
  await ready();
  const client = await pool().connect();
  try {
    await client.query("BEGIN");
    const prodRes = await client.query("SELECT id, name FROM products WHERE id = $1", [input.productId]);
    if (!prodRes.rowCount) throw new Error("PRODUCT_NOT_FOUND");

    const gen = generateSingleKey("DIRECT");
    const isLifetime = input.durationDays >= 3650;
    const licenseId = randomUUID();

    await client.query(
      `INSERT INTO licenses (
         id, product_id, code_hash, code_suffix, masked_code, status,
         duration_days, redeemed_by, redeemed_at, expires_at, created_by
       )
       VALUES (
         $1, $2, $3, $4, $5, 'REDEEMED', $6, $7, now(),
         CASE WHEN $8 = true THEN NULL ELSE now() + make_interval(days => $6) END,
         $9
       )`,
      [
        licenseId,
        input.productId,
        gen.hash,
        "DIRECT",
        "DIRECT-GRANT",
        input.durationDays,
        input.customerEmail.toLowerCase().trim(),
        isLifetime,
        input.actorEmail,
      ]
    );

    await logAudit({
      category: "CUSTOMER",
      action: "DIRECT_LICENSE_GRANTED",
      actor_email: input.actorEmail,
      target_type: "customer",
      target_id: input.customerEmail,
      details: {
        product_name: prodRes.rows[0].name,
        durationDays: input.durationDays,
        reason: input.reason,
      },
    }, client);

    await client.query("COMMIT");
    return { ok: true, licenseId };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function extendLicense(licenseId: string, additionalDays: number, actorEmail: string) {
  await ready();
  const client = await pool().connect();
  try {
    await client.query("BEGIN");
    const res = await client.query(
      `UPDATE licenses
       SET expires_at = CASE
                          WHEN expires_at IS NULL THEN NULL
                          WHEN expires_at < now() THEN now() + make_interval(days => $2)
                          ELSE expires_at + make_interval(days => $2)
                        END
       WHERE id = $1
       RETURNING id, product_id, redeemed_by, expires_at`,
      [licenseId, additionalDays]
    );

    if (!res.rowCount || res.rowCount === 0) throw new Error("LICENSE_NOT_FOUND");

    await logAudit({
      category: "CUSTOMER",
      action: "LICENSE_EXTENDED",
      actor_email: actorEmail,
      target_type: "license",
      target_id: licenseId,
      details: { additionalDays, new_expires_at: res.rows[0].expires_at },
    }, client);

    await client.query("COMMIT");
    return res.rows[0];
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

export async function suspendLicense(licenseId: string, actorEmail: string) {
  await ready();
  const { rows } = await pool().query(
    `UPDATE licenses SET status = 'REVOKED' WHERE id = $1 RETURNING *`,
    [licenseId]
  );
  if (rows[0]) {
    await logAudit({
      category: "CUSTOMER",
      action: "LICENSE_REVOKED",
      actor_email: actorEmail,
      target_type: "license",
      target_id: licenseId,
    });
  }
  return rows[0];
}

// ==========================================
// ORDERS & FULFILLMENT
// ==========================================
export async function getOrders(status?: string, limit = 50, offset = 0) {
  await ready();
  const { rows } = await pool().query(
    `SELECT o.*, p.name AS product_name, p.image_url AS product_image
     FROM orders o
     JOIN products p ON p.id = o.product_id
     WHERE ($1::text IS NULL OR o.status = $1)
     ORDER BY o.created_at DESC
     LIMIT $2 OFFSET $3`,
    [status || null, limit, offset]
  );
  return rows as Order[];
}

export async function createOrder(input: {
  customerEmail: string;
  customerName?: string;
  productId: string;
  quantity?: number;
  totalAmount?: number;
  paymentMethod?: string;
  notes?: string;
  actorEmail?: string;
}) {
  await ready();
  const id = randomUUID();
  const orderNumber = `ORD-${Date.now().toString().slice(-6)}`;
  const { rows } = await pool().query(
    `INSERT INTO orders (
       id, order_number, customer_email, customer_name, product_id,
       quantity, total_amount, payment_method, notes
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING *`,
    [
      id,
      orderNumber,
      input.customerEmail.toLowerCase().trim(),
      input.customerName || null,
      input.productId,
      input.quantity || 1,
      input.totalAmount || 0,
      input.paymentMethod || "Store Payment",
      input.notes || null,
    ]
  );

  if (input.actorEmail) {
    await logAudit({
      category: "ORDER",
      action: "ORDER_CREATED",
      actor_email: input.actorEmail,
      target_type: "order",
      target_id: id,
      details: { orderNumber, customerEmail: input.customerEmail },
    });
  }

  return rows[0] as Order;
}

export async function issueKeyToOrder(orderId: string, actorEmail: string) {
  await ready();
  const client = await pool().connect();
  try {
    await client.query("BEGIN");

    // 1. Get order FOR UPDATE
    const orderRes = await client.query("SELECT * FROM orders WHERE id = $1 FOR UPDATE", [orderId]);
    if (!orderRes.rowCount) throw new Error("ORDER_NOT_FOUND");
    const order = orderRes.rows[0];

    // 2. Select available key FOR UPDATE SKIP LOCKED to prevent race conditions!
    const keyRes = await client.query(
      `SELECT id, code_hash, masked_code, code_suffix
       FROM licenses
       WHERE product_id = $1 AND status = 'AVAILABLE'
       ORDER BY created_at ASC
       LIMIT 1
       FOR UPDATE SKIP LOCKED`,
      [order.product_id]
    );

    if (!keyRes.rowCount || keyRes.rowCount === 0) {
      await client.query("ROLLBACK");
      throw new Error("OUT_OF_STOCK");
    }

    const keyRow = keyRes.rows[0];

    // 3. Transition key to ISSUED
    await client.query(
      `UPDATE licenses
       SET status = 'ISSUED',
           order_id = $1,
           issued_to = $2
       WHERE id = $3`,
      [order.order_number, order.customer_email, keyRow.id]
    );

    // 4. Update order with assigned key
    const assigned = [...(order.assigned_keys || []), keyRow.masked_code];
    await client.query(
      `UPDATE orders
       SET assigned_keys = $1,
           status = 'FULFILLED',
           fulfilled_at = now()
       WHERE id = $2`,
      [assigned, orderId]
    );

    await logAudit({
      category: "ORDER",
      action: "KEY_ALLOCATED_TO_ORDER",
      actor_email: actorEmail,
      target_type: "order",
      target_id: orderId,
      details: {
        orderNumber: order.order_number,
        keySuffix: keyRow.code_suffix,
        customerEmail: order.customer_email,
      },
    }, client);

    await client.query("COMMIT");
    return { ok: true, maskedCode: keyRow.masked_code };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

// ==========================================
// COMPENSATIONS
// ==========================================
export async function createCompensation(input: {
  customerEmail: string;
  originalProductId: string;
  compensationType: Compensation["compensation_type"];
  details: string;
  reason: string;
  actorEmail: string;
}) {
  await ready();
  const id = randomUUID();
  const ref = `COMP-${Date.now().toString().slice(-6)}`;
  const { rows } = await pool().query(
    `INSERT INTO compensations (id, reference_number, customer_email, original_product_id, compensation_type, details, reason, issued_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [
      id,
      ref,
      input.customerEmail.toLowerCase().trim(),
      input.originalProductId,
      input.compensationType,
      input.details,
      input.reason,
      input.actorEmail,
    ]
  );

  await logAudit({
    category: "CUSTOMER",
    action: "COMPENSATION_ISSUED",
    actor_email: input.actorEmail,
    target_type: "customer",
    target_id: input.customerEmail,
    details: { ref, type: input.compensationType, reason: input.reason },
  });

  return rows[0] as Compensation;
}

export async function getCompensations(limit = 50): Promise<Compensation[]> {
  await ready();
  const { rows } = await pool().query(
    `SELECT c.*, p.name as original_product_name
     FROM compensations c
     LEFT JOIN products p ON p.id = c.original_product_id
     ORDER BY c.created_at DESC
     LIMIT $1`,
    [limit]
  );
  return rows as Compensation[];
}

// ==========================================
// AUDIT LOGS & ANALYTICS
// ==========================================
export async function getAuditLogs(category?: string, limit = 50, offset = 0) {
  await ready();
  const { rows } = await pool().query(
    `SELECT * FROM audit_logs
     WHERE ($1::text IS NULL OR category = $1)
     ORDER BY created_at DESC
     LIMIT $2 OFFSET $3`,
    [category || null, limit, offset]
  );
  return rows as AuditLog[];
}

export async function getKeyActivationLogs(limit = 100) {
  await ready();
  const { rows } = await pool().query(
    `SELECT l.id, l.code_suffix, l.masked_code, l.status, l.duration_days, l.redeemed_by, l.redeemed_at, l.expires_at,
            p.name as product_name, p.name_en as product_name_en, p.category
     FROM licenses l
     JOIN products p ON p.id = l.product_id
     WHERE l.redeemed_by IS NOT NULL OR l.status = 'REDEEMED'
     ORDER BY l.redeemed_at DESC NULLS LAST, l.created_at DESC
     LIMIT $1`,
    [limit]
  );
  return rows;
}

export async function getLoginLogs(limit = 100) {
  await ready();
  const { rows } = await pool().query(
    `SELECT c.id, c.email as actor_email, c.name as customer_name, c.image as customer_image,
            c.status as customer_status, c.last_login_at as created_at, 'Google OAuth' as auth_method
     FROM customers c
     WHERE c.last_login_at IS NOT NULL
     ORDER BY c.last_login_at DESC
     LIMIT $1`,
    [limit]
  );
  return rows;
}

export async function sendCustomerMessage(
  customerEmail: string,
  subject: string,
  message: string,
  actorEmail: string
) {
  await ready();
  await logAudit({
    category: "CUSTOMER",
    action: "CUSTOMER_MESSAGE_SENT",
    actor_email: actorEmail,
    target_type: "customer",
    target_id: customerEmail,
    details: { subject, messageLength: message.length },
  });
  return { ok: true, delivered: true };
}

export async function getDashboardStats() {
  await ready();
  const p = pool();

  const [productsRes, keysRes, customersRes, activationsTodayRes, ordersRes] = await Promise.all([
    p.query(`
      SELECT count(id)::int AS total_products,
             count(id) FILTER (WHERE is_active = true AND is_archived = false)::int AS active_products
      FROM products
    `),
    p.query(`
      SELECT count(id) FILTER (WHERE status = 'AVAILABLE')::int AS available_keys,
             count(id) FILTER (WHERE status = 'REDEEMED')::int AS redeemed_keys,
             count(id) FILTER (WHERE status = 'ISSUED')::int AS issued_keys,
             count(id)::int AS total_keys
      FROM licenses
    `),
    p.query(`
      SELECT count(DISTINCT redeemed_by)::int AS total_customers
      FROM licenses
      WHERE redeemed_by IS NOT NULL
    `),
    p.query(`
      SELECT count(id)::int AS activations_today
      FROM licenses
      WHERE redeemed_at >= date_trunc('day', now())
    `),
    p.query(`
      SELECT count(id)::int AS total_orders,
             count(id) FILTER (WHERE status = 'FULFILLED')::int AS fulfilled_orders,
             count(id) FILTER (WHERE status IN ('PAID', 'PROCESSING'))::int AS pending_orders
      FROM orders
    `),
  ]);

  const recentLogsRes = await p.query(
    `SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 10`
  );

  return {
    products: productsRes.rows[0],
    keys: keysRes.rows[0],
    customers: customersRes.rows[0],
    activationsToday: activationsTodayRes.rows[0].activations_today,
    orders: ordersRes.rows[0],
    recentActivity: recentLogsRes.rows as AuditLog[],
  };
}

// ==========================================
// GUIDES / HELP CENTER
// ==========================================
export async function getGuides(category?: string) {
  await ready();
  const { rows } = await pool().query(
    `SELECT g.*, p.name AS product_name
     FROM guides g
     LEFT JOIN products p ON p.id = g.product_id
     WHERE g.is_published = true
       AND ($1::text IS NULL OR g.category = $1)
     ORDER BY g.sort_order ASC, g.created_at ASC`,
    [category || null]
  );
  return rows as Guide[];
}

export async function adminGuides() {
  await ready();
  const { rows } = await pool().query(
    `SELECT g.*, p.name AS product_name
     FROM guides g
     LEFT JOIN products p ON p.id = g.product_id
     ORDER BY g.sort_order ASC, g.created_at DESC`
  );
  return rows as Guide[];
}

export async function saveGuide(input: {
  id?: string;
  title: string;
  titleEn?: string;
  category: string;
  content: string;
  contentEn?: string;
  productId?: string | null;
  sortOrder?: number;
}) {
  await ready();
  if (input.id) {
    const { rows } = await pool().query(
      `UPDATE guides
       SET title = $2, title_en = $3, category = $4, content = $5, content_en = $6,
           product_id = $7, sort_order = $8
       WHERE id = $1
       RETURNING *`,
      [
        input.id,
        input.title.trim(),
        input.titleEn?.trim() || null,
        input.category.trim(),
        input.content.trim(),
        input.contentEn?.trim() || null,
        input.productId || null,
        input.sortOrder || 0,
      ]
    );
    return rows[0] as Guide;
  } else {
    const { rows } = await pool().query(
      `INSERT INTO guides (id, title, title_en, category, content, content_en, product_id, sort_order)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        randomUUID(),
        input.title.trim(),
        input.titleEn?.trim() || null,
        input.category.trim(),
        input.content.trim(),
        input.contentEn?.trim() || null,
        input.productId || null,
        input.sortOrder || 0,
      ]
    );
    return rows[0] as Guide;
  }
}

export async function deleteGuide(id: string) {
  await ready();
  await pool().query("DELETE FROM guides WHERE id = $1", [id]);
  return true;
}

// ==========================================
// SYSTEM SETTINGS & HEALTH
// ==========================================
export async function getSystemSettings(): Promise<SystemSettings> {
  await ready();
  const { rows } = await pool().query("SELECT key, value FROM system_settings");
  const settings: Record<string, unknown> = {};
  for (const r of rows) settings[r.key] = r.value;
  return {
    site_name: (settings.site_name as string) || "SpooFX Control Space",
    description: (settings.description as string) || "بوابتك الرقمية المتكاملة لإدارة المنتجات والمفاتيح والتراخيص",
    maintenance_mode: Boolean(settings.maintenance_mode),
    maintenance_message: (settings.maintenance_message as string) || "الموقع تحت الصيانة الدورية حالياً.",
    allow_new_activations: settings.allow_new_activations !== false,
    low_stock_threshold: Number(settings.low_stock_threshold) || 5,
  };
}

export async function updateSystemSettings(settings: Partial<SystemSettings>, actorEmail: string) {
  await ready();
  const p = pool();
  for (const [k, v] of Object.entries(settings)) {
    await p.query(
      `INSERT INTO system_settings (key, value, updated_at)
       VALUES ($1, $2, now())
       ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = now()`,
      [k, JSON.stringify(v)]
    );
  }
  await logAudit({
    category: "ADMIN",
    action: "SYSTEM_SETTINGS_UPDATED",
    actor_email: actorEmail,
    details: settings,
  });
  return getSystemSettings();
}
