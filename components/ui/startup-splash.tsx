"use client";
import { useEffect, useState } from "react";
import css from "./startup-splash.module.css";
/** Brief decorative intro; it does not represent network or authentication progress. */
export function StartupSplash() {
 const [visible,setVisible]=useState(true);
 const [english,setEnglish]=useState(false);
 useEffect(()=>{try{setEnglish(localStorage.getItem("abood.language")==="en");}catch{}const timer=window.setTimeout(()=>setVisible(false),2000);return()=>window.clearTimeout(timer);},[]);
 if(!visible)return null;
 return <div className={css.splash} data-startup-splash role="status" aria-live="polite" aria-label={english?"Welcome to SpooFx":"أهلًا بك في SpooFx"}><div className={css.content}><div className={css.scene} dir="ltr" aria-hidden="true"><div className={css.trails}><span/><span/><span/><span/></div><div className={css.speeder}><span><span/><span/><span/><span/></span><div className={css.base}><span/><div className={css.face}/></div></div></div><strong dir="ltr">Spoo<span>Fx</span></strong><p>{english?"Your digital workspace":"مساحتك الرقمية"}</p></div></div>;
}
