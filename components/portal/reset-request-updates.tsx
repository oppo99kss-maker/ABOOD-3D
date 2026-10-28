"use client";
import { useState } from "react";
import { CheckCircle2, Clock, RotateCcw, XCircle } from "lucide-react";
import type { KeyResetRequest } from "@/lib/store";
export function ResetRequestUpdates({requests,ar,onRefresh}:{requests:KeyResetRequest[];ar:boolean;onRefresh:()=>Promise<void>}) {
 const [refreshing,setRefreshing]=useState(false);
 if(!requests.length)return null;
 return <section className="reset-updates" aria-labelledby="reset-updates-title">
  <header><div><h2 id="reset-updates-title">{ar?"متابعة طلبات الرستات":"Key reset updates"}</h2><p>{ar?"آخر حالة لطلباتك ورد الإدارة.":"Your latest request status and admin response."}</p></div><button type="button" className="secondary-button" disabled={refreshing} aria-busy={refreshing} onClick={async()=>{setRefreshing(true);try{await onRefresh();}finally{setRefreshing(false);}}}><RotateCcw size={16} className={refreshing?"spin":""}/>{ar?"تحديث الحالة":"Refresh status"}</button></header>
  <div className="reset-updates-list" aria-live="polite">{requests.map(request=>{
   const accepted=request.status==="APPROVED",rejected=request.status==="REJECTED";
   const Icon=accepted?CheckCircle2:rejected?XCircle:Clock;
   const label=accepted?(ar?"تم قبول الطلب":"Request approved"):rejected?(ar?"تم رفض الطلب":"Request rejected"):(ar?"بانتظار مراجعة الإدارة":"Awaiting admin review");
   return <article key={request.id} className={`reset-update ${accepted?"approved":rejected?"rejected":"pending"}`}><Icon size={21} aria-hidden="true"/><div><strong>{label}</strong><h3>{request.product_name}</h3><p>{ar?"سبب طلبك: ":"Your reason: "}{request.reason}</p>{request.admin_notes&&<p className="reset-admin-response"><b>{ar?"رد الإدارة: ":"Admin response: "}</b>{request.admin_notes}</p>}</div></article>;
  })}</div>
 </section>;
}
