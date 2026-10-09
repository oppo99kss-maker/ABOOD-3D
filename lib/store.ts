import { createHmac, randomBytes, randomUUID } from "node:crypto";
import { Pool } from "pg";

export type Product = {
  id: string;
  name: string;
  description: string;
  access_url: string | null;
  created_at: string;
  available_keys?: number;
  redeemed_keys?: number;
  redeemed_at?: string;
};

const globalStore = globalThis as typeof globalThis & {
  spooPool?: Pool;
  spooSchema?: Promise<void>;
};

function pool() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is missing");
  return (globalStore.spooPool ??= new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 5,
    connectionTimeoutMillis: 5000,
    idleTimeoutMillis: 30000,
  }));
}

async function ready() {
  globalStore.spooSchema ??= (async () => {
    await pool().query(`
      CREATE TABLE IF NOT EXISTS products (
        id uuid PRIMARY KEY,
        name text NOT NULL CHECK (length(name) BETWEEN 1 AND 120),
        description text NOT NULL DEFAULT '',
        access_url text,
        created_at timestamptz NOT NULL DEFAULT now()
      );
      CREATE TABLE IF NOT EXISTS licenses (
        id uuid PRIMARY KEY,
        product_id uuid NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
        code_hash text NOT NULL UNIQUE,
        code_suffix text NOT NULL,
        redeemed_by text,
        redeemed_at timestamptz,
        created_at timestamptz NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS licenses_owner_idx ON licenses (redeemed_by);
      CREATE INDEX IF NOT EXISTS licenses_product_idx ON licenses (product_id);
    `);
  })().catch((error) => {
    globalStore.spooSchema = undefined;
    throw error;
  });
  await globalStore.spooSchema;
}

export async function checkDatabase() {
  await ready();
  await pool().query("SELECT 1");
}

function hashCode(code: string) {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) throw new Error("NEXTAUTH_SECRET is missing");
  return createHmac("sha256", `SpooFX-license-v1:${secret}`)
    .update(code.replace(/[^a-zA-Z0-9]/g, "").toUpperCase())
    .digest("hex");
}

export async function myProducts(email: string): Promise<Product[]> {
  await ready();
  const { rows } = await pool().query(
    `SELECT DISTINCT p.id, p.name, p.description, p.access_url, p.created_at,
      max(l.redeemed_at) AS redeemed_at
     FROM products p JOIN licenses l ON l.product_id = p.id
     WHERE l.redeemed_by = $1
     GROUP BY p.id ORDER BY redeemed_at DESC`,
    [email.toLowerCase()],
  );
  return rows;
}

export async function adminProducts(): Promise<Product[]> {
  await ready();
  const { rows } = await pool().query(
    `SELECT p.id, p.name, p.description, p.access_url, p.created_at,
      count(l.id) FILTER (WHERE l.redeemed_by IS NULL)::int AS available_keys,
      count(l.id) FILTER (WHERE l.redeemed_by IS NOT NULL)::int AS redeemed_keys
     FROM products p LEFT JOIN licenses l ON l.product_id = p.id
     GROUP BY p.id ORDER BY p.created_at DESC`,
  );
  return rows;
}

export async function createProduct(input: {
  name: string;
  description: string;
  accessUrl: string | null;
}) {
  await ready();
  const { rows } = await pool().query(
    `INSERT INTO products (id, name, description, access_url)
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [randomUUID(), input.name, input.description, input.accessUrl],
  );
  return rows[0] as Product;
}

export async function updateProduct(input: {
  id: string;
  name: string;
  description: string;
  accessUrl: string | null;
}) {
  await ready();
  const { rows } = await pool().query(
    `UPDATE products SET name = $2, description = $3, access_url = $4
     WHERE id = $1 RETURNING *`,
    [input.id, input.name, input.description, input.accessUrl],
  );
  return rows[0] as Product | undefined;
}

export async function generateKeys(productId: string, count: number) {
  await ready();
  const client = await pool().connect();
  const keys: string[] = [];
  try {
    await client.query("BEGIN");
    const product = await client.query("SELECT id FROM products WHERE id = $1", [productId]);
    if (!product.rowCount) throw new Error("PRODUCT_NOT_FOUND");
    for (let i = 0; i < count; i++) {
      const raw = randomBytes(15).toString("hex").toUpperCase();
      const key = `SPFX-${raw.match(/.{1,6}/g)!.join("-")}`;
      await client.query(
        `INSERT INTO licenses (id, product_id, code_hash, code_suffix)
         VALUES ($1, $2, $3, $4)`,
        [randomUUID(), productId, hashCode(key), raw.slice(-6)],
      );
      keys.push(key);
    }
    await client.query("COMMIT");
    return keys;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function redeemKey(email: string, code: string) {
  await ready();
  const result = await pool().query(
    `UPDATE licenses SET redeemed_by = $1, redeemed_at = now()
     WHERE code_hash = $2 AND redeemed_by IS NULL
     RETURNING product_id`,
    [email.toLowerCase(), hashCode(code)],
  );
  return result.rowCount === 1;
}
