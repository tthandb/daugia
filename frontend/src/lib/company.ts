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
  ids: {
    organization: `${SITE_URL}/#organization`,
    website: `${SITE_URL}/#website`,
  },
} as const;

export const mapsSearchUrl = (query: string = COMPANY.address.full) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;

export const mapsEmbedUrl = (query: string = COMPANY.address.full) =>
  `https://maps.google.com/maps?q=${encodeURIComponent(query)}&hl=vi&z=16&output=embed`;
