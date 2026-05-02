import { COMPANY, mapsSearchUrl } from "@/lib/company";

export function OrganizationJsonLd() {
  const json = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": ["LocalBusiness", "ProfessionalService"],
        "@id": COMPANY.ids.organization,
        name: COMPANY.legalName,
        legalName: COMPANY.legalNameUpper,
        alternateName: COMPANY.shortName,
        url: COMPANY.url,
        logo: `${COMPANY.url}/icon.png`,
        image: `${COMPANY.url}/opengraph-image`,
        telephone: COMPANY.phoneTel,
        taxID: COMPANY.taxId,
        foundingDate: COMPANY.founded,
        founder: {
          "@type": "Person",
          name: COMPANY.representative,
          jobTitle: "Giám đốc",
          worksFor: { "@id": COMPANY.ids.organization },
        },
        address: {
          "@type": "PostalAddress",
          streetAddress: COMPANY.address.street,
          addressLocality: COMPANY.address.locality,
          addressRegion: COMPANY.address.region,
          addressCountry: COMPANY.address.countryCode,
        },
        geo: {
          "@type": "GeoCoordinates",
          latitude: COMPANY.geo.latitude,
          longitude: COMPANY.geo.longitude,
        },
        areaServed: COMPANY.serviceAreas.map((name) => ({
          "@type": "AdministrativeArea",
          name,
        })),
        openingHoursSpecification: COMPANY.openingHours.map((spec) => ({
          "@type": "OpeningHoursSpecification",
          dayOfWeek: spec.days,
          opens: spec.opens,
          closes: spec.closes,
        })),
        sameAs: COMPANY.sameAs,
        hasMap: mapsSearchUrl(),
        additionalType: "https://en.wikipedia.org/wiki/Auction_house",
        knowsAbout: [
          "Đấu giá bất động sản",
          "Bất động sản Phú Thọ",
          "Đấu giá tài sản",
          "Đấu giá quyền sử dụng đất",
          "Đấu giá tài sản thi hành án",
          "Luật Đấu giá tài sản 2016",
        ],
      },
      {
        "@type": "WebSite",
        "@id": COMPANY.ids.website,
        url: COMPANY.url,
        name: COMPANY.legalName,
        inLanguage: "vi-VN",
        publisher: { "@id": COMPANY.ids.organization },
        potentialAction: {
          "@type": "SearchAction",
          target: `${COMPANY.url}/search?q={search_term_string}`,
          "query-input": "required name=search_term_string",
        },
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(json) }}
    />
  );
}
