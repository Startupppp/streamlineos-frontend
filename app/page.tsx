import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LandingPage } from "@/features/landing/landing-page";
import { BRAND_NAME, BRAND_TAGLINE, BRAND_DESCRIPTION } from "@/lib/branding";

export const metadata: Metadata = {
  title: `${BRAND_NAME} — ${BRAND_TAGLINE}`,
  description: BRAND_DESCRIPTION,
  openGraph: {
    type: "website",
    siteName: BRAND_NAME,
    title: `${BRAND_NAME} — ${BRAND_TAGLINE}`,
    description: BRAND_DESCRIPTION,
  },
};

export default async function HomePage() {
  try {
    const { auth } = await import("@/lib/auth");
    const session = await auth();
    if (session?.user) redirect("/dashboard");
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "digest" in error &&
      typeof (error as { digest: unknown }).digest === "string" &&
      (error as { digest: string }).digest.startsWith("NEXT_REDIRECT")
    ) {
      throw error;
    }
    if (process.env.NODE_ENV === "development") {
      console.warn(
        "[HomePage] Auth not configured — rendering landing only. " +
          "Set NEXTAUTH_SECRET in .env to enable session-aware redirects.",
      );
    }
  }
  return <LandingPage />;
}
