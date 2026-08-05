"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search, Menu, X } from "lucide-react";
import { COMPANY } from "@/lib/company";

const navLinks = [
  { label: "Thông Báo", href: "/articles" },
  { label: "Giới Thiệu", href: "/about" },
];

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  // Lock body scroll while the mobile menu is open.
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  // Close on route change.
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const isActive = (href: string) =>
    href === "/articles"
      ? pathname.startsWith("/articles") || pathname.startsWith("/categories")
      : pathname === href;

  return (
    <header className="sticky top-0 z-50 w-full border-b border-line bg-paper/90 backdrop-blur supports-[backdrop-filter]:bg-paper/80">
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Wordmark */}
        <Link
          href="/"
          className="flex items-center gap-2.5 leading-none"
          aria-label={COMPANY.legalName}
        >
          <span
            aria-hidden
            className="grid h-9 w-9 place-items-center rounded-md bg-pine font-heading text-lg font-bold text-paper"
          >
            Đ
          </span>
          <span className="flex flex-col">
            <span className="font-heading text-xl font-bold tracking-tight text-ink">
              {COMPANY.brandMark}
            </span>
            <span className="hidden sm:block font-body text-[9px] font-semibold uppercase tracking-[0.16em] text-ink-faint">
              {COMPANY.legalNameUpper}
            </span>
          </span>
        </Link>

        {/* Center nav — desktop */}
        <ul className="hidden items-center gap-8 md:flex">
          {navLinks.map((link) => (
            <li key={link.label}>
              <Link
                href={link.href}
                className={`relative font-body text-sm font-medium tracking-wide transition-colors after:absolute after:-bottom-1.5 after:left-0 after:h-0.5 after:bg-brass after:transition-all ${
                  isActive(link.href)
                    ? "text-pine after:w-full"
                    : "text-ink-soft after:w-0 hover:text-ink hover:after:w-full"
                }`}
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>

        {/* Right actions — desktop */}
        <div className="hidden items-center gap-1 md:flex">
          <Link
            href="/search"
            className="grid h-10 w-10 place-items-center rounded-md text-ink-soft transition-colors hover:bg-pine-pale hover:text-pine"
            aria-label="Tìm kiếm"
          >
            <Search className="h-5 w-5" />
          </Link>
        </div>

        {/* Mobile: search + hamburger, both ≥44px */}
        <div className="flex items-center gap-1 md:hidden">
          <Link
            href="/search"
            className="grid h-11 w-11 place-items-center rounded-md text-ink-soft transition-colors hover:bg-pine-pale hover:text-pine"
            aria-label="Tìm kiếm"
          >
            <Search className="h-5 w-5" />
          </Link>
          <button
            type="button"
            className="grid h-11 w-11 place-items-center rounded-md text-ink transition-colors hover:bg-pine-pale"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label={mobileOpen ? "Đóng menu" : "Mở menu"}
            aria-expanded={mobileOpen}
            aria-controls="mobile-menu"
          >
            {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </nav>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          id="mobile-menu"
          className="fixed inset-0 top-16 z-40 bg-paper md:hidden"
        >
          <nav className="flex flex-col gap-1 p-4">
            {navLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className={`rounded-lg px-4 py-3.5 font-body text-base font-medium transition-colors ${
                  isActive(link.href)
                    ? "bg-pine-pale text-pine"
                    : "text-ink hover:bg-pine-pale/60"
                }`}
              >
                {link.label}
              </Link>
            ))}
            <Link
              href="/search"
              className="flex items-center gap-3 rounded-lg px-4 py-3.5 font-body text-base font-medium text-ink transition-colors hover:bg-pine-pale/60"
            >
              <Search className="h-5 w-5 text-pine" />
              Tìm Kiếm
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
