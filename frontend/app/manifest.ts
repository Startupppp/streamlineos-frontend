import type { MetadataRoute } from "next";
import { BRAND_NAME, BRAND_TAGLINE, BRAND_DESCRIPTION } from "@/lib/branding";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${BRAND_NAME} — ${BRAND_TAGLINE}`,
    short_name: BRAND_NAME,
    description: BRAND_DESCRIPTION,
    start_url: "/",
    display: "standalone",
    background_color: "#eef3fb",
    theme_color: "#3b82f6",
    icons: [
      {
        src: "/logo.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],
    categories: ["business", "productivity"],
  };
}
