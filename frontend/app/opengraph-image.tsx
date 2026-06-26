import { ImageResponse } from "next/og";
import { BRAND_NAME, BRAND_TAGLINE } from "@/lib/branding";

export const runtime = "edge";
export const alt = `${BRAND_NAME} — ${BRAND_TAGLINE}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: "linear-gradient(135deg, #0b1220 0%, #1e3a8a 55%, #0891b2 100%)",
          padding: "72px 80px",
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(circle at 20% 15%, rgba(96,165,250,0.35) 0%, transparent 45%), radial-gradient(circle at 80% 85%, rgba(6,182,212,0.30) 0%, transparent 50%)",
          }}
        />

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 18,
            zIndex: 1,
          }}
        >
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: 18,
              background: "linear-gradient(135deg, #3b82f6, #06b6d4)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 42,
              fontWeight: 800,
              color: "white",
              fontFamily: "system-ui, sans-serif",
              boxShadow: "0 14px 38px -10px rgba(59,130,246,0.6)",
            }}
          >
            S
          </div>
          <div
            style={{
              fontSize: 32,
              fontWeight: 700,
              color: "white",
              letterSpacing: -0.5,
              fontFamily: "system-ui, sans-serif",
            }}
          >
            {BRAND_NAME}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            flex: 1,
            zIndex: 1,
          }}
        >
          <div
            style={{
              fontSize: 22,
              fontFamily: "monospace",
              letterSpacing: 6,
              textTransform: "uppercase",
              color: "#67e8f9",
              marginBottom: 24,
            }}
          >
            The Operating System for Modern Teams
          </div>
          <div
            style={{
              fontSize: 84,
              fontWeight: 800,
              color: "white",
              letterSpacing: -2.5,
              lineHeight: 1.02,
              fontFamily: "system-ui, sans-serif",
              maxWidth: 980,
            }}
          >
            HR, Projects, CRM, Chat — one platform.
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            zIndex: 1,
            fontFamily: "monospace",
            fontSize: 18,
            letterSpacing: 3,
            textTransform: "uppercase",
          }}
        >
          <div style={{ color: "#94a3b8" }}>streamlineos.in</div>
          <div style={{ color: "#67e8f9" }}>Built in India</div>
        </div>
      </div>
    ),
    size,
  );
}
