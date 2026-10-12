"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { motion, useReducedMotion } from "motion/react";
import {
  ArrowRight,
  BookOpen,
  CircleHelp,
  Download,
  ExternalLink,
  Info,
  Play,
  ShieldCheck,
  X,
} from "lucide-react";
import { guideStepEntries, type GuideArticle } from "@/lib/guide-library";
import css from "./guide-ui.module.css";

/** Wraps Latin technical terms so they keep their own direction inside Arabic text. */
function BidiText({ text }: { text: string }) {
  return (
    <>
      {text
        .split(/([A-Za-z][A-Za-z0-9_+./:#-]*(?:[ >]+[A-Za-z0-9_+./:#-]+)*)/g)
        .map((part, index) => (/^[A-Za-z]/.test(part) ? <bdi key={index} dir="ltr">{part}</bdi> : part))}
    </>
  );
}

/** Shared modal surface used by the article reader and the image lightbox. */
export function GuideDialog({
  title,
  onClose,
  onBack,
  children,
  sectionKey,
  eyebrow = "مركز المساعدة",
}: {
  title: string;
  onClose: () => void;
  onBack?: () => void;
  children: ReactNode;
  sectionKey?: string;
  eyebrow?: string;
}) {
  const dialog = useRef<HTMLDivElement>(null);
  const scroll = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const closeRef = useRef(onClose);
  const closingRef = useRef(false);
  const requestCloseRef = useRef<() => void>(() => {});
  const [closing, setClosing] = useState(false);
  const reduceMotion = useReducedMotion();

  const requestClose = () => {
    if (closingRef.current) return;
    closingRef.current = true;
    if (reduceMotion) closeRef.current();
    else setClosing(true);
  };
  requestCloseRef.current = requestClose;

  useEffect(() => {
    closeRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    scroll.current?.scrollTo({ top: 0 });
  }, [sectionKey]);

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialog.current?.focus();
    const keydown = (event: KeyboardEvent) => {
      if (!dialog.current?.contains(document.activeElement)) return;
      if (event.key === "Escape") {
        event.preventDefault();
        requestCloseRef.current();
      }
      if (event.key !== "Tab") return;
      const nodes = Array.from(
        dialog.current?.querySelectorAll<HTMLElement>(
          'button:not(:disabled), a[href], input:not(:disabled), select, textarea, video[controls], iframe, [tabindex="0"]'
        ) || []
      ).filter((node) => node.getClientRects().length);
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (!first) {
        event.preventDefault();
        return;
      }
      if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog.current)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || document.activeElement === dialog.current)) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", keydown);
    return () => {
      document.removeEventListener("keydown", keydown);
      document.body.style.overflow = overflow;
      previous?.focus();
    };
  }, []);

  return createPortal(
    <motion.div
      className={css.overlay}
      initial={reduceMotion ? false : { opacity: 0 }}
      animate={{ opacity: closing ? 0 : 1 }}
      transition={{ duration: reduceMotion ? 0 : 0.18, ease: "easeOut" }}
      onClick={(event) => {
        if (event.target === event.currentTarget) requestClose();
      }}
    >
      <motion.div
        ref={dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        dir="rtl"
        className={css.dialog}
        initial={reduceMotion ? false : "initial"}
        animate={closing ? "closed" : "open"}
        variants={{
          initial: { opacity: 0, y: 6, scale: 0.98 },
          open: { opacity: 1, y: 0, scale: 1 },
          closed: { opacity: 0, y: 6, scale: 0.98 },
        }}
        transition={{ duration: reduceMotion ? 0 : 0.2, ease: "easeOut" }}
        onAnimationComplete={(definition) => {
          if (definition === "closed") closeRef.current();
        }}
      >
        <header className={css.header}>
          <span className={css.icon}>
            <CircleHelp size={23} />
          </span>
          <div className={css.headerCopy}>
            <p className={css.eyebrow}>{eyebrow}</p>
            <h2 id={titleId} className={css.dialogTitle}>
              {title}
            </h2>
          </div>
          {onBack && (
            <button type="button" className={css.iconButton} onClick={onBack} aria-label="الرجوع">
              <ArrowRight size={20} />
            </button>
          )}
          <button type="button" className={css.iconButton} onClick={requestClose} aria-label="إغلاق الشرح">
            <X size={20} />
          </button>
        </header>
        <div ref={scroll} className={css.scroll}>
          {children}
        </div>
      </motion.div>
    </motion.div>,
    document.body
  );
}

