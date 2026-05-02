import type { Metadata } from "next";
import { MapPin, Phone, FileText, Calendar, User, Building2, ExternalLink } from "lucide-react";
import { COMPANY, mapsEmbedUrl, mapsSearchUrl } from "@/lib/company";

export const metadata: Metadata = {
  title: "Giới Thiệu",
  description:
    `${COMPANY.legalName} — công ty đấu giá hợp danh tại ${COMPANY.address.region}. ` +
    `Thành lập ${COMPANY.founded}, MST ${COMPANY.taxId}, đại diện ${COMPANY.representative}.`,
  alternates: { canonical: "/about" },
  openGraph: {
    url: `${COMPANY.url}/about`,
    title: `Giới Thiệu | ${COMPANY.shortName}`,
    description: `${COMPANY.legalName} — đấu giá tại ${COMPANY.address.region}.`,
  },
};

const formattedFounded = new Date(COMPANY.founded).toLocaleDateString("vi-VN", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

const infoRows: { icon: typeof MapPin; label: string; value: string }[] = [
  { icon: Building2, label: "Tên đầy đủ", value: COMPANY.legalNameUpper },
  { icon: FileText, label: "Mã số thuế", value: COMPANY.taxId },
  { icon: Calendar, label: "Ngày thành lập", value: formattedFounded },
  { icon: User, label: "Người đại diện", value: COMPANY.representative },
  { icon: Phone, label: "Điện thoại", value: COMPANY.phoneDisplay },
  { icon: MapPin, label: "Địa chỉ", value: COMPANY.address.full },
];

export default function AboutPage() {
  return (
    <>
      {/* Hero */}
      <section className="relative bg-charcoal py-20 sm:py-24">
        <div className="absolute inset-0 bg-[url('/grain.png')] opacity-5" />
        <div className="container-narrow relative">
          <p className="font-body text-xs font-semibold uppercase tracking-[0.3em] text-gold sm:text-sm">
            Giới Thiệu
          </p>
          <h1 className="mt-4 font-heading text-3xl font-bold leading-tight text-white sm:text-4xl lg:text-5xl">
            {COMPANY.legalNameUpper}
          </h1>
          <p className="mt-6 max-w-2xl font-body text-base text-stone-400 leading-relaxed sm:text-lg">
            Công ty đấu giá hợp danh hoạt động tại {COMPANY.address.region},
            chuyên về đấu giá bất động sản và tài sản. Cổng thông tin nghiên
            cứu thị trường phục vụ nhà đầu tư, chuyên gia định giá và cơ quan
            quản lý.
          </p>
        </div>
      </section>

      {/* Company info grid */}
      <section className="py-16">
        <div className="container-narrow">
          <h2 className="font-heading text-2xl font-bold text-charcoal sm:text-3xl">
            Thông Tin Công Ty
          </h2>
          <dl className="mt-8 grid gap-x-8 gap-y-6 sm:grid-cols-2">
            {infoRows.map((row) => {
              const Icon = row.icon;
              return (
                <div key={row.label} className="flex items-start gap-4">
                  <div className="mt-1 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-md bg-gold-pale">
                    <Icon className="h-5 w-5 text-gold" />
                  </div>
                  <div className="min-w-0">
                    <dt className="font-body text-xs font-semibold uppercase tracking-wider text-muted-fg">
                      {row.label}
                    </dt>
                    <dd className="mt-1 font-body text-sm text-charcoal sm:text-base">
                      {row.value}
                    </dd>
                  </div>
                </div>
              );
            })}
          </dl>
        </div>
      </section>

      {/* Map */}
      <section className="border-t border-warm-border bg-stone-50 py-16">
        <div className="container-narrow">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="font-heading text-2xl font-bold text-charcoal sm:text-3xl">
                Vị Trí Văn Phòng
              </h2>
              <address className="mt-2 not-italic font-body text-sm text-muted-fg sm:text-base">
                {COMPANY.address.full}
              </address>
            </div>
            <a
              href={mapsSearchUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 font-body text-sm font-medium text-gold transition-colors hover:text-gold-light"
            >
              Mở trên Google Maps
              <ExternalLink className="h-4 w-4" />
            </a>
          </div>

          <div className="mt-6 overflow-hidden rounded-lg border border-warm-border bg-white shadow-sm">
            <iframe
              title={`Bản đồ ${COMPANY.legalName}`}
              src={mapsEmbedUrl()}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              className="aspect-video w-full"
            />
          </div>
        </div>
      </section>
    </>
  );
}
