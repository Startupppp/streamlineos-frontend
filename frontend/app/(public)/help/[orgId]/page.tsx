import type { Metadata } from "next";
import { HelpCenterClient } from "@/features/help-centre/components/help-center-client";
import { BRAND_NAME } from "@/lib/branding";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ orgId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { orgId } = await params;
  const title = "Help Center";
  const description = `Search articles and find answers, powered by ${BRAND_NAME}.`;
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
