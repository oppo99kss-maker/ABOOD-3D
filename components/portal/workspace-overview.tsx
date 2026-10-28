"use client";
import { ArrowLeft, ArrowRight, ArrowUpRight, KeyRound, LifeBuoy, Package, ShieldCheck, ShoppingBag, UserRound } from "lucide-react";
import { SupportContact } from "./support-contact";
import type { PortalTab } from "./portal-navigation";
type Props = { user:{name:string;email:string;image?:string|null}; ar:boolean; activeCount:number; totalCount:number; isAdmin:boolean; storeUrl:string; onNavigate:(tab:PortalTab)=>void };
export function WorkspaceOverview({user,ar,activeCount,totalCount,isAdmin,storeUrl,onNavigate}:Props) {
 const t=(a:string,e:string)=>ar?a:e; const Arrow=ar?ArrowLeft:ArrowRight;
 return <div className="workspace-overview">
  <section className="workspace-welcome">
   <div className="workspace-welcome-copy"><p className="workspace-eyebrow">{t("مساحتك الرقمية","YOUR DIGITAL WORKSPACE")}</p><h1>{t("مرحبًا،","Welcome,")} <span>{user.name}</span></h1><p>{t("منتجاتك وتراخيصك وشروحاتك، في مكان واحد.","Your products, licenses and guides, all in one place.")}</p><div className="workspace-welcome-actions"><button className="primary-button" onClick={()=>onNavigate("redeem")}><KeyRound size={17}/>{t("تفعيل مفتاح","Activate Key")}</button><button className="secondary-button" onClick={()=>onNavigate("my-products")}>{t("فتح مكتبتي","Open library")}<Arrow size={17}/></button></div></div>
   <button className="workspace-identity" onClick={()=>onNavigate("profile")} aria-label={t("عرض الحساب","View account")}>{user.image?<img src={user.image} alt="" referrerPolicy="no-referrer"/>:<span className="workspace-avatar-initial">{user.name.slice(0,1).toUpperCase()}</span>}<strong>{user.name}</strong><span dir="ltr">{user.email}</span><small><ShieldCheck size={14}/>{t("تم تسجيل الدخول عبر Google","Signed in with Google")}</small></button>
  </section>
  <div className="workspace-metrics">
   {[{icon:Package,label:t("منتجات نشطة","Active products"),value:activeCount,note:t("تراخيص متاحة في مكتبتك","Available in your library")},{icon:KeyRound,label:t("منتجات المكتبة","Library products"),value:totalCount,note:t("المنتجات المرتبطة بحسابك","Products linked to your account")},{icon:isAdmin?ShieldCheck:UserRound,label:t("صلاحية الحساب","Account access"),value:isAdmin?t("إدارة","Admin"):t("عميل","Customer"),note:t("حسب صلاحيات حسابك الحالية","Based on your current account permissions")}].map(({icon:Icon,label,value,note})=><article className="workspace-metric" key={label}><div><span>{label}</span><Icon size={19}/></div><strong>{value}</strong><p>{note}</p></article>)}
  </div>
  <section className="workspace-quick"><div className="workspace-section-heading"><div><p className="workspace-eyebrow">{t("اختصاراتك","QUICK ACCESS")}</p><h2>{t("كل ما تحتاجه، أقرب إليك","Everything you need, closer")}</h2></div></div><div className="workspace-quick-grid"><button onClick={()=>onNavigate("redeem")}><span className="workspace-action-icon"><KeyRound size={21}/></span><strong>{t("تفعيل مفتاح","Activate Key")}</strong><span>{t("أضف منتجًا إلى مكتبتك","Add a product to your library")}</span><Arrow size={17}/></button><a href={storeUrl} target="_blank" rel="noopener noreferrer"><span className="workspace-action-icon"><ShoppingBag size={21}/></span><strong>{t("المتجر","Store")}</strong><span>{t("تصفح منتجات SpooFx","Explore SpooFx products")}</span><ArrowUpRight size={17}/></a><button onClick={()=>onNavigate("tickets")}><span className="workspace-action-icon"><LifeBuoy size={21}/></span><strong>{t("مركز المساعدة","Help Center")}</strong><span>{t("الشروحات وحلول المشكلات","Guides and troubleshooting")}</span><Arrow size={17}/></button></div></section>
  <SupportContact ar={ar} />
 </div>;
}
