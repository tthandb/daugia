import type { AuctionStatus } from "@/lib/auction";

const STYLES: Record<string, string> = {
  soon: "bg-status-soon-bg text-status-soon",
  open: "bg-status-open-bg text-status-open",
  ended: "bg-status-ended-bg text-status-ended",
};

/**
 * Live auction status pill. A leading dot (solid for the active "open" state)
 * gives an at-a-glance read even in dense lists.
 */
export function StatusBadge({
  status,
  className = "",
}: {
  status: AuctionStatus;
  className?: string;
}) {
  if (status.key === "none") return null;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-body text-[0.6875rem] font-semibold ${STYLES[status.key]} ${className}`}
    >
      <span
        aria-hidden
        className={`h-1.5 w-1.5 rounded-full ${
          status.key === "open" ? "animate-pulse bg-current" : "bg-current"
        }`}
      />
      {status.label}
    </span>
  );
}

/**
 * Returns readable text color (near-black vs white) for a given background hex,
 * so an admin-picked pale category color doesn't produce white-on-yellow.
 */
export function readableTextOn(hex: string | null | undefined): string {
  if (!hex) return "#FFFFFF";
  const m = hex.replace("#", "");
  const full =
    m.length === 3
      ? m.split("").map((c) => c + c).join("")
      : m.padEnd(6, "0").slice(0, 6);
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  // Relative luminance (sRGB) — threshold picks dark ink on light backgrounds.
  const L = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  return L > 0.62 ? "#16211C" : "#FFFFFF";
}
