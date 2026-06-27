import type { Metadata } from "next";
import { HelpCenterClient } from "./help-center-client";
import { getPublicOrgName } from "@/server/queries/public-kb";
import { BRAND_NAME } from "@/lib/branding";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ orgId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { orgId } = await params;
  const orgName = await getPublicOrgName(orgId);
  const title = orgName ? `${orgName} Help Center` : "Help Center";
  const description = orgName
    ? `Search articles and find answers for ${orgName}, powered by ${BRAND_NAME}.`
    : `Search articles and find answers, powered by ${BRAND_NAME}.`;
  return {
    title,
    description,
    alternates: { canonical: `/help/${orgId}` },
    openGraph: { title, description, type: "website", url: `/help/${orgId}` },
    twitter: { card: "summary", title, description },
  };
}

export default async function PublicHelpCenterPage({ params }: Props) {
  const { orgId } = await params;
  return <HelpCenterClient orgId={orgId} />;
}
