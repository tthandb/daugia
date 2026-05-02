import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/react";
import { COMPANY } from "@/lib/company";
import { OrganizationJsonLd } from "@/components/seo/organization-jsonld";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(COMPANY.url),
  title: {
    default: `${COMPANY.legalName} — ${COMPANY.tagline}`,
    template: `%s | ${COMPANY.shortName}`,
  },
  description:
    `${COMPANY.legalName} — đấu giá bất động sản tại ${COMPANY.address.region}. ` +
    `Cổng nghiên cứu thị trường cho nhà đầu tư & chuyên gia đấu giá. MST ${COMPANY.taxId}.`,
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
  themeColor: "#1C1917",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi">
      <body>
        <OrganizationJsonLd />
        {children}
        <Analytics />
      </body>
    </html>
  );
}
