"use client";

import { useEffect, useRef } from "react";
import { AlertTriangle, X } from "lucide-react";

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "danger" | "warning" | "primary";
  isLoading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmModal({
  isOpen,
  title,
  message,
  confirmText = "تأكيد",
  cancelText = "إلغاء",
  variant = "danger",
  isLoading = false,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  const cancelBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    cancelBtnRef.current?.focus();
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div
        className="modal-card confirm-modal-card"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="modal-header">
          <div className="confirm-header-wrap">
            <span className={`confirm-icon-badge ${variant}`}>
              <AlertTriangle size={18} />
            </span>
            <h3>{title}</h3>
          </div>
          <button
            type="button"
            className="modal-close"
            onClick={onCancel}
            aria-label="إغلاق"
            disabled={isLoading}
          >
            <X size={16} />
          </button>
        </div>

        <div className="modal-body-compact">
          <p>{message}</p>
        </div>

        <div className="modal-actions">
          <button
            ref={cancelBtnRef}
            type="button"
            className="secondary-button small"
            onClick={onCancel}
            disabled={isLoading}
          >
            {cancelText}
          </button>
          <button
            type="button"
            className={`btn-action small ${variant === "danger" ? "danger" : "primary"}`}
            onClick={onConfirm}
            disabled={isLoading}
          >
            {isLoading ? "جارٍ التنفيذ..." : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
