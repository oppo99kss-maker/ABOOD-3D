"use client";
import { useEffect, useId, useRef, type HTMLAttributes } from "react";
/** Presentation-only focus management for existing dialogs. Action handlers stay on the original controls. */
export function ModalBackdrop({children,...props}: HTMLAttributes<HTMLDivElement>) {
 const root=useRef<HTMLDivElement>(null); const id=useId();
 useEffect(()=>{
  const previous=document.activeElement as HTMLElement|null; const overflow=document.body.style.overflow;
  const card=root.current?.querySelector<HTMLElement>('.modal-card,.customer-drawer-panel') || root.current?.firstElementChild as HTMLElement|null;
  const heading=card?.querySelector<HTMLElement>('h1,h2,h3,h4');
  if(card){card.setAttribute('role','dialog');card.setAttribute('aria-modal','true');card.tabIndex=-1;if(heading){heading.id ||= id;card.setAttribute('aria-labelledby',heading.id);}else{card.setAttribute('aria-label',document.documentElement.lang==='ar'?'لوحة التفاصيل':'Details panel');}}
  card?.querySelectorAll<HTMLButtonElement>('.modal-close,.ref-modal-close-icon,.drawer-close').forEach(button=>{if(!button.getAttribute('aria-label'))button.setAttribute('aria-label',document.documentElement.lang==='ar'?'إغلاق':'Close');});
  document.body.style.overflow='hidden';
  const controls=()=>Array.from(card?.querySelectorAll<HTMLElement>('button:not(:disabled),a[href],input:not(:disabled),textarea:not(:disabled),select:not(:disabled),[tabindex="0"]')||[]).filter(el=>el.getClientRects().length);
  const cancel=card?.querySelector<HTMLElement>('.modal-actions .secondary-button'); (cancel||controls()[0]||card)?.focus();
  const keydown=(e:KeyboardEvent)=>{
   const overlays=document.querySelectorAll('.modal-backdrop,.drawer-backdrop');if(overlays[overlays.length-1]!==root.current)return;
   if(e.key==='Escape'){const close=card?.querySelector<HTMLButtonElement>('.modal-close,.ref-modal-close-icon,.drawer-close');if(close&&!close.disabled){e.preventDefault();e.stopPropagation();close.click();}return;}
   if(e.key!=='Tab')return; const items=controls(); const first=items[0],last=items[items.length-1];
   if(!first){e.preventDefault();card?.focus();return;}
   if(e.shiftKey&&(document.activeElement===first||document.activeElement===card)){e.preventDefault();last.focus();}else if(!e.shiftKey&&(document.activeElement===last||document.activeElement===card)){e.preventDefault();first.focus();}
  };
  document.addEventListener('keydown',keydown,true);
  return()=>{document.removeEventListener('keydown',keydown,true);document.body.style.overflow=overflow;if(previous?.isConnected)previous.focus();};
 },[id]);
 return <div {...props} ref={root}>{children}</div>;
}
