import { ImageResponse } from "next/og";

export const runtime = "edge";
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default async function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%)",
          color: "white",
          fontSize: 120,
          fontWeight: 800,
          fontFamily: "system-ui, sans-serif",
          letterSpacing: -4,
          borderRadius: 40,
        }}
      >
        S
      </div>
    ),
    size,
  );
}
