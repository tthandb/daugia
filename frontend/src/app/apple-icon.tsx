import { ImageResponse } from "next/og";

export const runtime = "edge";
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#1C1917",
          color: "#A16207",
          fontFamily: "Georgia, ui-serif, serif",
          fontSize: 112,
          fontWeight: 700,
          letterSpacing: -2,
          borderRadius: 36,
        }}
      >
        Đ
      </div>
    ),
    size
  );
}