/** Click-to-zoom illustration with a reload affordance when a picture fails. */
export function ImageLightbox({ src, alt, className = "" }: { src: string; alt: string; className?: string }) {
  const [open, setOpen] = useState(false);
  const [failed, setFailed] = useState(false);
  return (
    <>
      <button
        type="button"
        className={`${css.imageButton} ${className}`}
        onClick={() => {
          if (failed) setFailed(false);
          else setOpen(true);
        }}
        aria-label={failed ? `إعادة تحميل الصورة: ${alt}` : `تكبير الصورة: ${alt}`}
      >
        {failed ? <span className={css.imageFailed}>تعذر تحميل الصورة — اضغط للمحاولة</span> : <img src={src} alt={alt} loading="lazy" onError={() => setFailed(true)} />}
        <span className={css.imageHint}>تكبير الصورة</span>
      </button>
      {open && (
        <GuideDialog title={alt} onClose={() => setOpen(false)}>
          <img src={src} alt={alt} className={css.lightboxImage} />
        </GuideDialog>
      )}
    </>
  );
}

/**
 * Turns any supported link into a playable source: YouTube, Streamable and Drive
 * become in-page embeds, everything else is played with a native video element.
 */
export function videoEmbed(url: string): { kind: "iframe" | "video"; src: string; thumbnail?: string } | null {
  if (url.startsWith("/") && !url.startsWith("//")) return { kind: "video", src: url };
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:") return null;
    const host = parsed.hostname.replace(/^www\./, "");
    if (["youtube.com", "youtu.be", "youtube-nocookie.com"].includes(host)) {
      const id = host === "youtu.be" ? parsed.pathname.split("/")[1] : parsed.searchParams.get("v") || parsed.pathname.split("/").pop();
      if (!id || !/^[\w-]{11}$/.test(id)) return null;
      return {
        kind: "iframe",
        src: `https://www.youtube-nocookie.com/embed/${id}`,
        thumbnail: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
      };
    }
    if (host === "streamable.com") {
      const id = parsed.pathname.split("/").filter(Boolean).pop();
      return id && /^[\w-]+$/.test(id) ? { kind: "iframe", src: `https://streamable.com/e/${id}` } : null;
    }
    if (host === "drive.google.com") {
      const id = parsed.pathname.match(/\/d\/([\w-]+)/)?.[1] || parsed.searchParams.get("id");
      return id ? { kind: "iframe", src: `https://drive.google.com/file/d/${encodeURIComponent(id)}/preview` } : null;
    }
    return { kind: "video", src: url };
  } catch {
    return null;
  }
}

/** Poster-first player: the clip only loads after the customer presses play. */
export function GuideVideo({
  url,
  title,
  image,
  hideCaption = false,
}: {
  url: string;
  title: string;
  image?: string;
  hideCaption?: boolean;
}) {
  const [mode, setMode] = useState<"poster" | "play">("poster");
  const [failed, setFailed] = useState(false);
  const media = videoEmbed(url);
  if (!media) return <p className={css.warningBar}>رابط الفيديو غير صالح.</p>;
  const poster = image || media.thumbnail;
  return (
    <section className={css.videoBlock}>
      {mode === "poster" ? (
        <button className={css.videoPoster} onClick={() => setMode("play")} aria-label={`تشغيل شرح ${title}`}>
          {poster ? (
            <img
              src={poster}
              alt=""
              loading="lazy"
              onError={(event) => {
                event.currentTarget.style.display = "none";
              }}
            />
          ) : (
            <BookOpen size={64} className={css.videoPlaceholderIcon} />
          )}
          <span className={css.play}>
            <Play size={25} fill="currentColor" />
          </span>
          <span className={css.posterLabel}>{title}</span>
        </button>
      ) : (
        <div className={css.player}>
          {media.kind === "iframe" ? (
            <iframe
              title={title}
              src={media.src}
              allow="fullscreen; picture-in-picture"
              allowFullScreen
              referrerPolicy="strict-origin-when-cross-origin"
            />
          ) : (
            <video src={media.src} controls playsInline preload="metadata" onError={() => setFailed(true)} />
          )}
        </div>
      )}
      {failed && <p className={css.warningBar}>تعذّر تحميل الفيديو. أعد المحاولة.</p>}
      {!hideCaption && <div className={css.videoCaption}>{title} · يمكنك قراءة الخطوات المكتوبة أدناه.</div>}
    </section>
  );
}

const VPN_LINKS = [
  {
    href: "https://windscribe.com/features/use-for-free",
    initial: "W",
    name: "Windscribe VPN",
    tag: "مجاني",
    detail: "وضع Stealth + Firewall Automatic",
    tone: "cyan" as const,
  },
  {
    href: "https://www.mysteriumdark.com/",
    initial: "M",
    name: "Mysterium Dark",
    tag: "لـ Rust",
    detail: "اتصال سكني Residential + Double-hop",
    tone: "violet" as const,
  },
];

