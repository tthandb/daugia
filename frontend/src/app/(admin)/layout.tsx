"use client";

import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard,
  FileText,
  FolderOpen,
  Tag,
  BarChart3,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";

const sidebarLinks = [
  { label: "Tổng Quan", href: "/admin", icon: LayoutDashboard },
  { label: "Bài Viết", href: "/admin/articles", icon: FileText },
  { label: "Danh Mục", href: "/admin/categories", icon: FolderOpen },
  { label: "Thẻ", href: "/admin/tags", icon: Tag },
  { label: "Phân Tích", href: "/admin/analytics", icon: BarChart3 },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  // Login page gets its own layout (no sidebar)
  if (pathname === "/login") {
    return <>{children}</>;
  }

  async function handleLogout() {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
    } catch {
      // proceed to redirect even if request fails
    }
    router.push("/login");
  }

  function isActive(href: string) {
    if (href === "/admin") return pathname === "/admin";
    return pathname.startsWith(href);
  }

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 z-40 flex h-screen w-64 flex-col bg-charcoal">
        {/* Logo */}
        <div className="flex h-16 items-center px-6">
          <Link href="/admin" className="font-heading text-2xl font-bold text-gold">
            ĐẤUGIÁ.
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 px-3 py-4">
          {sidebarLinks.map((link) => {
            const active = isActive(link.href);
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2.5 font-body text-sm font-medium transition-colors",
                  active
                    ? "border-l-4 border-gold bg-white/5 text-gold"
                    : "border-l-4 border-transparent text-white/70 hover:bg-white/5 hover:text-white"
                )}
              >
                <Icon className="h-5 w-5 flex-shrink-0" />
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Logout */}
        <div className="border-t border-white/10 px-3 py-4">
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 font-body text-sm font-medium text-white/70 transition-colors hover:bg-white/5 hover:text-white"
          >
            <LogOut className="h-5 w-5 flex-shrink-0" />
            Đăng Xuất
          </button>
        </div>
      </aside>

      {/* Content area */}
      <main className="ml-64 min-h-screen flex-1 bg-warm-white p-8">
        {children}
      </main>
    </div>
  );
}
