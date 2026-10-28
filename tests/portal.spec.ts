import { test, expect, type Page } from "@playwright/test";
async function navigateTo(page: Page, name: string) {
  const menu = page.getByRole("button", { name: "فتح القائمة", exact: true });
  if (await menu.isVisible()) await menu.click();
  await page.locator(".image2-nav-links").getByRole("button", { name, exact: true }).click();
}


test("login is clear when Google is not configured", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "تسجيل الدخول" })).toBeVisible();
  await expect(page.getByRole("link", { name: "معاينة البوابة" })).toHaveCount(0);
  await page.getByRole("button", { name: "تسجيل الدخول" }).click();
  await expect(page.locator(".auth-error")).toContainText("غير متاح");
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
  for (const action of [
    "redeem",
    "createProduct",
    "updateProduct",
    "generateKeys",
    "requestKeyReset",
    "dismissNotification",
    "reviewKeyReset",
  ]) {
    const write = await request.post("/api/portal", { data: { action } });
    expect(write.status()).toBe(401);
  }
  const status = await request.get("/api/auth-status");
  expect(await status.json()).toEqual({ configured: false });
  const health = await request.get("/api/health");
  expect(health.status()).toBe(503);
  expect(await health.json()).toEqual({ status: "unavailable" });
});

test("mobile login fits the screen", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.getByRole("button", { name: "تسجيل الدخول" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("saved dark theme renders on client", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("abood.theme", "dark"));
  await page.goto("/");
  const bg = await page.locator("div[data-theme='dark']").first().evaluate((el) => {
    return window.getComputedStyle(el).backgroundColor;
  });
  expect(bg).toContain("rgb(8, 11, 18)");
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

test("parseRawKeyList correctly parses multiline, comma, numbered, and prefixed keys", async () => {
  const { parseRawKeyList } = await import("../lib/key-utils");
  const input = `
    1- KEY-AAAA-1111
    2. KEY-BBBB-2222, KEY-CCCC-3333; KEY-DDDD-4444
    كود: KEY-EEEE-5555
    "KEY-FFFF-6666"
  `;
  const result = parseRawKeyList(input);
  expect(result).toEqual([
    "KEY-AAAA-1111",
    "KEY-BBBB-2222",
    "KEY-CCCC-3333",
    "KEY-DDDD-4444",
    "KEY-EEEE-5555",
    "KEY-FFFF-6666",
  ]);
});



test("login preferences persist with a dark Arabic default", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.getByRole("button", { name: "الوضع الفاتح", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.getByRole("button", { name: "الوضع الداكن", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.getByRole("button", { name: "Switch to English", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("dir", "ltr");
  await expect(page.getByRole("heading", { name: "Welcome back", exact: true })).toBeVisible();
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
});


test("portal stays open and responsive across themes and languages", async ({ browser }) => {
  const { encode } = await import("next-auth/jwt");
  const token = await encode({ secret: "local-playwright-session-secret-not-for-production", token: { name: "Test Customer", email: "customer@example.invalid", sub: "local-ui-test" } });
  const context = await browser.newContext();
  await context.addInitScript(() => localStorage.setItem("abood.theme", "light"));
  await context.addCookies([{ name: "next-auth.session-token", value: token, domain: "localhost", path: "/" }]);
  const page = await context.newPage();
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.route("**/api/portal", route => route.fulfill({ json: { products: [], inventory: [], guides: [], isAdmin: false } }));
  await page.goto("http://localhost:3101/portal");
  await expect(page.locator(".image2-portal-shell")).toBeVisible();
  for (const width of [1600, 1280, 820, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await navigateTo(page, "حسابي");
    await expect(page.locator(".luxe-card").first()).toHaveCSS("background-color", "rgb(255, 255, 255)");
    await expect(page.locator(".luxe-user-name")).toHaveCSS("color", "rgb(21, 38, 62)");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.getByRole("button", { name: "تغيير المظهر", exact: true }).click();
    await expect(page.locator(".image2-portal-shell")).toHaveAttribute("data-theme", "dark");
    await page.locator(".image2-nav-actions .lang-pill").click();
    await expect(page.locator("html")).toHaveAttribute("dir", "ltr");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.locator(".image2-nav-actions .lang-pill").click();
    await page.getByRole("button", { name: "تغيير المظهر", exact: true }).click();
    for (const name of ["تفعيل مفتاح", "منتجاتي", "مركز المساعدة", "الرئيسية"]) {
      await navigateTo(page, name);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    }
  }
  expect(errors).toEqual([]);
  await context.close();
});

test("product guide opens local media and article library", async ({ browser, request }) => {
  const { encode } = await import("next-auth/jwt");
  const token = await encode({ secret: "local-playwright-session-secret-not-for-production", token: { name: "Test Customer", email: "customer@example.invalid", sub: "local-guide-test" } });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await context.addCookies([{ name: "next-auth.session-token", value: token, domain: "localhost", path: "/" }]);
  const page = await context.newPage();
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.route("**/api/portal", route => route.fulfill({ json: { products: [{ id: "ui-guide-fixture", name: "SpooFX", instructions: JSON.stringify({sku:"INTERNAL-METADATA-ONLY",version:"",stockType:"digital_keys"}), files: [], license_key: "TEST-ONLY" }], inventory: [], guides: [], isAdmin: false } }));
  await page.goto("http://localhost:3101/portal");
  await navigateTo(page, "منتجاتي");
  await expect(page.locator(".workspace-nav-links [aria-current='page']")).toHaveCount(1);
  await page.getByRole("button", { name: "دليل المنتج", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByText("INTERNAL-METADATA-ONLY", {exact:false})).toHaveCount(0);
  await expect(page.getByRole("button", {name:"تحميل المنتج",exact:true})).toHaveCount(0);
  await expect(page.getByRole("button", {name:"تصفح الشروحات",exact:true})).toHaveCount(0);
  await page.getByRole("button", { name: "تشغيل شرح شرح المنتج الأساسي", exact: true }).click();
  await expect(page.locator("video")).toHaveAttribute("src", "/videos/product-guide-1016.mp4");
  await page.getByRole("button", { name: "الشروحات", exact: true }).click();
  await page.getByRole("button", { name: /مشكلة الشبكة أو إيقاف Wi-Fi/ }).click();
  await page.getByRole("button", { name: /تشغيل شرح/ }).click();
  await expect(page.locator("video")).toHaveAttribute("src", "/guides/network-error-fix.mp4");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: "../../outputs/guide-mobile.png", fullPage: true });
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  for (const path of ["/videos/product-guide-1016.mp4", "/guides/network-error-fix.mp4", "/guides/wrp-guide.mp4"]) {
    const response = await request.get(path, { headers: { Range: "bytes=0-31" } });
    expect(response.status()).toBe(206);
    expect(response.headers()["content-type"]).toContain("video/mp4");
  }
  expect(errors).toEqual([]);
  await context.close();
});

test("opening intro clears automatically and repeats on refresh without adding login fields",async({page})=>{
 await page.goto("/");await expect(page.locator("[data-startup-splash]")).toBeVisible();await expect(page.locator("[data-startup-splash]")).toHaveCount(0,{timeout:4000});
 await expect(page.getByRole("button",{name:"تسجيل الدخول",exact:true})).toBeVisible();await expect(page.locator("input")).toHaveCount(0);
 await page.reload();await expect(page.locator("[data-startup-splash]")).toBeVisible();await expect(page.locator("[data-startup-splash]")).toHaveCount(0,{timeout:4000});
});