/** Illustrated stand-in shown for the VPN article, which has no screenshot of its own. */
export function VpnShowcaseCard() {
  return (
    <div className={css.vpnCard}>
      <div className={css.vpnEmblemWrap}>
        <div className={css.vpnEmblemGlow} />
        <div className={css.vpnEmblem}>
          <svg viewBox="0 0 64 64" fill="none" className={css.vpnShield}>
            <defs>
              <linearGradient id="vpnShieldGrad" x1="16" y1="8" x2="48" y2="56" gradientUnits="userSpaceOnUse">
                <stop stopColor="#22d3ee" stopOpacity="0.35" />
                <stop offset="1" stopColor="#0284c7" stopOpacity="0.08" />
              </linearGradient>
              <linearGradient id="vpnStrokeGrad" x1="16" y1="8" x2="48" y2="56" gradientUnits="userSpaceOnUse">
                <stop stopColor="#38bdf8" />
                <stop offset="0.5" stopColor="#22d3ee" />
                <stop offset="1" stopColor="#0ea5e9" />
              </linearGradient>
            </defs>
            <path
              d="M32 7L49 13.5V29C49 42.5 40 51.5 32 56C24 51.5 15 42.5 15 29V13.5L32 7Z"
              fill="url(#vpnShieldGrad)"
              stroke="url(#vpnStrokeGrad)"
              strokeWidth="2.5"
              strokeLinejoin="round"
            />
            <path d="M32 20C28.7 20 26 22.7 26 26V29H38V26C38 22.7 35.3 20 32 20Z" stroke="#e0f2fe" strokeWidth="2.2" />
            <rect x="23.5" y="29" width="17" height="13" rx="3" fill="#0284c7" stroke="#38bdf8" strokeWidth="2" />
            <circle cx="32" cy="35" r="2" fill="#ffffff" />
            <path d="M32 37V39" stroke="#ffffff" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
          <span className={css.vpnBadge}>VPN</span>
        </div>
      </div>

      <h3 className={css.vpnTitle}>استخدام شبكة VPN</h3>
      <p className={css.vpnText}>إعدادات وتوصيات الاتصال الآمن وتخطي الحظر</p>

      <div className={css.vpnStatus}>
        <span className={css.vpnStatusDot} />
        <span>توصيات الحماية وتغيير المعرّفات</span>
      </div>

      <div className={css.vpnTags}>
        <span className={css.vpnTagCyan}>Stealth Protocol</span>
        <span className={css.vpnTagViolet}>Residential IP</span>
        <span className={css.vpnTagBlue}>Double-hop</span>
      </div>

      <div className={css.vpnLinks}>
        {VPN_LINKS.map((link) => (
          <a
            key={link.href}
            href={link.href}
            target="_blank"
            rel="noopener noreferrer"
            className={link.tone === "violet" ? css.vpnLinkViolet : css.vpnLinkCyan}
          >
            <span className={link.tone === "violet" ? css.vpnLinkBadgeViolet : css.vpnLinkBadgeCyan}>{link.initial}</span>
            <span className={css.vpnLinkBody}>
              <span className={css.vpnLinkTitle}>
                {link.name}
                <span className={link.tone === "violet" ? css.vpnLinkTagViolet : css.vpnLinkTagCyan}>{link.tag}</span>
              </span>
              <span className={css.vpnLinkDetail}>{link.detail}</span>
            </span>
            <ExternalLink size={15} className={css.vpnLinkArrow} />
          </a>
        ))}
      </div>
    </div>
  );
}

