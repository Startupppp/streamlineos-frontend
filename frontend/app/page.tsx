import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LandingPage } from "@/features/landing/landing-page";
import { BRAND_NAME, BRAND_URL } from "@/lib/branding";
import {
  SoftwareApplicationJsonLd,
  FAQJsonLd,
} from "@/features/seo/structured-data";
import { faqs } from "@/features/landing/data/faqs";
import { PRICING } from "@/lib/pricing";

const HOME_TITLE = `${BRAND_NAME} — HR, Projects, CRM & Payroll in One Platform`;
const HOME_DESCRIPTION = `Run HR, payroll, projects, CRM, chat & accounting on one affordable AI-powered platform. Free for up to ${PRICING.freeSeatLimit} seats — no credit card needed.`;

export const metadata: Metadata = {
  title: HOME_TITLE,
  description: HOME_DESCRIPTION,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: BRAND_URL,
    siteName: BRAND_NAME,
    title: HOME_TITLE,
    description: HOME_DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: HOME_TITLE,
    description: HOME_DESCRIPTION,
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
