import Link from "next/link";

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="bg-charcoal text-warm-white">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center gap-6 text-center">
          {/* Company name */}
          <Link
            href="/"
            className="font-heading text-2xl font-bold text-warm-white"
          >
            ĐẤUGIÁ.
          </Link>

          <p className="font-body text-sm font-medium uppercase tracking-wider text-warm-white/80">
            Công Ty Đấu Giá Hợp Danh Vĩnh Yên
          </p>

          {/* Contact info */}
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 font-body text-sm text-warm-white/60">
            <a
              href="tel:0912535999"
              className="transition-colors hover:text-gold"
            >
              0912535999
            </a>
            <span className="hidden sm:inline">|</span>
            <span>MST: 2500634576</span>
          </div>

          {/* Nav links */}
          <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 font-body text-sm">
            <Link
              href="/articles"
              className="text-warm-white/60 transition-colors hover:text-gold"
            >
              Nghiên Cứu
            </Link>
            <Link
              href="#"
              className="text-warm-white/60 transition-colors hover:text-gold"
            >
              Đấu Giá
            </Link>
            <Link
              href="#"
              className="text-warm-white/60 transition-colors hover:text-gold"
            >
              Giới Thiệu
            </Link>
          </nav>

          {/* Divider */}
          <div className="h-px w-full max-w-xs bg-warm-white/10" />

          {/* Copyright */}
          <p className="font-body text-xs text-warm-white/40">
            &copy; {year} Công Ty Đấu Giá Hợp Danh Vĩnh Yên. Bản quyền thuộc
            về công ty.
          </p>
        </div>
      </div>
    </footer>
  );
}
