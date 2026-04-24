import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/react";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "ĐẤUGIÁ - Nghiên Cứu Thị Trường Đấu Giá",
    template: "%s | ĐẤUGIÁ",
  },
  description:
    "Cổng thông tin nghiên cứu thị trường đấu giá bất động sản - Công ty Đấu giá Hợp danh Vĩnh Yên",
  openGraph: {
    type: "website",
    locale: "vi_VN",
    siteName: "ĐẤUGIÁ",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi">
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
