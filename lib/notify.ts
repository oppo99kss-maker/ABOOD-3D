export type ToastType = "success" | "error" | "warning" | "info";

export interface ToastItem {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

type ToastListener = (toasts: ToastItem[]) => void;

class NotificationManager {
  private toasts: ToastItem[] = [];
  private listeners: Set<ToastListener> = new Set();
  private maxToasts = 3;

  subscribe(listener: ToastListener) {
    this.listeners.add(listener);
    listener([...this.toasts]);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners() {
    const copy = [...this.toasts];
    for (const listener of this.listeners) {
      listener(copy);
    }
  }

  private add(type: ToastType, title: string, message?: string, duration?: number) {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const defaultDuration = type === "error" ? 6000 : type === "warning" ? 5000 : 4000;
    const newToast: ToastItem = {
      id,
      type,
      title,
      message,
      duration: duration ?? defaultDuration,
    };

    // Keep max 3 toasts
    if (this.toasts.length >= this.maxToasts) {
      this.toasts.shift();
    }

    this.toasts.push(newToast);
    this.notifyListeners();
    return id;
  }

  dismiss(id: string) {
    this.toasts = this.toasts.filter((t) => t.id !== id);
    this.notifyListeners();
  }

  clear() {
    this.toasts = [];
    this.notifyListeners();
  }

  success(title: string, message?: string, duration?: number) {
    return this.add("success", title, message, duration);
  }

  error(title: string, message?: string, duration?: number) {
    return this.add("error", title, message, duration);
  }

  warning(title: string, message?: string, duration?: number) {
    return this.add("warning", title, message, duration);
  }

  info(title: string, message?: string, duration?: number) {
    return this.add("info", title, message, duration);
  }
}

export const notify = new NotificationManager();
