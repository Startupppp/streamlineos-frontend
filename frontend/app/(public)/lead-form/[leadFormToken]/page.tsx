import type { Metadata } from "next";
import { PublicLeadFormPage } from "@/features/crm/web-forms/public-lead-form";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function LeadFormPage({
  params,
}: {
  params: Promise<{ leadFormToken: string }>;
}) {
  const { leadFormToken } = await params;
  return <PublicLeadFormPage leadFormToken={leadFormToken} />;
}
