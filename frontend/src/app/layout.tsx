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
  },
  twitter: {
    card: "summary_large_image",
    title: COMPANY.legalName,
    description: `${COMPANY.tagline} — ${COMPANY.legalName}.`,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
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
