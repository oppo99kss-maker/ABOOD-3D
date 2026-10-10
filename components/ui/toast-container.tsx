"use client";

import { useEffect, useRef, useState } from "react";
import { AlertCircle, AlertTriangle, CheckCircle2, Info, X } from "lucide-react";
import { notify, type ToastItem, type ToastType } from "@/lib/notify";

export function ToastContainer() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    return notify.subscribe((updated) => {
      setToasts(updated);
    });
  }, []);

  if (toasts.length === 0) return null;

  return (
    <aside className="spoo-toast-stack" aria-live="polite" aria-label="الإشعارات والتنبيهات">
      {toasts.map((item) => (
        <ToastCard key={item.id} item={item} />
      ))}
    </aside>
  );
}

function ToastCard({ item }: { item: ToastItem }) {
  const [isPaused, setIsPaused] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const remainingRef = useRef<number>(item.duration || 4000);
  const startRef = useRef<number>(Date.now());

  useEffect(() => {
    if (isPaused) {
      if (timerRef.current) clearTimeout(timerRef.current);
      return;
    }

    startRef.current = Date.now();
    timerRef.current = setTimeout(() => {
      notify.dismiss(item.id);
    }, remainingRef.current);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isPaused, item.id]);

  const handleMouseEnter = () => {
    const elapsed = Date.now() - startRef.current;
    remainingRef.current = Math.max(1000, remainingRef.current - elapsed);
    setIsPaused(true);
  };

  const handleMouseLeave = () => {
    setIsPaused(false);
  };

  const renderIcon = (type: ToastType) => {
    switch (type) {
      case "success":
        return <CheckCircle2 size={16} className="toast-icon success" />;
      case "error":
        return <AlertCircle size={16} className="toast-icon error" />;
      case "warning":
        return <AlertTriangle size={16} className="toast-icon warning" />;
      case "info":
      default:
        return <Info size={16} className="toast-icon info" />;
    }
  };

  return (
    <div
      className={`spoo-toast-card ${item.type}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      role="alert"
    >
      <div className="toast-icon-wrap">{renderIcon(item.type)}</div>
      <div className="toast-text-wrap">
        <strong className="toast-title">{item.title}</strong>
        {item.message && <p className="toast-desc">{item.message}</p>}
      </div>
      <button
        type="button"
        className="toast-close-btn"
        onClick={() => notify.dismiss(item.id)}
        aria-label="إغلاق التنبيه"
      >
        <X size={14} />
      </button>
    </div>
  );
}
