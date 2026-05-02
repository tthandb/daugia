import type { MetadataRoute } from "next";

const API_URL = process.env.API_URL || "http://localhost:8080";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://daugia.vercel.app";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = [
    { url: SITE_URL, lastModified: new Date(), changeFrequency: "daily", priority: 1 },
    { url: `${SITE_URL}/articles`, lastModified: new Date(), changeFrequency: "daily", priority: 0.9 },
    { url: `${SITE_URL}/about`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.7 },
    { url: `${SITE_URL}/search`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.5 },
  ];

  try {
    const res = await fetch(`${API_URL}/api/sitemap`, { next: { revalidate: 3600 } });
    if (res.ok) {
      const { data } = await res.json();
      for (const item of data) {
        entries.push({
          url: `${SITE_URL}/articles/${item.slug}`,
          lastModified: new Date(item.updatedAt),
          changeFrequency: "weekly",
          priority: 0.8,
        });
      }
    }
  } catch {
    // API unavailable — return static entries only
  }

  return entries;
}
