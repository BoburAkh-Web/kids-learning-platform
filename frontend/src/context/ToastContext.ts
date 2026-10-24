import { createContext } from "react";

export type ToastType = "error" | "success" | "info";

export interface ToastApi {
  error: (message: string) => void;
  success: (message: string) => void;
  info: (message: string) => void;
}

export const ToastContext = createContext<ToastApi | null>(null);
