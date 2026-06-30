import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LandingPage } from "@/features/landing/landing-page";
import {
  BRAND_NAME,
  BRAND_TAGLINE,
  BRAND_DESCRIPTION,
  BRAND_URL,
} from "@/lib/branding";
import {
  SoftwareApplicationJsonLd,
  FAQJsonLd,
} from "@/features/seo/structured-data";
import { faqs } from "@/features/landing/data/faqs";
export const metadata: Metadata = {
  title: `${BRAND_NAME} — ${BRAND_TAGLINE} | HR, Projects, CRM in one platform`,
  description: BRAND_DESCRIPTION,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: BRAND_URL,
    siteName: BRAND_NAME,
    title: `${BRAND_NAME} — ${BRAND_TAGLINE}`,
    description: BRAND_DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
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
  }

  return (
    <>
      <SoftwareApplicationJsonLd />
      <FAQJsonLd faqs={faqs} />
      <LandingPage />
    </>
  );
}
