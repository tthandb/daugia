import Link from "next/link";
import { MapPin, Phone, FileText } from "lucide-react";
import { COMPANY, mapsSearchUrl } from "@/lib/company";

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t-4 border-brass bg-pine-deep text-paper/80">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr]">
          {/* Brand + identity */}
          <div>
            <Link href="/" className="inline-flex items-center gap-2.5">
              <span
                aria-hidden
                className="grid h-9 w-9 place-items-center rounded-md bg-brass font-heading text-lg font-bold text-pine-deep"
              >
                Đ
              </span>
              <span className="font-heading text-xl font-bold text-paper">
                {COMPANY.brandMark}
              </span>
            </Link>
            <p className="mt-4 max-w-sm font-body text-sm leading-relaxed text-paper/70">
              {COMPANY.legalName} — công bố các thông báo đấu giá tài sản, bất
              động sản và quyền sử dụng đất tại {COMPANY.address.region}.
            </p>
            <p className="mt-4 font-mono text-xs tracking-tight text-paper/50">
              MST {COMPANY.taxId} · Đại diện {COMPANY.representative}
            </p>
          </div>

          {/* Contact */}
          <div>
            <h2 className="eyebrow text-brass/80">Liên hệ</h2>
            <ul className="mt-4 space-y-3 font-body text-sm">
              <li>
                <a
                  href={mapsSearchUrl()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-start gap-2.5 text-paper/70 transition-colors hover:text-brass"
                >
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-brass/70" />
                  <span>{COMPANY.address.full}</span>
                </a>
              </li>
              <li>
                <a
                  href={`tel:${COMPANY.phoneTel}`}
                  className="flex items-center gap-2.5 text-paper/70 transition-colors hover:text-brass"
                >
                  <Phone className="h-4 w-4 shrink-0 text-brass/70" />
                  <span className="data">{COMPANY.phoneDisplay}</span>
                </a>
              </li>
            </ul>
          </div>

          {/* Quick links */}
          <div>
            <h2 className="eyebrow text-brass/80">Liên kết</h2>
            <ul className="mt-4 space-y-3 font-body text-sm">
              <li>
                <Link
                  href="/articles"
                  className="inline-flex items-center gap-2.5 text-paper/70 transition-colors hover:text-brass"
                >
                  <FileText className="h-4 w-4 shrink-0 text-brass/70" />
                  Thông Báo Đấu Giá
                </Link>
              </li>
              <li>
                <Link
                  href="/about"
                  className="text-paper/70 transition-colors hover:text-brass"
                >
                  Giới Thiệu Công Ty
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-paper/10 pt-6 text-center sm:flex-row sm:text-left">
          <p className="font-body text-xs text-paper/45">
            &copy; {year} {COMPANY.legalName}. Bản quyền thuộc về công ty.
          </p>
          <div className="flex flex-col items-center gap-3 sm:flex-row sm:gap-6">
            <p className="font-body text-xs text-paper/45">
              Thông tin đấu giá được công bố theo quy định pháp luật.
            </p>
            <Link
              href="/login"
              rel="nofollow"
              className="font-body text-xs text-paper/35 transition-colors hover:text-brass"
            >
              Quản trị
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
