import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { BuildListGallery } from "@/features/build/shared/build-list-gallery";

export const metadata: Metadata = {
  title: "Build list surfaces",
  robots: { index: false, follow: false },
};

export default function BuildListGalleryPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <BuildListGallery />;
}
