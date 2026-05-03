import type { Metadata } from "next";
import {
  MapPin,
  Phone,
  FileText,
  Calendar,
  User,
  Building2,
  ExternalLink,
  Scale,
  Gavel,
  Shield,
} from "lucide-react";
import { COMPANY, mapsEmbedUrl, mapsSearchUrl } from "@/lib/company";

export const revalidate = 3600;

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
    siteName: COMPANY.legalName,
    locale: "vi_VN",
    type: "website",
    images: [{ url: `${COMPANY.url}/opengraph-image`, width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: `Giới Thiệu | ${COMPANY.shortName}`,
    description: `${COMPANY.legalName} — đấu giá tại ${COMPANY.address.region}.`,
    images: [`${COMPANY.url}/opengraph-image`],
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

const services = [
  {
    icon: Gavel,
    name: "Đấu giá quyền sử dụng đất",
    description:
      "Tổ chức đấu giá quyền sử dụng đất do UBND các cấp giao, theo Luật Đất đai và Luật Đấu giá tài sản 2016.",
  },
  {
    icon: Scale,
    name: "Đấu giá tài sản thi hành án",
    description:
      "Phối hợp với Chi cục Thi hành án dân sự để đấu giá tài sản kê biên, tài sản thế chấp xử lý nợ.",
  },
  {
    icon: Shield,
    name: "Đấu giá tài sản thanh lý",
    description:
      "Đấu giá tài sản công, tài sản thanh lý của các cơ quan nhà nước, doanh nghiệp, ngân hàng.",
  },
  {
    icon: Building2,
    name: "Đấu giá tài sản khác",
    description:
      "Đấu giá phương tiện, máy móc thiết bị, vật tư hàng hoá và các loại tài sản hợp pháp khác.",
  },
];

const faqs = [
  {
    q: "Công ty Đấu giá Hợp danh Vĩnh Yên được thành lập khi nào?",
    a: "Công ty được thành lập ngày 04/09/2019 theo giấy chứng nhận đăng ký doanh nghiệp số 2500634576 do Sở Kế hoạch và Đầu tư cấp, hoạt động dưới hình thức công ty đấu giá hợp danh.",
  },
  {
    q: "Mã số thuế của công ty là gì?",
    a: "Mã số thuế: 2500634576. Có thể tra cứu công khai tại masothue.com.",
  },
  {
    q: "Khu vực hoạt động đấu giá của công ty là ở đâu?",
    a: "Công ty hoạt động chủ yếu tại tỉnh Phú Thọ (bao gồm địa bàn tỉnh Vĩnh Phúc cũ sau khi sáp nhập năm 2025), tổ chức đấu giá quyền sử dụng đất, tài sản thi hành án, tài sản thanh lý và các loại tài sản khác.",
  },
  {
    q: "Quy trình tham gia đấu giá như thế nào?",
    a: "Người tham gia mua hồ sơ tại trụ sở công ty trong thời gian thông báo, nộp tiền đặt trước theo mức công bố trong từng cuộc đấu giá, sau đó dự cuộc đấu giá tại địa điểm và thời điểm đã thông báo.",
  },
  {
    q: "Tiền đặt trước là bao nhiêu?",
    a: "Tiền đặt trước theo Luật Đấu giá tài sản 2016 dao động từ 5% đến 20% giá khởi điểm của tài sản, mức cụ thể được công bố trong từng thông báo đấu giá.",
  },
  {
    q: "Người đại diện pháp luật của công ty là ai?",
    a: "Đại diện pháp luật và Giám đốc công ty là ông Nguyễn Văn Dương, đấu giá viên hành nghề theo Luật Đấu giá tài sản.",
  },
  {
    q: "Làm thế nào để liên hệ công ty?",
    a: `Liên hệ qua điện thoại ${COMPANY.phoneDisplay} hoặc đến trực tiếp văn phòng: ${COMPANY.address.full}.`,
  },
  {
    q: "Công ty cập nhật thông báo đấu giá mới ở đâu?",
    a: `Tất cả thông báo đấu giá được công bố tại trang Thông Báo Đấu Giá: ${COMPANY.url}/articles, cập nhật thường xuyên.`,
  },
];

const aboutJsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "AboutPage",
      "@id": `${COMPANY.url}/about#aboutpage`,
      url: `${COMPANY.url}/about`,
      name: `Giới Thiệu | ${COMPANY.shortName}`,
      inLanguage: "vi-VN",
      isPartOf: { "@id": COMPANY.ids.website },
      about: { "@id": COMPANY.ids.organization },
      primaryImageOfPage: {
        "@type": "ImageObject",
        url: `${COMPANY.url}/opengraph-image`,
        width: 1200,
        height: 630,
      },
    },
    {
      "@type": "ContactPage",
      "@id": `${COMPANY.url}/about#contactpage`,
      url: `${COMPANY.url}/about`,
      name: `Liên hệ ${COMPANY.shortName}`,
      inLanguage: "vi-VN",
      mainEntity: { "@id": COMPANY.ids.organization },
    },
    {
      "@type": "Person",
      "@id": `${COMPANY.url}/about#founder-nguyen-van-duong`,
      name: COMPANY.representative,
      jobTitle: "Giám đốc / Đấu giá viên",
      worksFor: { "@id": COMPANY.ids.organization },
      memberOf: { "@id": COMPANY.ids.organization },
      knowsAbout: [
        "Luật Đấu giá tài sản 2016",
        "Đấu giá quyền sử dụng đất",
        "Đấu giá tài sản thi hành án",
      ],
      hasCredential: {
        "@type": "EducationalOccupationalCredential",
        credentialCategory: "Chứng chỉ hành nghề đấu giá viên",
        recognizedBy: {
          "@type": "GovernmentOrganization",
          name: "Bộ Tư pháp Việt Nam",
        },
      },
    },
    {
      "@type": "FAQPage",
      "@id": `${COMPANY.url}/about#faqpage`,
      inLanguage: "vi-VN",
      isPartOf: { "@id": COMPANY.ids.website },
      mainEntity: faqs.map((f) => ({
        "@type": "Question",
        name: f.q,
        acceptedAnswer: { "@type": "Answer", text: f.a },
      })),
    },
  ],
};

