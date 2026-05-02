"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Xác nhận",
  cancelLabel = "Huỷ",
  destructive = false,
  loading = false,
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !loading) {
        e.preventDefault();
        onClose();
      }
    }
    document.addEventListener("keydown", handleKey);

    const t = setTimeout(() => confirmRef.current?.focus(), 60);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKey);
      clearTimeout(t);
    };
  }, [open, loading, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-overlay-in"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !loading) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
    >
      <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-2xl ring-1 ring-warm-border animate-dialog-in">
        <h3
          id="confirm-dialog-title"
          className="font-heading text-lg font-semibold text-charcoal"
        >
          {title}
        </h3>
        <div className="mt-2 font-body text-sm leading-relaxed text-muted-fg">
          {description}
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="rounded-md border border-warm-border bg-white px-4 py-2 font-body text-sm font-medium text-charcoal transition-colors hover:bg-warm-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmRef}
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={cn(
              "inline-flex min-w-[5rem] items-center justify-center gap-1.5 rounded-md px-4 py-2 font-body text-sm font-medium text-white transition-colors disabled:cursor-not-allowed disabled:opacity-70",
              destructive
                ? "bg-red-600 hover:bg-red-700"
                : "bg-charcoal hover:bg-gold"
            )}
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {loading ? "Đang xử lý..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
