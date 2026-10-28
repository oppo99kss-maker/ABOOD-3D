"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  AlertTriangle,
  BookOpen,
  ChevronDown,
  Cpu,
  KeyRound,
  Monitor,
  Network,
  Search,
  ShieldCheck,
  Wrench,
  X,
} from "lucide-react";
import { GUIDE_ARTICLES, matchesGuide, normalizeGuideSearch, type GuideArticle } from "@/lib/guide-library";
import { HELP_FAQ_CATEGORIES, HELP_FAQS, type HelpFaq } from "@/lib/help-faqs";
import { GuideArticleView, GuideCard, GuideDialog, ImageLightbox } from "@/components/guides/guide-ui";
import css from "./help-center.module.css";

interface HelpCenterProps {
  lang: "ar" | "en";
  /** Opens another portal tab from inside the help centre. */
  onNavigateTab?: (tab: "overview" | "my-products" | "redeem") => void;
}

const sections = [
  { id: "Windows", label: "Windows", text: "التثبيت وتجهيز النظام", icon: Monitor },
  { id: "BIOS", label: "BIOS", text: "إعدادات اللوحة الأم", icon: Cpu },
  { id: "Network", label: "Network", text: "الشبكة والاتصال", icon: Network },
  { id: "VPN", label: "VPN", text: "إعداد الاتصال", icon: ShieldCheck },
  { id: "Visual C++", label: "Visual C++", text: "المكتبات المطلوبة", icon: Wrench },
  { id: "تشغيل البرنامج", label: "تشغيل البرنامج", text: "التشغيل والقائمة", icon: BookOpen },
  { id: "Permanent Spoof", label: "Permanent Spoof", text: "إعدادات Permanent", icon: ShieldCheck },
  { id: "أخطاء البرنامج", label: "أخطاء البرنامج", text: "حلول الأخطاء الشائعة", icon: Wrench },
  { id: "admin", label: "الإدارة", text: "الحساب والمفاتيح", icon: KeyRound },
];

/** Presentation order of the library: setup first, then the deep troubleshooting. */
const rank = ["windows", "bios", "network", "vpn", "menu", "runtime", "connection"];
const articles = GUIDE_ARTICLES.filter((item) => item.id !== "disk" && item.id !== "raid").sort(
  (a, b) => rank.indexOf(a.id) - rank.indexOf(b.id)
);

/** Renders one FAQ answer, keeping numbered steps, bullets and warnings readable. */
function FaqAnswer({ text }: { text: string }) {
  return (
    <div className={css.faqAnswer}>
      {text.split("\n").map((line, index) => {
        const value = line.trim();
        if (!value) return <div key={index} className={css.faqGap} />;
        const step = value.match(/^(\d+)\.\s*(.+)$/);
        if (step) {
          return (
            <div key={index} className={css.faqRow}>
              <span className={css.faqStepNumber}>{step[1]}</span>
              <span>{step[2]}</span>
            </div>
          );
        }
        if (value.startsWith("- ") || value.startsWith("• ")) {
          return (
            <div key={index} className={css.faqRow}>
              <span aria-hidden="true" className={css.faqBullet} />
              <span>{value.slice(2)}</span>
            </div>
          );
        }
        if (/^\[warning\]|^(تنبيه|تحذير|ملاحظة):/i.test(value)) {
          return (
            <aside key={index} className={css.faqWarning}>
              <AlertTriangle size={16} className={css.faqWarningIcon} />
              <span>{value.replace(/^\[warning\]\s*/i, "")}</span>
            </aside>
          );
        }
        return <p key={index}>{value}</p>;
      })}
    </div>
  );
}

