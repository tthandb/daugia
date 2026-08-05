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
  const cancelRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !loading) {
        e.preventDefault();
        onClose();
        return;
      }
      // Focus trap — keep Tab within the dialog.
      if (e.key === "Tab" && dialogRef.current) {
        const focusables = dialogRef.current.querySelectorAll<HTMLElement>(
          "button:not([disabled])",
        );
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }
    document.addEventListener("keydown", handleKey);

    // Focus the SAFE control by default so a reflexive Enter cancels rather than
    // confirms a destructive action.
    const t = setTimeout(() => cancelRef.current?.focus(), 60);

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
      <div
        ref={dialogRef}
        className="w-full max-w-sm rounded-xl bg-card p-6 shadow-2xl ring-1 ring-line animate-dialog-in"
      >
        <h3
          id="confirm-dialog-title"
          className="font-heading text-lg font-semibold text-ink"
        >
          {title}
        </h3>
        <div className="mt-2 font-body text-sm leading-relaxed text-ink-soft">
          {description}
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button
            ref={cancelRef}
            type="button"
            onClick={onClose}
            disabled={loading}
            className="rounded-md border border-line bg-card px-4 py-2 font-body text-sm font-medium text-ink transition-colors hover:bg-pine-pale disabled:cursor-not-allowed disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={cn(
              "inline-flex min-w-[5rem] items-center justify-center gap-1.5 rounded-md px-4 py-2 font-body text-sm font-medium text-white transition-colors disabled:cursor-not-allowed disabled:opacity-70",
              destructive
                ? "bg-red-600 hover:bg-red-700"
                : "bg-pine hover:bg-brass",
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
