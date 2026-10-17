import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ExecutionCoreGallery } from "@/features/build/views/execution-core-gallery";

export const metadata: Metadata = {
  title: "Execution core surfaces",
  robots: { index: false, follow: false },
};

export default function ExecutionCoreGalleryPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <ExecutionCoreGallery />;
}