export function HelpCenter({ lang, onNavigateTab }: HelpCenterProps) {
  const ar = lang === "ar";
  const reducedMotion = useReducedMotion();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [more, setMore] = useState(false);
  const [article, setArticle] = useState<GuideArticle | null>(null);
  const [openFaq, setOpenFaq] = useState<string | null>(null);
  const [sort, setSort] = useState("order");
  const resultHeading = useRef<HTMLHeadingElement>(null);

  const filteredArticles = useMemo(
    () => articles.filter((item) => (category === "all" || item.category === category) && matchesGuide(item, query)),
    [category, query]
  );

  const filteredFaqs = useMemo(
    () =>
      HELP_FAQS.filter((faq) => {
        if (category !== "all" && category !== "admin" && category !== `admin:${faq.category_id}`) return false;
        const value = [faq.question_ar, faq.question_en, faq.answer_ar, faq.answer_en, ...faq.keywords].join(" ");
        return normalizeGuideSearch(value).includes(normalizeGuideSearch(query));
      }).sort((a, b) =>
        sort === "views"
          ? b.views - a.views
          : sort === "latest"
            ? new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            : Number(b.is_pinned) - Number(a.is_pinned) || a.sort_order - b.sort_order
      ),
    [category, query, sort]
  );

  const select = (id: string) => {
    setCategory(id);
    setOpenFaq(null);
    setMore(false);
  };

  const chips = [
    { id: "all", label: ar ? "الكل" : "All" },
    ...sections.slice(0, 4),
    ...sections.filter((item) => (item.id === "Permanent Spoof" || item.id === "أخطاء البرنامج") && articles.some(article => article.category === item.id)),
  ];

  return (
    <section dir={ar ? "rtl" : "ltr"} className={css.hub}>
      <header className={css.helpHeader}>
        <div>
          <h2>{ar ? "مركز المساعدة" : "Help center"}</h2>
          
        </div>

      </header>

      <label className={css.search}>
        <Search size={19} />
        <span className={css.srOnly}>{ar ? "ابحث عن مشكلتك" : "Search help"}</span>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={ar ? "ابحث عن مشكلتك... Windows، BIOS، Network" : "Search... Windows, BIOS, Network"}
        />
        {query && (
          <button aria-label={ar ? "مسح البحث" : "Clear search"} onClick={() => setQuery("")}>
            <X size={18} />
          </button>
        )}
      </label>

      <div className={css.filterBar}>
        <nav className={css.filterRail} aria-label="تصنيفات مركز المساعدة">
          {chips.map((item) => (
            <button
              key={item.id}
              className={css.tab}
              aria-pressed={category === item.id}
              onClick={() => select(item.id)}
            >
              {item.label}
            </button>
          ))}
          <button
            className={css.tab}
            aria-expanded={more}
            aria-controls="help-more-categories"
            aria-pressed={more || !chips.some((item) => item.id === category)}
            onClick={() => setMore((open) => !open)}
          >
            {ar ? "المزيد" : "More"}
            <ChevronDown size={14} />
          </button>
        </nav>

        <AnimatePresence initial={false}>
          {more && (
            <motion.div
              id="help-more-categories"
              className={css.filterMenu}
              initial={reducedMotion ? false : { opacity: 0, y: -4, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={reducedMotion ? { opacity: 1 } : { opacity: 0, y: -4, scale: 0.98 }}
              transition={{ duration: reducedMotion ? 0 : 0.18, ease: "easeOut" }}
            >
              {sections.filter(section => section.id === "admin" || articles.some(article => article.category === section.id))
                .filter((section) => !chips.some((chip) => chip.id === section.id))
                .map((item) => (
                  <button
                    key={item.id}
                    className={css.tab}
                    aria-pressed={category === item.id}
                    onClick={() => select(item.id)}
                  >
                    {item.label}
                  </button>
                ))}
              {HELP_FAQ_CATEGORIES.map((item) => (
                <button
                  key={item.id}
                  className={css.tab}
                  aria-pressed={category === `admin:${item.id}`}
                  onClick={() => select(`admin:${item.id}`)}
                >
                  {ar ? item.name_ar : item.name_en}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {!query && category === "all" && (
        <div className={css.categoryGrid}>
          {sections.filter(section => section.id === "admin" || articles.some(article => article.category === section.id)).map((item) => (
            <button
              key={item.id}
              className={css.categoryCard}
              onClick={() => {
                select(item.id);
                resultHeading.current?.scrollIntoView({ block: "start" });
              }}
            >
              <item.icon size={19} strokeWidth={1.7} />
              <div>
                <strong>{item.label}</strong>
                
                <small>
                  {item.id === "admin" ? HELP_FAQS.length : GUIDE_ARTICLES.filter((a) => a.category === item.id).length}{" "}
                  {item.id === "admin" ? "أسئلة" : "شروحات"}
                </small>
              </div>
            </button>
          ))}
        </div>
      )}

      <div className={css.resultsRow}>
        <h3 ref={resultHeading}>{ar ? "مكتبة الشروحات والحلول" : "Guides and solutions"}</h3>
        <span role="status" className={css.muted}>
          {filteredArticles.length + filteredFaqs.length} {ar ? "نتيجة" : "results"}
        </span>
      </div>

      {filteredArticles.length > 0 && (
        <div className={filteredArticles.length === 1 ? css.singleResult : css.grid}>
          {filteredArticles.map((item) => (
            <GuideCard
              key={item.id}
              article={item}
              number={articles.indexOf(item) + 1}
              wide={filteredArticles.length === 1}
              onOpen={() => setArticle(item)}
            />
          ))}
        </div>
      )}

      {(category === "all" || category.startsWith("admin")) && (
        <>
          <div className={css.resultsRow}>
            <h3>{ar ? "أسئلة الحساب والمنتجات" : "Account and product questions"}</h3>
            <label className={css.sortLabel}>
              {ar ? "الترتيب: " : "Sort: "}
              <select value={sort} onChange={(event) => setSort(event.target.value)}>
                <option value="order">{ar ? "ترتيب الإدارة" : "Default"}</option>
                <option value="views">{ar ? "الأكثر مشاهدة" : "Most viewed"}</option>
                <option value="latest">{ar ? "آخر الإضافات" : "Latest"}</option>
              </select>
            </label>
          </div>

          {filteredFaqs.map((faq) => (
            <FaqCard
              key={faq.id}
              faq={faq}
              ar={ar}
              open={openFaq === faq.id}
              onToggle={() => setOpenFaq((current) => (current === faq.id ? null : faq.id))}
              reducedMotion={!!reducedMotion}
            />
          ))}
        </>
      )}

      {!filteredArticles.length && !filteredFaqs.length && (
        <div className={css.empty}>
          لا توجد نتائج مطابقة.
          <button
            className={`${css.smallButton} ${css.emptyButton}`}
            onClick={() => {
              setQuery("");
              select("all");
            }}
          >
            عرض الكل
          </button>
        </div>
      )}

      {article && (
        <GuideDialog title={article.title} onClose={() => setArticle(null)}>
          <GuideArticleView key={article.id} article={article} />
        </GuideDialog>
      )}
    </section>
  );
}

function FaqCard({
  faq,
  ar,
  open,
  onToggle,
  reducedMotion,
}: {
  faq: HelpFaq;
  ar: boolean;
  open: boolean;
  onToggle: () => void;
  reducedMotion: boolean;
}) {
  const question = ar ? faq.question_ar : faq.question_en || faq.question_ar;
  return (
    <article className={css.faq}>
      <button aria-expanded={open} aria-controls={`faq-answer-${faq.id}`} onClick={onToggle}>
        <span>{question}</span>
        <ChevronDown size={17} className={open ? css.faqChevronOpen : css.faqChevron} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            id={`faq-answer-${faq.id}`}
            className={css.faqBody}
            initial={reducedMotion ? false : { opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reducedMotion ? { opacity: 1 } : { opacity: 0, y: -4 }}
            transition={{ duration: reducedMotion ? 0 : 0.18, ease: "easeOut" }}
          >
            <FaqAnswer text={ar ? faq.answer_ar : faq.answer_en || faq.answer_ar} />
            {faq.image_url && <ImageLightbox src={faq.image_url} alt={question} annotation={faq.image_annotation ? {title:ar?faq.image_annotation.title_ar:faq.image_annotation.title_en,description:ar?faq.image_annotation.description_ar:faq.image_annotation.description_en,target:faq.image_annotation.target,from:faq.image_annotation.from}:undefined} />}
          </motion.div>
        )}
      </AnimatePresence>
    </article>
  );
}
