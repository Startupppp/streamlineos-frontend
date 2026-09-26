import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  publicGet,
  type PublicOrgInfo,
  type PublicKbListData,
} from "@/lib/public-fetch";
import { publicOrgNameContract, publicKbListContract } from "@/lib/public-schema";
import { BRAND_NAME } from "@/lib/branding";
import { PublicHelpCentreContent } from "@/features/help-centre/components/public-help-centre-content";

export const revalidate = 60;

type Props = { params: Promise<{ orgId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { orgId } = await params;
  const org = await publicGet<PublicOrgInfo>(`/public/org/${orgId}`, undefined, publicOrgNameContract);
  if (!org) return { title: "Help Center" };
  const title = `${org.name} Help Center`;
  const description = `Find answers and explore articles in ${org.name}'s help center, powered by ${BRAND_NAME}.`;
  return {
    title,
    description,
    alternates: { canonical: `/help/${orgId}` },
    openGraph: { title, description, type: "website", url: `/help/${orgId}` },
    twitter: { card: "summary", title, description },
  };
}

export default async function PublicHelpCentreLandingPage({ params }: Props) {
  const { orgId } = await params;
  const [org, data] = await Promise.all([
    publicGet<PublicOrgInfo>(`/public/org/${orgId}`, undefined, publicOrgNameContract),
    publicGet<PublicKbListData>("/public/kb", { org: orgId }, publicKbListContract),
  ]);
  if (!org) return notFound();
  return (
    <PublicHelpCentreContent
      orgId={orgId}
      orgName={org.name}
      orgLogo={org.logo}
      data={data ?? { categories: [], articles: [], pagination: { limit: 20, hasMore: false, nextCursor: null } }}
    />
  );
}