export default function AboutPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(aboutJsonLd) }}
      />

      {/* Hero */}
      <section className="relative bg-charcoal py-20 sm:py-24">
        <div className="container-narrow relative">
          <p className="font-body text-xs font-semibold uppercase tracking-[0.3em] text-gold sm:text-sm">
            Giới Thiệu
          </p>
          <h1 className="mt-4 font-heading text-3xl font-bold leading-tight text-white sm:text-4xl lg:text-5xl">
            {COMPANY.legalNameUpper}
          </h1>
          <p className="mt-6 max-w-2xl font-body text-base text-stone-400 leading-relaxed sm:text-lg">
            Công ty đấu giá hợp danh hoạt động tại {COMPANY.address.region},
            chuyên về đấu giá bất động sản và tài sản. Cổng công bố thông báo
            đấu giá phục vụ người dân, doanh nghiệp và các tổ chức quan tâm
            tham gia đấu giá tại {COMPANY.address.region}.
          </p>
        </div>
      </section>

      {/* Narrative — replaces the previous thin "info table only" page.
          Adds E-E-A-T signals: legal basis, scope of work, history. */}
      <section className="py-16">
        <div className="container-narrow">
          <h2 className="font-heading text-2xl font-bold text-charcoal sm:text-3xl">
            Về Chúng Tôi
          </h2>
          <div className="prose prose-stone mt-6 max-w-none font-body text-charcoal-light">
            <p>
              <strong>{COMPANY.legalName}</strong> (tên pháp lý:{" "}
              <em>{COMPANY.legalNameUpper}</em>, mã số thuế{" "}
              <strong>{COMPANY.taxId}</strong>) là công ty đấu giá hợp danh
              được thành lập ngày {formattedFounded}, hoạt động hợp pháp theo{" "}
              <strong>Luật Đấu giá tài sản 2016</strong> và các quy định pháp
              luật có liên quan của nước Cộng hoà Xã hội Chủ nghĩa Việt Nam.
            </p>
            <p>
              Trụ sở công ty đặt tại{" "}
              <strong>{COMPANY.address.full}</strong>. Đại diện pháp luật và
              Giám đốc công ty là ông{" "}
              <strong>{COMPANY.representative}</strong> — đấu giá viên hành
              nghề được Bộ Tư pháp công nhận.
            </p>
            <p>
              Công ty cung cấp dịch vụ tổ chức đấu giá tài sản cho khu vực{" "}
              <strong>tỉnh Phú Thọ</strong> — bao gồm cả địa bàn tỉnh Vĩnh
              Phúc cũ sau khi sáp nhập về Phú Thọ năm 2025 — phối hợp chặt
              chẽ với UBND các cấp, Chi cục Thi hành án dân sự, các tổ chức
              tín dụng và doanh nghiệp có nhu cầu. Mọi cuộc đấu giá được
              thực hiện công khai, minh bạch, đúng quy
              trình pháp luật.
            </p>
          </div>
        </div>
      </section>

      {/* Services — what auction work the company actually does */}
      <section className="border-t border-warm-border bg-stone-50 py-16">
        <div className="container-narrow">
          <h2 className="font-heading text-2xl font-bold text-charcoal sm:text-3xl">
            Lĩnh Vực Hoạt Động
          </h2>
          <div className="mt-8 grid gap-6 sm:grid-cols-2">
            {services.map((s) => {
              const Icon = s.icon;
              return (
                <article
                  key={s.name}
                  className="rounded-lg border border-warm-border bg-white p-6"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-md bg-gold-pale">
                      <Icon className="h-5 w-5 text-gold" />
                    </div>
                    <div>
                      <h3 className="font-heading text-lg font-semibold text-charcoal">
                        {s.name}
                      </h3>
                      <p className="mt-2 font-body text-sm text-charcoal-light leading-relaxed">
                        {s.description}
                      </p>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
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

      {/* FAQ — visible block matching FAQPage JSON-LD */}
      <section className="border-t border-warm-border bg-stone-50 py-16">
        <div className="container-narrow">
          <h2 className="font-heading text-2xl font-bold text-charcoal sm:text-3xl">
            Câu Hỏi Thường Gặp
          </h2>
          <div className="mt-8 divide-y divide-warm-border rounded-lg border border-warm-border bg-white">
            {faqs.map((f, i) => (
              <details
                key={i}
                className="group p-5 open:bg-stone-50/40"
              >
                <summary className="flex cursor-pointer list-none items-start justify-between gap-3 font-heading text-base font-semibold text-charcoal">
                  <span>{f.q}</span>
                  <span
                    aria-hidden="true"
                    className="ml-2 flex-shrink-0 text-gold transition-transform group-open:rotate-45"
                  >
                    +
                  </span>
                </summary>
                <p className="mt-3 font-body text-sm text-charcoal-light leading-relaxed">
                  {f.a}
                </p>
              </details>
            ))}
          </div>
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
