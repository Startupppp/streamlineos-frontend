import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { TemplatesGallery } from "@/features/build/templates/templates-gallery";

export const metadata: Metadata = {
  title: "Templates surfaces",
  robots: { index: false, follow: false },
};

export default function TemplatesGalleryPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <TemplatesGallery />;
}
