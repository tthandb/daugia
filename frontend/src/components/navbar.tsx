"use client";

import { useState } from "react";
import Link from "next/link";
import { Search, Menu, X } from "lucide-react";
import { COMPANY } from "@/lib/company";

const navLinks = [
  { label: "Nghiên Cứu", href: "/articles" },
  { label: "Giới Thiệu", href: "/about" },
];

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-warm-border bg-white">
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo — two-line: brand mark + legal name */}
        <Link
          href="/"
          className="flex flex-col leading-none"
          aria-label={COMPANY.legalName}
        >
          <span className="font-heading text-2xl font-bold text-charcoal">
            {COMPANY.brandMark}
          </span>
          <span className="hidden sm:block mt-1 font-body text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-fg">
            {COMPANY.legalNameUpper}
          </span>
        </Link>

        {/* Center nav — desktop */}
        <ul className="hidden items-center gap-8 md:flex">
          {navLinks.map((link) => (
            <li key={link.label}>
              <Link
                href={link.href}
                className="font-body text-sm font-medium uppercase tracking-wide text-charcoal transition-colors hover:text-gold"
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>

        {/* Right actions — desktop */}
        <div className="hidden items-center gap-4 md:flex">
          <Link
            href="/search"
            className="text-charcoal transition-colors hover:text-gold"
            aria-label="Tìm kiếm"
          >
            <Search className="h-5 w-5" />
          </Link>
          <Link
            href="/admin"
            className="font-body text-sm font-medium text-charcoal transition-colors hover:text-gold"
          >
            Quản Trị
          </Link>
        </div>

        {/* Mobile hamburger */}
        <button
          type="button"
          className="text-charcoal md:hidden"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label={mobileOpen ? "Đóng menu" : "Mở menu"}
        >
          {mobileOpen ? (
            <X className="h-6 w-6" />
          ) : (
            <Menu className="h-6 w-6" />
          )}
        </button>
      </nav>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 top-16 z-40 bg-white md:hidden">
          <div className="flex flex-col items-center gap-8 pt-12">
            {navLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="font-body text-lg font-medium uppercase tracking-wide text-charcoal transition-colors hover:text-gold"
                onClick={() => setMobileOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            <Link
              href="/search"
              className="flex items-center gap-2 font-body text-lg font-medium text-charcoal transition-colors hover:text-gold"
              onClick={() => setMobileOpen(false)}
            >
              <Search className="h-5 w-5" />
              Tìm Kiếm
            </Link>
            <Link
              href="/admin"
              className="font-body text-lg font-medium text-charcoal transition-colors hover:text-gold"
              onClick={() => setMobileOpen(false)}
            >
              Quản Trị
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
