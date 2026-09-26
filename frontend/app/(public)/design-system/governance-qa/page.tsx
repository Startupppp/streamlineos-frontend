import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { GovernanceQaGallery } from "@/features/build/governance/governance-qa-gallery";

export const metadata: Metadata = {
  title: "Governance & QA surfaces",
  robots: { index: false, follow: false },
};

export default function GovernanceQaGalleryPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <GovernanceQaGallery />;
}
