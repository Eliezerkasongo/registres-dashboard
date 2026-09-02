"use client";
import Alert from "@/components/ui/alert/Alert";
import React, { createContext, useCallback, useContext, useRef, useState } from "react";

type ToastVariant = "success" | "error" | "warning" | "info";

interface ToastItem {
  id: number;
  variant: ToastVariant;
  title: string;
  message: string;
}

interface ToastContextValue {
  success: (title: string, message?: string) => void;
  error: (title: string, message?: string) => void;
  warning: (title: string, message?: string) => void;
  info: (title: string, message?: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const AUTO_DISMISS_MS = 5000;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const show = useCallback(
    (variant: ToastVariant, title: string, message?: string) => {
      const id = nextId.current++;
      setToasts((prev) => [...prev, { id, variant, title, message: message ?? "" }]);
      window.setTimeout(() => dismiss(id), AUTO_DISMISS_MS);
    },
    [dismiss]
  );

  const value: ToastContextValue = {
    success: (title, message) => show("success", title, message),
    error: (title, message) => show("error", title, message),
    warning: (title, message) => show("warning", title, message),
    info: (title, message) => show("info", title, message),
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed top-4 right-4 z-[99999] flex flex-col gap-3 w-full max-w-sm pointer-events-none">
        {toasts.map((toast) => (
          <div key={toast.id} className="relative pointer-events-auto shadow-theme-lg">
            <button
              onClick={() => dismiss(toast.id)}
              aria-label="Fermer la notification"
              className="absolute right-2 top-2 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
            >
              ✕
            </button>
            <Alert variant={toast.variant} title={toast.title} message={toast.message} />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return ctx;
}
