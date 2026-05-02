/** @type {import('next').NextConfig} */
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(self), interest-cohort=()",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
];

const nextConfig = {
  // next/image config — enable AVIF (Next will fall back to WebP / JPEG for
  // browsers that don't accept it) and trim the device/image size lists so
  // we don't emit 10 srcset variants for an 800×450 source thumbnail.
  images: {
    formats: ["image/avif", "image/webp"],
    deviceSizes: [640, 750, 828, 1080, 1200],
    imageSizes: [256, 384, 640],
  },
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${process.env.API_URL || "http://localhost:8080"}/api/:path*`,
      },
    ];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
  // Note: legacy ?category= URLs are 308-redirected to /categories/[slug]
  // by the (public)/articles route handler (see redirect() call there).
  // A next.config redirect would be slightly faster but Next preserves the
  // original query string on the destination, producing /categories/x?category=x.
};

export default nextConfig;
