import { test, expect } from "@playwright/test";

test("login is clear when Google is not configured; preferences persist", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "تسجيل الدخول" })).toBeVisible();
  await expect(page.getByRole("link", { name: "معاينة البوابة" })).toHaveCount(0);
  await page.getByRole("button", { name: "تسجيل الدخول" }).click();
  await expect(page.locator(".auth-error")).toContainText("غير متاح");
  await page.getByRole("button", { name: "Switch to English" }).click();
  await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();
  await page.getByRole("button", { name: "Toggle theme" }).click();
  await expect(page.locator("[data-theme]")).toHaveAttribute("data-theme", "light");
  await page.reload();
  await expect(page.locator("[data-theme]")).toHaveAttribute("data-theme", "light");
  await expect(page.locator("html")).toHaveAttribute("dir", "ltr");
  expect(errors).toEqual([]);
});

test("private pages and every data action require a session", async ({ request }) => {
  const portal = await request.get("/portal", { maxRedirects: 0 });
  expect([303, 307]).toContain(portal.status());
  expect(portal.headers().location).toBe("/");
  const preview = await request.get("/preview", { maxRedirects: 0 });
  expect([303, 307]).toContain(preview.status());
  expect(preview.headers().location).toBe("/");
  const read = await request.get("/api/portal");
  expect(read.status()).toBe(401);
  expect(read.headers()["cache-control"]).toContain("no-store");
  for (const action of ["redeem", "createProduct", "updateProduct", "generateKeys"]) {
    const write = await request.post("/api/portal", { data: { action } });
    expect(write.status()).toBe(401);
  }
  const status = await request.get("/api/auth-status");
  expect(await status.json()).toEqual({ configured: false });
});

test("mobile login fits the screen", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.getByRole("button", { name: "تسجيل الدخول" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("Google OAuth request uses the site's own callback and PKCE", async ({ playwright }) => {
  const request = await playwright.request.newContext({ baseURL: "http://localhost:3101" });
  try {
    const status = await request.get("/api/auth-status");
    expect(await status.json()).toEqual({ configured: true });
    const providers = await request.get("/api/auth/providers");
    expect(Object.keys(await providers.json())).toEqual(["google"]);
    const csrf = await request.get("/api/auth/csrf");
    const { csrfToken } = await csrf.json();
    const signin = await request.post("/api/auth/signin/google", { form: { csrfToken, callbackUrl: "http://localhost:3101/portal", json: "true" } });
    expect(signin.ok()).toBe(true);
    const { url } = await signin.json();
    const oauth = new URL(url);
    expect(oauth.hostname).toBe("accounts.google.com");
    expect(oauth.searchParams.get("redirect_uri")).toBe("http://localhost:3101/api/auth/callback/google");
    expect(oauth.searchParams.get("state")).toBeTruthy();
    expect(oauth.searchParams.get("code_challenge_method")).toBe("S256");
    const data = await request.get("/api/portal");
    expect(data.status()).toBe(401);
  } finally { await request.dispose(); }
});
