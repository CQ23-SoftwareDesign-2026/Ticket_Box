"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from "lucide-react";

export type ToastType = "success" | "error" | "info" | "warning";

export interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

interface ToastContextType {
  toast: (message: string, type?: ToastType, duration?: number) => void;
  success: (message: string, duration?: number) => void;
  error: (message: string, duration?: number) => void;
  info: (message: string, duration?: number) => void;
  warning: (message: string, duration?: number) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    (message: string, type: ToastType = "info", duration = 4000) => {
      const id = Math.random().toString(36).substring(2, 9);
      setToasts((prev) => [...prev, { id, message, type, duration }]);

      if (duration > 0) {
        setTimeout(() => {
          removeToast(id);
        }, duration);
      }
    },
    [removeToast]
  );

  const success = useCallback((msg: string, dur?: number) => toast(msg, "success", dur), [toast]);
  const error = useCallback((msg: string, dur?: number) => toast(msg, "error", dur), [toast]);
  const info = useCallback((msg: string, dur?: number) => toast(msg, "info", dur), [toast]);
  const warning = useCallback((msg: string, dur?: number) => toast(msg, "warning", dur), [toast]);

  const styles = {
    success: "bg-emerald-950/90 border-emerald-500/20 text-emerald-300",
    error: "bg-red-950/90 border-red-500/20 text-red-300",
    info: "bg-blue-950/90 border-blue-500/20 text-blue-300",
    warning: "bg-amber-950/90 border-amber-500/20 text-amber-300",
  };

  const icons = {
    success: <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-400" />,
    error: <AlertCircle className="h-5 w-5 shrink-0 text-red-400" />,
    info: <Info className="h-5 w-5 shrink-0 text-blue-400" />,
    warning: <AlertTriangle className="h-5 w-5 shrink-0 text-amber-400" />,
  };

  return (
    <ToastContext.Provider value={{ toast, success, error, info, warning }}>
      {children}
      <div className="fixed top-20 right-6 z-[200] flex flex-col gap-3 max-w-sm w-[calc(100vw-3rem)] md:w-96 pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-start gap-3 rounded-2xl border p-4 text-sm shadow-2xl backdrop-blur-md transition-all duration-300 ease-out animate-in fade-in slide-in-from-top-5 ${styles[t.type]}`}
          >
            {icons[t.type]}
            <div className="flex-1 pr-6 leading-relaxed text-left">{t.message}</div>
            <button
              type="button"
              onClick={() => removeToast(t.id)}
              className="text-on-surface-variant/40 hover:text-on-surface transition-colors cursor-pointer"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}
