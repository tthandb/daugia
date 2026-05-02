const API_URL = process.env.API_URL || "http://localhost:8080";

interface FetchOptions extends RequestInit {
  params?: Record<string, string>;
}

async function apiFetch<T>(path: string, options: FetchOptions = {}): Promise<T> {
  const { params, ...fetchOptions } = options;

  let url = `${API_URL}${path}`;
  if (params) {
    const searchParams = new URLSearchParams(params);
    url += `?${searchParams.toString()}`;
  }

  const res = await fetch(url, {
    ...fetchOptions,
    headers: {
      "Content-Type": "application/json",
      ...fetchOptions.headers,
    },
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: "Request failed" }));
    throw new Error(error.error || `API error: ${res.status}`);
  }

  return parseJsonOrEmpty<T>(res);
}

async function parseJsonOrEmpty<T>(res: Response): Promise<T> {
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  if (!text) return undefined as T;
  return JSON.parse(text) as T;
}

// Server-side fetch — used by RSC pages. Defaults to no-store so admin pages
// always see fresh data; public pages should pass `next: { revalidate: N }`
// (or rely on the route segment's `export const revalidate`) so Vercel's edge
// can cache the rendered HTML between regenerations.
export async function serverFetch<T>(
  path: string,
  options: FetchOptions = {}
): Promise<T> {
  // Honour the caller's cache directive when provided; otherwise opt into
  // ISR via `next.revalidate` if the caller passed one, else fall back to
  // no-store so behaviour stays correct in admin-only callers.
  const hasCacheHint =
    options.cache !== undefined ||
    (options as { next?: { revalidate?: number } }).next?.revalidate !== undefined;
  return apiFetch<T>(path, {
    ...options,
    ...(hasCacheHint ? {} : { cache: "no-store" }),
  });
}

// Convenience helper for public pages — opts into ISR with the supplied TTL.
export async function publicFetch<T>(
  path: string,
  options: FetchOptions = {},
  revalidateSeconds = 300,
): Promise<T> {
  return apiFetch<T>(path, {
    ...options,
    next: { revalidate: revalidateSeconds, ...(options as { next?: object }).next },
  });
}

// Client-side fetch (relative URLs, browser sends cookies)
export async function clientFetch<T>(
  path: string,
  options: FetchOptions = {}
): Promise<T> {
  const { params, ...fetchOptions } = options;
  let url = `/api${path.replace(/^\/api/, "")}`;
  if (params) {
    url += `?${new URLSearchParams(params).toString()}`;
  }

  const res = await fetch(url, {
    ...fetchOptions,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...fetchOptions.headers,
    },
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: "Request failed" }));
    throw new Error(error.error || `API error: ${res.status}`);
  }

  return parseJsonOrEmpty<T>(res);
}

// Types
export interface Article {
  id: string;
  title: string;
  slug: string;
  description: string;
  /** Hand-written meta description for SEO + Article schema. Optional. */
  metaDescription?: string | null;
  authorName: string;
  contentHtml?: string;
  status: string;
  publishedAt: string | null;
  province: string | null;
  district: string | null;
  ward: string | null;
  assetType: string | null;
  plotCount: number | null;
  totalArea: string | null;
  thumbnailUrl: string | null;
  originalFileName?: string;
  originalFileMime?: string;
  viewCount: number;
  categoryId: string | null;
  categoryName: string | null;
  categorySlug: string | null;
  categoryColor: string | null;
  tags?: Tag[];
  images?: ArticleImage[];
  attachments?: ArticleAttachment[];
  rank?: number;
  createdAt: string;
  updatedAt: string;
  // Auction event fields — populated when admin fills them; drive Event JSON-LD.
  auctionStart?: string | null;
  auctionEnd?: string | null;
  venueName?: string | null;
  venueAddress?: string | null;
  startingPrice?: number | null;
  depositAmount?: number | null;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  color: string;
  sortOrder: number;
}

export interface Tag {
  id: string;
  name: string;
  slug: string;
}

export interface ArticleImage {
  id: string;
  url: string;
  fileName: string;
  altText: string;
  width: number;
  height: number;
  sizeBytes: number;
  sortOrder: number;
}

export interface ArticleAttachment {
  id: string;
  url: string;
  fileName: string;
  fileMime: string;
  sizeBytes: number;
  sortOrder: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  per_page: number;
  totalPages: number;
}

export interface AdminStats {
  totalArticles: number;
  published: number;
  drafts: number;
  archived: number;
  totalViews: number;
}
