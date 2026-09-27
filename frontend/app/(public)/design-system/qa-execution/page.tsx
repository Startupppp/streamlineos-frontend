import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { QaExecutionGallery } from "@/features/build/governance/qa-execution-gallery";

export const metadata: Metadata = {
  title: "QA execution & project financials",
  robots: { index: false, follow: false },
};

export default function QaExecutionGalleryPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <QaExecutionGallery />;
}
