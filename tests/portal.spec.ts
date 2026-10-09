import { test, expect } from "@playwright/test";
test("login, safe unconfigured state, and theme/language preferences", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "تسجيل الدخول" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "المتابعة باستخدام قوقل" }).click();
  await expect(page.locator(".auth-error")).toContainText("غير متاح");
  await page.getByRole("button", { name: "Switch to English" }).click();
  await expect(
    page.getByRole("heading", { name: "Welcome back" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Toggle theme" }).click();
  await expect(page.locator("[data-theme]").first()).toHaveAttribute(
    "data-theme",
    "light",
  );
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("dir", "ltr");
  await expect(page.locator("[data-theme]").first()).toHaveAttribute(
    "data-theme",
    "light",
  );
  expect(errors).toEqual([]);
});
test("private portal redirects without a session", async ({ request }) => {
  const response = await request.get("/portal", { maxRedirects: 0 });
  expect([303, 307]).toContain(response.status());
  expect(response.headers().location).toBe("/");
  const status = await request.get("/api/auth-status");
  expect(await status.json()).toEqual({ configured: false });
  const auth = await request.get("/api/auth/providers");
  expect(auth.status()).toBe(503);
});
test("all preview menus, product search, and activation do not submit data", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/preview");
  const nav = page
    .getByRole("navigation", { name: "القائمة الرئيسية" })
    .first();
  await nav.getByRole("button", { name: "منتجاتي", exact: true }).click();
  await page.getByRole("textbox", { name: "ابحث عن منتج" }).fill("الخامات");
  await expect(page.locator(".product")).toHaveCount(1);
  await page
    .getByRole("textbox", { name: "ابحث عن منتج" })
    .fill("missing-item");
  await expect(
    page.getByRole("heading", { name: "لا توجد نتائج" }),
  ).toBeVisible();
  await nav.getByRole("button", { name: "تفعيل مفتاح", exact: true }).click();
  const posts: string[] = [];
  page.on("request", (r) => {
    if (r.method() === "POST") posts.push(r.url());
  });
  await page
    .getByLabel("مفتاح الترخيص", { exact: true })
    .fill("SAMPLE-NOT-A-LICENSE");
  await page
    .getByRole("button", { name: "تفعيل المفتاح", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("لم يتم إرسال");
  expect(posts).toEqual([]);
  await nav.getByRole("button", { name: "مركز المساعدة", exact: true }).click();
  await page.locator("summary").filter({ hasText: "كيف أسجّل دخولي؟" }).click();
  await expect(page.locator("details[open]")).toContainText("اختر المتابعة");
  await nav.getByRole("button", { name: "الملف الشخصي", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "تفضيلات الواجهة" }),
  ).toBeVisible();
  await nav.getByRole("button", { name: "لوحة الإدارة", exact: true }).click();
  for (const name of [
    "المنتجات والمخزون",
    "العملاء",
    "مركز المساعدة",
    "تحديثات الموقع",
    "طلبات الريست",
    "سجل النشاط",
  ]) {
    const tab = page
      .locator(".admin-tabs")
      .getByRole("button", { name, exact: true });
    await tab.click();
    await expect(tab).toHaveAttribute("aria-pressed", "true");
  }
  await page.getByRole("button", { name: "طي القائمة" }).click();
  await page.getByRole("button", { name: "إظهار القائمة" }).click();
  expect(errors).toEqual([]);
});
test("mobile navigation closes with Escape and remains in the viewport", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/preview");
  const trigger = page.getByRole("button", { name: "فتح القائمة" });
  await trigger.click();
  const drawer = page.getByRole("dialog", { name: "القائمة الرئيسية" });
  await expect(drawer).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(trigger).toBeFocused();
  await expect(trigger).toHaveAttribute("aria-expanded", "false");
  await trigger.click();
  await drawer.getByRole("button", { name: "منتجاتي", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "منتجاتي", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "المتابعة باستخدام قوقل" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
test("desktop and mobile screenshots and no unexpected external requests", async ({
  page,
}) => {
  const external: string[] = [];
  page.on("request", (r) => {
    if (
      !r.url().startsWith("http://localhost:3100") &&
      !r.url().startsWith("data:")
    )
      external.push(r.url());
  });
  await page.goto("/");
  await page.evaluate(() => document.fonts.ready);
  expect(
    await page.evaluate(() => document.styleSheets.length),
  ).toBeGreaterThan(0);
  await page.screenshot({
    path: "test-results/login-desktop.png",
    fullPage: true,
    animations: "disabled",
  });
  await page.goto("/preview");
  await expect(page.locator(".product")).toHaveCount(3);
  await expect(page.locator(".portal-shell")).toHaveCSS("display", "flex");
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({
    path: "test-results/portal-desktop.png",
    fullPage: true,
    animations: "disabled",
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: "test-results/portal-mobile.png",
    fullPage: true,
    animations: "disabled",
  });
  expect(external).toEqual([]);
});
test("Google provider produces a protected OAuth authorization request", async ({
  playwright,
}) => {
  const request = await playwright.request.newContext({
    baseURL: "http://localhost:3101",
  });
  try {
    const status = await request.get("/api/auth-status");
    expect(await status.json()).toEqual({ configured: true });
    const providers = await request.get("/api/auth/providers");
    expect(Object.keys(await providers.json())).toEqual(["google"]);
    const csrf = await request.get("/api/auth/csrf");
    const { csrfToken } = await csrf.json();
    expect(csrfToken).toBeTruthy();
    const signin = await request.post("/api/auth/signin/google", {
      form: {
        csrfToken,
        callbackUrl: "http://localhost:3101/portal",
        json: "true",
      },
    });
    expect(signin.ok()).toBe(true);
    const { url } = await signin.json();
    const oauth = new URL(url);
    expect(oauth.hostname).toBe("accounts.google.com");
    expect(oauth.searchParams.get("redirect_uri")).toBe(
      "http://localhost:3101/api/auth/callback/google",
    );
    expect(oauth.searchParams.get("state")).toBeTruthy();
    expect(oauth.searchParams.get("code_challenge")).toBeTruthy();
    expect(oauth.searchParams.get("code_challenge_method")).toBe("S256");
    const privatePage = await request.get("/portal", { maxRedirects: 0 });
    expect([303, 307]).toContain(privatePage.status());
    const session = await request.get("/api/auth/session");
    expect(await session.json()).toEqual({});
  } finally {
    await request.dispose();
  }
});