/** Full guide reader: media column on one side, numbered written steps on the other. */
export function GuideArticleView({ article, savedVariant, onVariant }: {
  article: GuideArticle;
  savedVariant?: string;
  onVariant?: (id: string) => void;
}) {
  const [variant, setVariant] = useState(
    article.variants?.some((item) => item.id === savedVariant) ? savedVariant! : article.variants?.[0]?.id || ""
  );
  const chosen = article.variants?.find((item) => item.id === variant);
  const steps = guideStepEntries(article, variant);
  const video = chosen?.video || article.video;
  const isVpn = article.category === "VPN" || article.id === "vpn";

  return (
    <article className={css.stack}>
      <div>
        <p className={css.eyebrow}>{article.category}</p>
        <p className={css.muted}>{article.description}</p>
      </div>

      {article.warning && (
        <aside className={css.warning}>
          <Info size={18} className={css.warningIcon} />
          <p>{article.warning}</p>
        </aside>
      )}

      {article.variants && (
        <div>
          <h4 className={css.sectionLabel}>اختر المسار المناسب</h4>
          <div className={css.tabs}>
            {article.variants.map((item) => (
              <button
                key={item.id}
                className={css.tab}
                aria-pressed={variant === item.id}
                onClick={() => {
                  setVariant(item.id);
                  onVariant?.(item.id);
                }}
              >
                <bdi>{item.label}</bdi>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className={css.articleLayout}>
        <div className={css.articleMedia}>
          {article.image && <ImageLightbox src={article.image} alt={article.title} />}
          {video && <GuideVideo key={video} url={video} title={chosen?.label || article.title} />}
          {!article.image && !video && steps.find((step) => step.image) && (
            <ImageLightbox src={steps.find((step) => step.image)!.image!} alt={article.title} />
          )}
          {!article.image && !video && !steps.some((step) => step.image) && (
            isVpn ? (
              <VpnShowcaseCard />
            ) : (
              <div className={css.articlePlaceholder}>
                <BookOpen size={44} />
                <span>SpooFX</span>
              </div>
            )
          )}
        </div>

        <div className={css.stack}>
          {steps.map((step, index) => (
            <section
              key={step.id}
              id={`guide-step-${article.id}-${index}`}
              tabIndex={-1}
              aria-label={`الخطوة ${index + 1}: ${step.title}`}
              className={css.step}
            >
              <span className={css.stepNumber}>{String(index + 1).padStart(2, "0")}</span>
              <div className={css.stepBody}>
                <h4 className={css.stepTitle}>
                  <bdi>{step.title}</bdi>
                </h4>
                {step.path && (
                  <p dir="ltr" className={css.path}>
                    {step.path}
                  </p>
                )}
                {step.value && (
                  <div className={css.valueRow}>
                    القيمة المطلوبة:{" "}
                    <bdi className={css.value} dir="ltr">
                      {step.value}
                    </bdi>
                  </div>
                )}
                <p className={css.stepText}>
                  <BidiText text={step.text} />
                </p>
                {step.commands?.map((command) => (
                  <code key={command} dir="ltr" data-allow-copy className={css.command}>
                    {command}
                  </code>
                ))}
                {step.links && step.links.length > 0 && (
                  <div className={css.linkRow}>
                    {step.links.map((link) => (
                      <a
                        key={link.url}
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={link.url.includes("mysterium") ? css.linkChipViolet : css.linkChipCyan}
                      >
                        <ExternalLink size={13} className={css.linkChipIcon} />
                        <span>{link.label}</span>
                      </a>
                    ))}
                  </div>
                )}
                {step.image && <ImageLightbox src={step.image} alt={step.title} />}
              </div>
            </section>
          ))}
        </div>
      </div>

      {!isVpn && article.links && article.links.length > 0 && (
        <div className={css.articleLinks}>
          {article.links.map((link) => {
            const isDownload = link.url.endsWith(".exe") || link.url.includes("/download") || link.label.includes("تحميل");
            return (
              <a key={link.url} href={link.url} target="_blank" rel="noopener noreferrer" className={css.smallButton}>
                {isDownload ? <Download size={15} className={css.linkChipIcon} /> : <ExternalLink size={15} className={css.linkChipIcon} />}
                <span>{link.label}</span>
              </a>
            );
          })}
        </div>
      )}
    </article>
  );
}

/**
 * Library card: preview frame, category badge and the button that opens the reader.
 * `wide` switches the card to the two-column layout used when a search returns one result.
 */
export function GuideCard({
  article,
  number,
  onOpen,
  wide = false,
}: {
  article: GuideArticle;
  number: number;
  onOpen: () => void;
  wide?: boolean;
}) {
  const previewVideo = article.video || article.variants?.find((item) => item.video)?.video;
  const preview = previewVideo ? videoEmbed(previewVideo) : null;
  const previewImage = article.image || article.steps.find((step) => step.image)?.image || preview?.thumbnail;
  const isVpn = article.category === "VPN" || article.id === "vpn";

  return (
    <article className={wide ? `${css.card} ${css.cardWide}` : css.card}>
      <div className={css.cardTop}>
        <span className={css.stepNumber}>{String(number).padStart(2, "0")}</span>
        <span className={css.eyebrow}>{article.category}</span>
      </div>

      <div className={css.cardPreview}>
        {previewImage ? (
          <img
            className={css.cardImage}
            src={previewImage}
            alt=""
            loading="lazy"
            onError={(event) => {
              event.currentTarget.style.display = "none";
            }}
          />
        ) : isVpn ? (
          <span className={css.cardVpnMark}>
            <ShieldCheck size={40} />
            <span className={css.cardVpnTag}>VPN</span>
          </span>
        ) : (
          <BookOpen size={28} className={css.cardBookIcon} />
        )}
        {previewVideo && (
          <span className={css.cardPlay} aria-label="يتضمن فيديو">
            <Play size={19} fill="currentColor" />
          </span>
        )}
      </div>

      <h3 className={css.cardTitle}>{article.title}</h3>
      <p className={css.cardText}>{article.description}</p>
      <button className={`${css.smallButton} ${css.cardButton}`} onClick={onOpen}>
        <BookOpen size={16} />
        فتح الشرح
      </button>
    </article>
  );
}
