// Auction-specific helpers: live status derived from the schedule, and money
// formatting. These power the "docket" fact strips and status badges that make
// each notice scannable as a live auction record rather than a blog post.

export type AuctionStatusKey = "soon" | "open" | "ended" | "none";

export interface AuctionStatus {
  key: AuctionStatusKey;
  label: string;
}

interface AuctionFields {
  auctionStart?: string | null;
  auctionEnd?: string | null;
}

/**
 * Derives a coarse live status from the auction schedule. Without an end time we
 * treat the auction as running until the end of its start day. `none` means the
 * notice has no scheduled auction time recorded.
 */
export function auctionStatus(a: AuctionFields, now: Date = new Date()): AuctionStatus {
  if (!a.auctionStart) return { key: "none", label: "" };
  const start = new Date(a.auctionStart);
  if (Number.isNaN(start.getTime())) return { key: "none", label: "" };

  const end = a.auctionEnd
    ? new Date(a.auctionEnd)
    : new Date(start.getTime() + 24 * 60 * 60 * 1000);

  if (now < start) return { key: "soon", label: "Sắp diễn ra" };
  if (now <= end) return { key: "open", label: "Đang diễn ra" };
  return { key: "ended", label: "Đã kết thúc" };
}

/** Formats a VND amount the Vietnamese way: 635.856.300 ₫. */
export function formatVnd(amount: number | null | undefined): string | null {
  if (amount === null || amount === undefined || Number.isNaN(amount)) return null;
  return new Intl.NumberFormat("vi-VN").format(amount) + " ₫";
}

/** Joins the location parts (ward, district, province) into one readable line. */
export function formatLocation(a: {
  ward?: string | null;
  district?: string | null;
  province?: string | null;
}): string | null {
  const parts = [a.ward, a.district, a.province].filter(Boolean);
  return parts.length ? parts.join(", ") : null;
}
