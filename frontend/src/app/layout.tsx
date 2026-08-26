import type { Metadata, Viewport } from "next";
import { Lora, Be_Vietnam_Pro, IBM_Plex_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/react";
import { COMPANY } from "@/lib/company";
import { OrganizationJsonLd } from "@/components/seo/organization-jsonld";
import "./globals.css";

// Self-hosted via next/font (no render-blocking Google Fonts @import).
// Lora — serif for display headings + the legal notice body (Vietnamese subset).
const serif = Lora({
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-serif",
  display: "swap",
});
// Be Vietnam Pro — UI/body, purpose-built for Vietnamese.
const sans = Be_Vietnam_Pro({
  subsets: ["latin", "vietnamese"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-sans",
  display: "swap",
});
// IBM Plex Mono — auction data (dates, prices, notice numbers). Latin/numeric.
const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(COMPANY.url),
  title: {
    default: `${COMPANY.legalName} — ${COMPANY.tagline}`,
    template: `%s | ${COMPANY.shortName}`,
  },
  description:
    `${COMPANY.legalName} — công bố thông báo đấu giá bất động sản, quyền sử dụng đất ` +
    `và tài sản tại ${COMPANY.address.region}.`,
  applicationName: COMPANY.legalName,
  authors: [{ name: COMPANY.legalName, url: COMPANY.url }],
  creator: COMPANY.legalName,
  publisher: COMPANY.legalName,
  keywords: [
    "đấu giá bất động sản",
    "đấu giá Phú Thọ",
    "đấu giá Vĩnh Phúc",
    "công ty đấu giá hợp danh",
    "Vĩnh Yên",
    COMPANY.legalName,
  ],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "vi_VN",
    url: COMPANY.url,
    siteName: COMPANY.legalName,
    title: COMPANY.legalName,
    description: `${COMPANY.tagline} — ${COMPANY.legalName}.`,
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: COMPANY.legalName,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: COMPANY.legalName,
    description: `${COMPANY.tagline} — ${COMPANY.legalName}.`,
    images: ["/twitter-image"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  // Search-console verification — populate via env so each console can be
  // verified without code changes. Empty values are simply omitted by Next.
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION,
    yandex: process.env.YANDEX_VERIFICATION,
    other: {
      ...(process.env.BING_SITE_VERIFICATION && {
        "msvalidate.01": process.env.BING_SITE_VERIFICATION,
      }),
      ...(process.env.COCCOC_VERIFICATION && {
        "coccoc-verification": process.env.COCCOC_VERIFICATION,
      }),
    },
  },
};

export const viewport: Viewport = {
  themeColor: "#1B4332",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="vi"
      className={`${serif.variable} ${sans.variable} ${mono.variable}`}
    >
      <body>
        <OrganizationJsonLd />
        {children}
        <Analytics />
      </body>
    </html>
  );
}
