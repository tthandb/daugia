import { COMPANY, mapsSearchUrl } from "@/lib/company";

export function OrganizationJsonLd() {
  const json = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "LocalBusiness",
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
        founder: { "@type": "Person", name: COMPANY.representative },
        address: {
          "@type": "PostalAddress",
          streetAddress: COMPANY.address.street,
          addressLocality: COMPANY.address.locality,
          addressRegion: COMPANY.address.region,
          addressCountry: COMPANY.address.countryCode,
        },
        areaServed: { "@type": "Country", name: COMPANY.address.countryName },
        hasMap: mapsSearchUrl(),
        additionalType: "https://en.wikipedia.org/wiki/Auction_house",
        knowsAbout: [
          "Đấu giá bất động sản",
          "Bất động sản Phú Thọ",
          "Đấu giá tài sản",
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
