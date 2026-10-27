import { test, expect, type Page, type Browser } from "@playwright/test";
import { encode } from "next-auth/jwt";

const secret = "local-playwright-session-secret-not-for-production";
const product = { id:"11111111-1111-4111-8111-111111111111",name:"SpooFx Permanent",description:"تعليمات وملفات ترخيص المنتج",category:"Permanent",image_url:null,access_url:null,instructions:"تعليمات المنتج",files:[],default_duration_days:30,is_visible:true,is_active:true,is_archived:false,created_at:"2026-01-01T00:00:00Z",license_key:"TEST-ONLY-KEY",license_status:"ACTIVE" };
const settings = {site_name:"SpooFx",description:"",maintenance_mode:false,maintenance_message:"",allow_new_activations:true,low_stock_threshold:5};
async function session(browser: Browser, width=1440) {
 const context=await browser.newContext({viewport:{width,height:1000}});
 await context.addCookies([{name:"next-auth.session-token",value:await encode({secret,token:{name:"Workspace Test",email:"workspace@example.invalid",sub:"workspace-test"}}),domain:"localhost",path:"/"}]);
 return {context,page:await context.newPage()};
}
async function navigate(page:Page,name:string) { const trigger=page.getByRole("button",{name:"فتح القائمة",exact:true}); if(await trigger.isVisible())await trigger.click();await page.locator(".image2-nav-links").getByRole("button",{name,exact:true}).click(); }
async function noOverflow(page:Page) { expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true); }

test("authenticated customer cannot invoke administrative server actions",async({browser})=>{
 const {context}=await session(browser);
 for(const action of ["createProduct","updateProduct","deleteProduct","generateKeys","importKeys","updateSettings","reviewKeyReset","deleteKey","createCompensation"]) {
  const response=await context.request.post("http://localhost:3101/api/portal",{data:{action}});
  expect(response.status()).toBe(403);expect((await response.json()).error).toBe("FORBIDDEN");
 }
 await context.close();
});

test("activation form sends existing payload, blocks duplicate submits and reports outcomes",async({browser})=>{
 const {context,page}=await session(browser,390);let activated=false;let writes=0;const codes:string[]=[];
 await page.route("**/api/portal",async route=>{
  if(route.request().method()==="GET")return route.fulfill({json:{products:activated?[product]:[],isAdmin:false,settings}});
  const data=route.request().postDataJSON();expect(data.action).toBe("redeem");codes.push(data.code);writes++;
  await new Promise(resolve=>setTimeout(resolve,300));
  if(data.code==="INVALID-TEST")return route.fulfill({status:400,json:{success:false,code:"KEY_NOT_FOUND"}});
  activated=true;return route.fulfill({json:{success:true,code:"SUCCESS",product}});
 });
 await page.goto("http://localhost:3101/portal");await navigate(page,"تفعيل مفتاح");
 const input=page.getByLabel("رمز مفتاح الترخيص");const submit=page.getByRole("button",{name:"تفعيل المفتاح",exact:true});
 await expect(submit).toBeDisabled();await input.fill("INVALID-TEST");await submit.click();await expect(submit).toBeDisabled();
 await expect(page.locator(".spoo-toast-card.error")).toContainText("غير موجود");await expect(page.locator(".spoo-toast-card.success")).toHaveCount(0);
 await expect(submit).toBeEnabled();await input.fill("VALID-TEST-KEY");await input.press("Enter");await expect(page.locator(".spoo-toast-card.success")).toContainText("تم التفعيل");
 expect(writes).toBe(2);expect(codes).toEqual(["INVALID-TEST","VALID-TEST-KEY"]);await expect(input).toHaveValue("");
 await navigate(page,"منتجاتي");await expect(page.locator(".real-product")).toHaveCount(1);await noOverflow(page);await context.close();
});

test("product library is bounded, searchable and accessible across screen sizes",async({browser})=>{
 const {context,page}=await session(browser);const products=Array.from({length:4},(_,i)=>({...product,id:`test-product-${i}`,name:`SpooFx Product ${i+1}`}));
 await page.route("**/api/portal",route=>route.fulfill({json:{products,settings,isAdmin:false}}));await page.goto("http://localhost:3101/portal");await navigate(page,"منتجاتي");
 for(const width of [1600,1280,820,390]){await page.setViewportSize({width,height:1000});await noOverflow(page);const box=await page.locator(".real-product").first().boundingBox();expect(box!.width).toBeLessThan(421);}
 await page.getByLabel("ابحث في منتجاتك").fill("Product 2");await expect(page.locator(".real-product")).toHaveCount(1);
 await page.getByRole("button",{name:"التفاصيل",exact:true}).click();await expect(page.getByRole("dialog")).toBeVisible();await page.keyboard.press("Escape");await expect(page.getByRole("dialog")).toHaveCount(0);
 await expect(page.getByRole("button",{name:"التفاصيل",exact:true})).toBeFocused();
 await page.getByLabel("ابحث في منتجاتك").fill("not-found");await expect(page.getByText("لا توجد نتائج مطابقة",{exact:true})).toBeVisible();
 await context.close();
});

