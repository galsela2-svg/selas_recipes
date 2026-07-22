"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { CheckCircle2 } from "lucide-react";

type ToastState = { id: number; message: string } | null;
type ToastContextValue = { showToast: (message: string) => void };

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastState>(null);
  const idRef = useRef(0);

  const showToast = useCallback((message: string) => {
    idRef.current += 1;
    setToast({ id: idRef.current, message });
  }, []);

  const dismiss = useCallback(() => setToast(null), []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {toast && <ToastBanner key={toast.id} message={toast.message} onDismiss={dismiss} />}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

function ToastBanner({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  useEffect(() => {
    const timeout = setTimeout(onDismiss, 3500);
    return () => clearTimeout(timeout);
  }, [onDismiss]);

  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-50 flex justify-center px-4 pt-[calc(env(safe-area-inset-top)+0.75rem)]">
      <div className="toast-in pointer-events-auto flex max-w-[90vw] items-center gap-2 rounded-full bg-success px-4 py-2.5 text-sm font-medium text-white shadow-lg">
        <CheckCircle2 className="size-4.5 shrink-0" />
        <span className="line-clamp-1">{message}</span>
      </div>
    </div>
  );
}
