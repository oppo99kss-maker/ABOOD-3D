"use client";
import { useState } from "react";
import { ArrowLeft, ArrowRight, BookOpen, Download, Play, RotateCcw, Search, Wrench } from "lucide-react";
import { GuideArticleView, GuideDialog, GuideVideo } from "@/components/guides/guide-ui";
import { GUIDE_ARTICLES, MAIN_VIDEO_FALLBACK, matchesGuide } from "@/lib/guide-library";
import type { Product } from "@/lib/store";

export function ProductGuideModal({ product, ar, onClose, onDownload, onOpenReset }: {
  product: Product; ar: boolean; onClose: () => void; onDownload: () => void; onOpenReset: () => void;
}) {
  const [selected, setSelected] = useState("start");
  const [query, setQuery] = useState("");
  const article = GUIDE_ARTICLES.find(item => item.id === selected);
  const t = (a: string, e: string) => ar ? a : e;
  const Back = ar ? ArrowRight : ArrowLeft;
  return <GuideDialog sectionKey={selected} title={product.name} onClose={onClose} onBack={selected !== "start" ? () => setSelected("start") : undefined} eyebrow={t("دليل المنتج", "Product guide")}>
    <div className="product-guide-reader" dir={ar ? "rtl" : "ltr"}>
      {article ? <GuideArticleView key={article.id} article={article} /> : <>
        <nav className="guide-shortcuts" aria-label={t("أقسام الدليل", "Guide sections")}>
          <button type="button" className={selected === "start" ? "selected" : ""} onClick={() => setSelected("start")}><Play size={16}/>{t("شرح المنتج", "Product video")}</button>
          <button type="button" className={selected === "library" ? "selected" : ""} onClick={() => setSelected("library")}><BookOpen size={16}/>{t("الشروحات", "Guides")}</button>
          <button type="button" className={selected === "wrp" ? "selected" : ""} onClick={() => setSelected("wrp")}><Wrench size={16}/>WRP</button>
        </nav>
        {selected === "start" && <>
          <GuideVideo url={MAIN_VIDEO_FALLBACK} title={t("شرح المنتج الأساسي", "Product walkthrough")} hideCaption />
          {product.instructions && <div className="guide-product-instructions"><h3>{t("تعليمات المنتج", "Product instructions")}</h3><p>{product.instructions}</p></div>}
          <div className="guide-shortcuts"><button type="button" onClick={onDownload}><Download size={16}/>{t("تحميل المنتج", "Download product")}</button><button type="button" onClick={() => setSelected("library")}><BookOpen size={16}/>{t("تصفح الشروحات", "Browse guides")}</button><button type="button" onClick={onOpenReset}><RotateCcw size={16}/>{t("طلب رستات", "Request reset")}</button></div>
        </>}
        {selected === "wrp" && <><GuideVideo url="/guides/wrp-guide.mp4" image="/guides/wrp-guide-thumb.jpg" title="WRP" hideCaption/><p className="guide-product-instructions">{t("إذا أكملت جميع خطوات الدليل وما زال الطرد أو الحظر قائمًا، اتبع هذه الخطوات بالترتيب.", "If you completed every guide step and are still kicked or banned, follow these steps in order.")}</p><ol className="guide-wrp-steps">{(ar ? ["حمّل WRP من الرابط أدناه، واتركه متوقفًا في هذه المرحلة.","أعد تنفيذ جميع خطوات دليل المنتج من البداية.","شغّل WRP قبل دخول اللعبة مباشرة.","ادخل بحساب جديد أو غير محظور والعب به لمدة 3 أيام، ثم تحقّق من حالة الحظر."] : ["Download WRP below, but leave it off for now.","Repeat every step in the product guide from the beginning.","Turn on WRP just before entering the game.","Use a new or unbanned account for 3 days, then check the ban status."]).map(step => <li key={step}>{step}</li>)}</ol><a className="secondary-button" href="https://downloads.cloudflareclient.com/v1/download/windows/ga" target="_blank" rel="noopener noreferrer"><Download size={16}/>{t("تحميل WRP", "Download WRP")}</a></>}
        {selected === "library" && <>
          <label className="guide-library-search"><Search size={17}/><input aria-label={t("البحث في الشروحات", "Search guides")} value={query} onChange={e => setQuery(e.target.value)} placeholder={t("ابحث عن الشرح…", "Search guides…")}/></label>
          <div className="guide-library-grid">{GUIDE_ARTICLES.filter(item => matchesGuide(item, query)).map(item => <button type="button" key={item.id} onClick={() => setSelected(item.id)}><BookOpen size={19}/><span><strong>{item.title}</strong><small>{item.description}</small></span><Back size={15}/></button>)}</div>
          {!GUIDE_ARTICLES.some(item => matchesGuide(item, query)) && <p role="status">{t("لا توجد شروحات مطابقة.", "No matching guides.")}</p>}
        </>}
      </>}
    </div>
  </GuideDialog>;
}
