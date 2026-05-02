import type { MetadataRoute } from "next";
import { COMPANY } from "@/lib/company";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: COMPANY.legalName,
    short_name: COMPANY.shortName,
    description: `${COMPANY.tagline} — ${COMPANY.legalName}.`,
    start_url: "/",
    display: "standalone",
    background_color: "#FAFAF9",
    theme_color: "#1C1917",
    lang: "vi-VN",
    icons: [
      { src: "/icon", sizes: "32x32", type: "image/png" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
  };
}
