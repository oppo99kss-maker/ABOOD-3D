"use client";
import { useEffect, useRef, useState } from "react";
import { Globe, House, KeyRound, LifeBuoy, LogOut, Menu, Moon, Package, ShieldCheck, Sun, UserRound, X } from "lucide-react";
import type { PortalTab } from "./portal-navigation";

type Props = { activeTab: PortalTab; onNavigate: (tab: PortalTab) => void; lang: "ar" | "en"; isDark: boolean; isAdmin: boolean; user: {name: string; image?: string | null}; onToggleTheme: () => void; onToggleLanguage: () => void; onLogout: () => void };
export function WorkspaceNavigation({activeTab,onNavigate,lang,isDark,isAdmin,user,onToggleTheme,onToggleLanguage,onLogout}: Props) {
  const ar = lang === "ar";
  const [open,setOpen] = useState(false);
  const sheet = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const t = (a:string,e:string) => ar ? a : e;
  const items = [
    {id:"overview", label:t("الرئيسية","Overview"), icon:House},
    {id:"redeem", label:t("تفعيل مفتاح","Activate Key"), icon:KeyRound},
    {id:"my-products", label:t("منتجاتي","My Products"), icon:Package},
    {id:"tickets", label:t("مركز المساعدة","Help Center"), icon:LifeBuoy},
    {id:"profile", label:t("حسابي","My Account"), icon:UserRound},
    ...(isAdmin ? [{id:"admin",label:t("الإدارة","Admin"),icon:ShieldCheck}] : []),
  ];
  useEffect(() => {
    if (!open) return;
    const node = sheet.current;
    const overflow = document.body.style.overflow;
    node?.showModal(); document.body.style.overflow = "hidden";
    const resize = () => { if (window.innerWidth > 900) setOpen(false); };
    const keepFocus = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return;
      const controls = Array.from(node?.querySelectorAll<HTMLButtonElement>("button:not(:disabled)") || []);
      const first = controls[0], last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    node?.addEventListener("keydown",keepFocus);
    window.addEventListener("resize",resize);
    return () => { node?.removeEventListener("keydown",keepFocus); node?.close(); document.body.style.overflow = overflow; window.removeEventListener("resize",resize); trigger.current?.focus(); };
  },[open]);
  const navigate = (tab:PortalTab) => { onNavigate(tab); setOpen(false); };
  const links = () => items.map(({id,label,icon:Icon}) => <button key={id} type="button" className={`workspace-nav-link ${activeTab === id ? "active" : ""}`} aria-current={activeTab === id ? "page" : undefined} onClick={() => navigate(id as PortalTab)}><Icon size={18} aria-hidden="true"/><span>{label}</span></button>);
  return <header className="workspace-header">
    <div className="workspace-header-inner">
      <button className="workspace-brand" type="button" onClick={() => navigate("overview")} aria-label="SpooFx"><img src="/logo.png" width="38" height="38" alt=""/><strong dir="ltr">Spoo<span>Fx</span></strong></button>
      <nav className="workspace-nav-links image2-nav-links" aria-label={t("التنقل الرئيسي","Main navigation")}>{links()}</nav>
      <div className="workspace-controls image2-nav-actions">
        <button className="workspace-icon" type="button" aria-label="Toggle theme" title={isDark?t("الوضع الفاتح","Light mode"):t("الوضع الداكن","Dark mode")} onClick={onToggleTheme}>{isDark?<Sun size={18}/>:<Moon size={18}/>}</button>
        <button className="workspace-icon lang-pill" type="button" aria-label={ar?"Switch to English":"التبديل للعربية"} onClick={onToggleLanguage}><Globe size={16}/><span>{ar?"EN":"عربي"}</span></button>
        <button className="workspace-user" type="button" onClick={() => navigate("profile")} title={user.name} aria-label={t("فتح حسابي","Open account")}>{user.image?<img src={user.image} alt="" referrerPolicy="no-referrer"/>:<span>{user.name.slice(0,1).toUpperCase()}</span>}</button>
        <button className="workspace-icon workspace-signout" type="button" onClick={onLogout} aria-label={t("تسجيل الخروج","Sign out")} title={t("تسجيل الخروج","Sign out")}><LogOut size={17}/></button>
        <button ref={trigger} className="workspace-icon workspace-menu-trigger" type="button" aria-label={t("فتح القائمة","Open menu")} aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen(true)}><Menu size={20}/></button>
      </div>
    </div>
    {open && <dialog ref={sheet} className="workspace-mobile-sheet" aria-label={t("قائمة التنقل","Navigation menu")} onCancel={() => setOpen(false)} onClose={() => setOpen(false)} onClick={e=>{if(e.target===e.currentTarget)setOpen(false);}} dir={ar?"rtl":"ltr"}>
      <div className="workspace-sheet-header"><strong>SpooFx</strong><button className="workspace-icon" type="button" onClick={() => setOpen(false)} aria-label={t("إغلاق القائمة","Close menu")}><X size={20}/></button></div>
      <nav className="image2-nav-links" aria-label={t("أقسام الموقع","Site sections")}>{links()}</nav>
      <button className="workspace-sheet-logout" type="button" onClick={onLogout}><LogOut size={18}/>{t("تسجيل الخروج","Sign out")}</button>
    </dialog>}
  </header>;
}
