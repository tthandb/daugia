import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Vietnam has a single timezone; pin it so dates render in local time regardless
// of where the server (Vercel, UTC) runs. Without this an early-morning ICT
// timestamp could render as the previous day.
const TIME_ZONE = "Asia/Ho_Chi_Minh";

export function formatDate(date: string | null): string {
  if (!date) return "";
  return new Intl.DateTimeFormat("vi-VN", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(date));
}

// formatDateTime includes the hour and minute — use it for auction times, where
// dropping the hour (as formatDate does) would leave bidders unable to tell
// whether an auction is at 08:00 or 14:00.
export function formatDateTime(date: string | null): string {
  if (!date) return "";
  return new Intl.DateTimeFormat("vi-VN", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

export function estimateReadingTime(plainText: string): number {
  const words = plainText.trim().split(/\s+/).length;
  return Math.max(1, Math.ceil(words / 200));
}
