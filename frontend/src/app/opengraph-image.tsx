import { ImageResponse } from "next/og";
import { COMPANY } from "@/lib/company";

export const runtime = "edge";
export const alt = COMPANY.legalName;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Satori (used by next/og) only parses static TTF/OTF — not woff2 (Google Fonts
// CSS API) and not variable fonts (FvarTable). Be Vietnam Pro ships static
// TTFs in google/fonts and supports the full Vietnamese diacritic range.
const FONT_URLS = {
  bold: "https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/bevietnampro/BeVietnamPro-Bold.ttf",
  regular:
    "https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/bevietnampro/BeVietnamPro-Regular.ttf",
} as const;

async function loadFont(url: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Font fetch failed (${res.status}): ${url}`);
  return await res.arrayBuffer();
}

export default async function Image() {
  const eyebrow = COMPANY.shortName.toUpperCase();
  const headline = COMPANY.legalNameUpper;
  const tagline = `${COMPANY.tagline} · ${COMPANY.address.region}`;
  const domain = COMPANY.url.replace(/^https?:\/\//, "");

  const [bold, regular] = await Promise.all([
    loadFont(FONT_URLS.bold),
    loadFont(FONT_URLS.regular),
  ]);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: "#FAFAF9",
          color: "#1C1917",
          padding: 80,
          fontFamily: "Be Vietnam Pro",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            fontSize: 26,
            fontWeight: 700,
            color: "#A16207",
            letterSpacing: 6,
          }}
        >
          <div style={{ width: 40, height: 4, background: "#A16207" }} />
          <span>{eyebrow}</span>
        </div>

        <div
          style={{
            display: "flex",
            fontWeight: 700,
            fontSize: 72,
            lineHeight: 1.1,
            marginTop: "auto",
            color: "#0C0A09",
          }}
        >
          {headline}
        </div>

        <div
          style={{
            display: "flex",
            fontSize: 30,
            color: "#57534E",
            marginTop: 24,
            lineHeight: 1.4,
          }}
        >
          {tagline}
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            borderTop: "2px solid #A16207",
            marginTop: 48,
            paddingTop: 24,
            fontSize: 22,
            color: "#1C1917",
          }}
        >
          <span>{domain}</span>
          <span style={{ color: "#78716C" }}>MST {COMPANY.taxId}</span>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Be Vietnam Pro", data: bold, style: "normal", weight: 700 },
        { name: "Be Vietnam Pro", data: regular, style: "normal", weight: 400 },
      ],
    }
  );
}
