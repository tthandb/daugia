import Link from "next/link";
import { COMPANY, mapsSearchUrl } from "@/lib/company";

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="bg-charcoal text-warm-white">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center gap-6 text-center">
          {/* Brand mark */}
          <Link
            href="/"
            className="font-heading text-2xl font-bold text-warm-white"
          >
            {COMPANY.brandMark}
          </Link>

          <p className="font-body text-sm font-medium uppercase tracking-wider text-warm-white/80">
            {COMPANY.legalNameUpper}
          </p>

          {/* Address */}
          <address className="not-italic font-body text-sm text-warm-white/70">
            <a
              href={mapsSearchUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="transition-colors hover:text-gold"
            >
              {COMPANY.address.full}
            </a>
          </address>

          {/* Contact info */}
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 font-body text-sm text-warm-white/60">
            <a
              href={`tel:${COMPANY.phoneTel}`}
              className="transition-colors hover:text-gold"
            >
              {COMPANY.phoneDisplay}
            </a>
            <span className="hidden sm:inline">|</span>
            <span>MST: {COMPANY.taxId}</span>
            <span className="hidden sm:inline">|</span>
            <span>Đại diện: {COMPANY.representative}</span>
          </div>

          {/* Nav links */}
          <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 font-body text-sm">
            <Link
              href="/articles"
              className="text-warm-white/60 transition-colors hover:text-gold"
            >
              Thông Báo
            </Link>
            <Link
              href="/about"
              className="text-warm-white/60 transition-colors hover:text-gold"
            >
              Giới Thiệu
            </Link>
          </nav>

          {/* Divider */}
          <div className="h-px w-full max-w-xs bg-warm-white/10" />

          {/* Copyright */}
          <p className="font-body text-xs text-warm-white/40">
            &copy; {year} {COMPANY.legalName}. Bản quyền thuộc về công ty.
          </p>
        </div>
      </div>
    </footer>
  );
}
