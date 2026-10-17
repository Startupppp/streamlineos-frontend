import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ContentIntakeGallery } from "@/features/build/whiteboard/content-intake-gallery";

export const metadata: Metadata = {
  title: "Content intake public surfaces",
  robots: { index: false, follow: false },
};

export default function ContentIntakeGalleryPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <ContentIntakeGallery />;
}
