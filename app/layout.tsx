import "./globals.css"
import Header from "@/components/header/header"
import SupabaseProvider from "@/context/supabase.context"
import { cn } from "@/lib/utils"
import { Inter } from "next/font/google"
import Script from "next/script"
import { SpeedInsights } from "@vercel/speed-insights/next"
import type { Metadata } from "next"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  metadataBase: new URL(process?.env?.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: {
    default: "Công ty Đấu giá Hợp danh Vĩnh Yên",
    template: `%s | Công ty Đấu giá Hợp danh Vĩnh Yên`
  },
  description: "Trang web đăng tải thông tin đấu giá của Công ty Đấu giá Hợp danh Vĩnh Yên",
  keywords: [
    "đấu giá hợp danh Vĩnh Yên",
    "website đấu giá Vĩnh Yên",
    "sàn đấu giá tỉnh Vĩnh Phúc",
    "mua bán đấu giá Vĩnh Yên",
    "danh sách đấu giá Vĩnh Yên",
    "đấu giá trực tuyến Vĩnh Yên",
    "sàn đấu giá hợp danh",
    "đấu giá online Vĩnh Yên",
    "mạng đấu giá Vĩnh Yên",
    "đấu giá đất đai Vĩnh Yên",
    "đấu giá đất nền Vĩnh Phúc",
    "sàn giao dịch đất đai Vĩnh Yên",
    "đấu giá sản phẩm Vĩnh Yên",
    "mua bán online Vĩnh Yên",
    "website mua bán đấu giá Vĩnh Yên"
  ],
  verification: {
    google: "google-site-verification=878787878"
  }
}

export const dynamic = "force-dynamic"

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang='en'>
      <Script id='site-name-script' type='application/ld+json'>{`
          {
            "@context" : "https://schema.org",
            "@type" : "WebSite",
            "name" : "Đấu giá hợp danh Vĩnh Yên",
            "alternateName" : "Đấu giá Vĩnh Yên",
            "url" : "https://www.daugiahopdanhvinhyen.com/"
          }
        `}</Script>
      <body className={cn(inter.className, "bg-accent")}>
        <SupabaseProvider>
          <Header />
          {children}
        </SupabaseProvider>
        <SpeedInsights />
      </body>
    </html>
  )
}
