import "./globals.css";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Header from "@/app/header";
import SupabaseProvider from "@/context/supabase.context";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "CÔNG TY ĐẤU GIÁ HỢP DANH VĨNH YÊN",
  description: "Generated by create next app",
};

export const dynamic = "force-dynamic";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <SupabaseProvider>
          <Header />
          {children}
        </SupabaseProvider>
      </body>
    </html>
  );
}
