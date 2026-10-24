import { useContext } from "react";
import { ToastContext } from "../context/ToastContext";

export function useToast() {
  const toast = useContext(ToastContext);
  if (!toast) {
    throw new Error("useToast faqat ToastProvider ichida ishlatiladi");
  }
  return toast;
}