test("mobile navigation traps focus, closes with Escape and logs out through NextAuth",async({browser})=>{
 const {context,page}=await session(browser,390);await page.route("**/api/portal",route=>route.fulfill({json:{products:[],settings,isAdmin:false}}));await page.goto("http://localhost:3101/portal");
 await page.getByRole("button",{name:"فتح القائمة",exact:true}).click();await expect(page.getByRole("dialog")).toBeVisible();
 await expect(page.getByRole("button",{name:"الإدارة",exact:true})).toHaveCount(0);
 await page.keyboard.press("Shift+Tab");expect(await page.evaluate(()=>!!document.activeElement?.closest('dialog'))).toBe(true);
 await page.keyboard.press("Escape");await expect(page.getByRole("dialog")).toHaveCount(0);await expect(page.getByRole("button",{name:"فتح القائمة",exact:true})).toBeFocused();
 await page.getByRole("button",{name:"فتح القائمة",exact:true}).click();await page.locator(".workspace-sheet-logout").click();await expect(page).toHaveURL("http://localhost:3101/");
 expect(await (await context.request.get("http://localhost:3101/api/auth/session")).json()).toEqual({});await context.close();
});

test("all admin sections remain navigable with a collapsible sidebar in both themes",async({browser})=>{
 const {context,page}=await session(browser);const errors:string[]=[];page.on("pageerror",e=>errors.push(e.message));
 await page.route("**/api/portal*",route=>{
  const view=new URL(route.request().url()).searchParams.get("view");
  if(view==="admin-customers")return route.fulfill({json:{customers:[{id:"test-customer",name:"Customer with a long display name",email:"long-customer@example.invalid",status:"ACTIVE",products_count:2,active_licenses:1,orders_count:1,created_at:"2026-01-01T00:00:00Z",last_login_at:"2026-01-01T00:00:00Z"}],total:1}});
  if(view==="admin-inventory")return route.fulfill({json:{keys:[]}});
  if(view)return route.fulfill({json:{logs:[{id:"test-log",product_name:"Product",customer_name:"Customer",customer_email:"customer@example.invalid",redeemed_by:"customer@example.invalid",created_at:"2026-01-01T00:00:00Z",redeemed_at:"2026-01-01T00:00:00Z",login_at:"2026-01-01T00:00:00Z",status:"SUCCESS"}],orders:[],compensations:[]}});
  return route.fulfill({json:{products:[product],allProducts:[product],inventory:[product],settings,isAdmin:true,orders:[],allGuides:[],resetRequests:[],dashboardStats:{products:{total_products:1,active_products:1},keys:{total_keys:0,available_keys:0,redeemed_keys:0},customers:{total_customers:0}}}});
 });
 await page.goto("http://localhost:3101/portal");await navigate(page,"الإدارة");await expect(page.locator(".saas-admin")).toBeVisible();
 for(const width of [1440,820,390]){
  await page.setViewportSize({width,height:1000});
  for(const name of ["نظرة عامة","المنتجات","المخزون","العملاء","الطلبات","السجلات","الإعدادات"]){await page.locator(".admin-ref-nav-track").getByRole("button",{name,exact:false}).click();await noOverflow(page);}
  await page.getByRole("button",{name:"طي أقسام الإدارة",exact:true}).click();await expect(page.locator(".saas-admin")).toHaveClass(/admin-collapsed/);await page.getByRole("button",{name:"توسيع أقسام الإدارة",exact:true}).click();
 }
 await page.locator(".admin-ref-nav-track").getByRole("button",{name:"المنتجات",exact:false}).click();await page.getByRole("button",{name:"إضافة منتج جديد",exact:true}).click();await expect(page.getByRole("dialog")).toBeVisible();await page.keyboard.press("Escape");await expect(page.getByRole("dialog")).toHaveCount(0);
 await page.getByRole("button",{name:"Toggle theme",exact:true}).click();await expect(page.locator(".admin-workspace")).toHaveAttribute("data-theme","light");await noOverflow(page);
 await page.locator(".workspace-controls .lang-pill").click();await expect(page.locator("html")).toHaveAttribute("dir","ltr");await noOverflow(page);
 expect(errors).toEqual([]);await context.close();
});
