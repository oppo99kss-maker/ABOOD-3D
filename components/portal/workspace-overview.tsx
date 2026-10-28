"use client";
import { ArrowLeft, ArrowRight, ArrowUpRight, CircleHelp, KeyRound, LifeBuoy, Package, ShieldCheck, ShoppingBag, UserRound } from "lucide-react";
import { SupportContact } from "./support-contact";
import type { PortalTab } from "./portal-navigation";
type Props = { user:{name:string;email:string;image?:string|null}; ar:boolean; activeCount:number; totalCount:number; isAdmin:boolean; storeUrl:string; onNavigate:(tab:PortalTab)=>void };
export function WorkspaceOverview({user,ar,activeCount,totalCount,isAdmin,storeUrl,onNavigate}:Props) {
 const t=(a:string,e:string)=>ar?a:e; const Arrow=ar?ArrowLeft:ArrowRight;
 return <div className="workspace-overview">
  <section className="workspace-welcome">
   <div className="workspace-welcome-copy"><h1>{t("مرحبًا،","Welcome,")} <span>{user.name}</span></h1><div className="workspace-welcome-actions"><button className="primary-button" onClick={()=>onNavigate("redeem")}><KeyRound size={17}/>{t("تفعيل مفتاح","Activate Key")}</button><button className="secondary-button" onClick={()=>onNavigate("my-products")}>{t("فتح مكتبتي","Open library")}<Arrow size={17}/></button></div></div>
   <button className="workspace-identity" onClick={()=>onNavigate("profile")} aria-label={t("عرض الحساب","View account")}>{user.image?<img src={user.image} alt="" referrerPolicy="no-referrer"/>:<span className="workspace-avatar-initial">{user.name.slice(0,1).toUpperCase()}</span>}<strong>{user.name}</strong><span dir="ltr">{user.email}</span><small><ShieldCheck size={14}/>{t("تم تسجيل الدخول عبر Google","Signed in with Google")}</small></button>
  </section>
  <div className="workspace-metrics">
   {[{icon:Package,label:t("منتجات نشطة","Active products"),value:activeCount},{icon:KeyRound,label:t("منتجات المكتبة","Library products"),value:totalCount},{icon:isAdmin?ShieldCheck:UserRound,label:t("صلاحية الحساب","Account access"),value:isAdmin?t("إدارة","Admin"):t("عميل","Customer")}].map(({icon:Icon,label,value})=><article className="workspace-metric" key={label}><div><span>{label}</span><Icon size={19}/></div><strong>{value}</strong></article>)}
  </div>
  <section className="workspace-quick"><div className="workspace-section-heading"><div><h2>{t("الإجراءات السريعة","Quick actions")}</h2></div></div><div className="workspace-quick-grid"><button onClick={()=>onNavigate("redeem")}><span className="workspace-action-icon"><KeyRound size={21}/></span><strong>{t("تفعيل مفتاح","Activate Key")}</strong><Arrow size={17}/></button><a href={storeUrl} target="_blank" rel="noopener noreferrer"><span className="workspace-action-icon"><ShoppingBag size={21}/></span><strong>{t("المتجر","Store")}</strong><ArrowUpRight size={17}/></a><a href="https://deluxe-concha-dfded1.netlify.app/#board" target="_blank" rel="noopener noreferrer"><span className="workspace-action-icon"><CircleHelp size={21}/></span><strong>{t("لم أفهم","Need guidance?")}</strong><ArrowUpRight size={17}/></a><button onClick={()=>onNavigate("tickets")}><span className="workspace-action-icon"><LifeBuoy size={21}/></span><strong>{t("مركز المساعدة","Help Center")}</strong><Arrow size={17}/></button></div></section>
  <SupportContact ar={ar} />
 </div>;
}
