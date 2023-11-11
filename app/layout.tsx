import "./globals.css"
import Header from "@/components/header/header"
import SupabaseProvider from "@/context/supabase.context"
import { cn } from "@/lib/utils"
import { Inter } from "next/font/google"
import type { Metadata } from "next"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  metadataBase: new URL(process?.env?.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: {
    default: "Công ty Đấu giá Hợp danh Vĩnh Yên",
    template: `%s | Công ty Đấu giá Hợp danh Vĩnh Yên`
  },
  description: "Trang web đăng tải thông tin đấu giá của Công ty Đấu giá Hợp danh Vĩnh Yên",
  verification: {
    google: "google-site-verification=878787878"
  }
}

export const dynamic = "force-dynamic"

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang='en'>
      <body className={cn(inter.className, "bg-accent")}>
        <SupabaseProvider>
          <Header />
          {children}
        </SupabaseProvider>
      </body>
    </html>
  )
}
