"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard,
  FileText,
  FolderOpen,
  Tag,
  BarChart3,
  LogOut,
  Menu,
  X,
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
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Close the drawer on navigation.
  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

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
    // Full reload so middleware re-evaluates the (now cleared) cookie.
    window.location.href = "/login";
  }

  function isActive(href: string) {
    if (href === "/admin") return pathname === "/admin";
    return pathname.startsWith(href);
  }

  const sidebar = (
    <>
      <div className="flex h-16 items-center justify-between px-6">
        <Link
          href="/admin"
          className="flex items-center gap-2 font-heading text-xl font-bold text-brass"
        >
          <span className="grid h-8 w-8 place-items-center rounded-md bg-brass text-pine-deep">
            Đ
          </span>
          ĐẤUGIÁ.
        </Link>
        <button
          type="button"
          className="grid h-9 w-9 place-items-center rounded-md text-paper/60 hover:bg-white/5 lg:hidden"
          onClick={() => setDrawerOpen(false)}
          aria-label="Đóng menu"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

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
                  ? "border-l-[3px] border-brass bg-white/[0.06] text-brass"
                  : "border-l-[3px] border-transparent text-paper/70 hover:bg-white/5 hover:text-paper",
              )}
            >
              <Icon className="h-5 w-5 flex-shrink-0" />
              {link.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-white/10 px-3 py-4">
        <button
          type="button"
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 font-body text-sm font-medium text-paper/70 transition-colors hover:bg-white/5 hover:text-paper"
        >
          <LogOut className="h-5 w-5 flex-shrink-0" />
          Đăng Xuất
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-paper">
      {/* Desktop sidebar */}
      <aside className="fixed left-0 top-0 z-40 hidden h-screen w-64 flex-col bg-pine-deep lg:flex">
        {sidebar}
      </aside>

      {/* Mobile drawer */}
      {drawerOpen && (
        <div className="lg:hidden">
          <div
            className="fixed inset-0 z-40 bg-ink/50"
            onClick={() => setDrawerOpen(false)}
            aria-hidden
          />
          <aside className="fixed left-0 top-0 z-50 flex h-screen w-72 max-w-[80vw] flex-col bg-pine-deep">
            {sidebar}
          </aside>
        </div>
      )}

      {/* Mobile top bar */}
      <div className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-line bg-card px-4 lg:hidden">
        <button
          type="button"
          className="grid h-10 w-10 place-items-center rounded-md text-ink hover:bg-pine-pale"
          onClick={() => setDrawerOpen(true)}
          aria-label="Mở menu quản trị"
          aria-expanded={drawerOpen}
        >
          <Menu className="h-5 w-5" />
        </button>
        <span className="font-heading text-lg font-bold text-pine">ĐẤUGIÁ.</span>
      </div>

      {/* Content area */}
      <main className="min-h-screen p-4 sm:p-6 lg:ml-64 lg:p-8">{children}</main>
    </div>
  );
}
