import { useCallback, useMemo, useState, type ReactNode } from "react";
import {
  CircleAlert,
  CircleCheck,
  Info,
  X,
  type LucideIcon,
} from "lucide-react";
import { ToastContext, type ToastType } from "../context/ToastContext";

// Har bir xabar shuncha vaqtdan keyin yo'qoladi (ms)
const DURATION = 3000;

interface Toast {
  id: number;
  type: ToastType;
  message: string;
}

const variants: Record<
  ToastType,
  { title: string; icon: LucideIcon; border: string; badge: string }
> = {
  error: {
    title: "Xatolik",
    icon: CircleAlert,
    border: "border-red-200",
    badge: "bg-red-100 text-red-600",
  },
  success: {
    title: "Muvaffaqiyatli",
    icon: CircleCheck,
    border: "border-emerald-200",
    badge: "bg-emerald-100 text-emerald-600",
  },
  info: {
    title: "Ma'lumot",
    icon: Info,
    border: "border-sky-200",
    badge: "bg-sky-100 text-sky-600",
  },
};

let nextId = 0;

export default function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const remove = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const show = useCallback(
    (type: ToastType, message: string) => {
      const id = ++nextId;
      setToasts((prev) => [...prev, { id, type, message }]);
      setTimeout(() => remove(id), DURATION);
    },
    [remove],
  );

  const api = useMemo(
    () => ({
      error: (message: string) => show("error", message),
      success: (message: string) => show("success", message),
      info: (message: string) => show("info", message),
    }),
    [show],
  );

  return (
    <ToastContext value={api}>
      {children}
      <div className="fixed right-4 top-4 z-50 flex w-80 max-w-[calc(100vw-2rem)] flex-col gap-3">
        {toasts.map((t) => {
          const v = variants[t.type];
          const Icon = v.icon;
          return (
            <div
              key={t.id}
              role={t.type === "error" ? "alert" : "status"}
              className={`flex animate-toast-in items-start gap-3 rounded-2xl border bg-white p-4 text-ink shadow-lg ${v.border}`}
            >
              <span
                className={`flex size-9 shrink-0 items-center justify-center rounded-full ${v.badge}`}
              >
                <Icon className="size-5" />
              </span>
              <div className="flex-1 pt-0.5">
                <p className="font-display font-semibold">{v.title}</p>
                <p className="text-sm text-ink/80">{t.message}</p>
              </div>
              <button
                type="button"
                aria-label="Yopish"
                onClick={() => remove(t.id)}
                className="text-ink/50 hover:text-ink"
              >
                <X className="size-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext>
  );
}
