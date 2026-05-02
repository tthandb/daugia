const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "https://daugia.vercel.app";

export const COMPANY = {
  legalName: "Công ty Đấu giá Hợp danh Vĩnh Yên",
  legalNameUpper: "CÔNG TY ĐẤU GIÁ HỢP DANH VĨNH YÊN",
  shortName: "Đấu Giá Vĩnh Yên",
  brandMark: "ĐẤUGIÁ.",
  tagline: "Đấu giá bất động sản Phú Thọ",
  taxId: "2500634576",
  phoneDisplay: "0912 535 999",
  phoneTel: "+84912535999",
  founded: "2019-09-04",
  representative: "Nguyễn Văn Dương",
  url: SITE_URL,
  address: {
    street: "Sn 24 Ngô Quyền",
    locality: "phường Vĩnh Phúc",
    region: "tỉnh Phú Thọ",
    countryName: "Việt Nam",
    countryCode: "VN",
    full: "Sn 24 Ngô Quyền, phường Vĩnh Phúc, tỉnh Phú Thọ, Việt Nam",
  },
  // Approximate coordinates of "Sn 24 Ngô Quyền, Vĩnh Yên / Vĩnh Phúc / Phú Thọ".
  // Refine via Google My Business once verified.
  geo: {
    latitude: 21.30957,
    longitude: 105.60686,
  },
  // Mon–Fri 08:00–17:00 (Vietnamese standard office hours).
  openingHours: [
    { days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"], opens: "08:00", closes: "17:00" },
  ],
  // Off-site identity references — populate as profiles are claimed.
  sameAs: [
    `https://masothue.com/${"2500634576"}-cong-ty-dau-gia-hop-danh-vinh-yen`,
  ],
  // Service areas — narrower than 'VN' country-wide, more useful to local search.
  serviceAreas: ["tỉnh Phú Thọ", "tỉnh Vĩnh Phúc"],
  ids: {
    organization: `${SITE_URL}/#organization`,
    website: `${SITE_URL}/#website`,
  },
} as const;

export const mapsSearchUrl = (query: string = COMPANY.address.full) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;

export const mapsEmbedUrl = (query: string = COMPANY.address.full) =>
  `https://maps.google.com/maps?q=${encodeURIComponent(query)}&hl=vi&z=16&output=embed`;
