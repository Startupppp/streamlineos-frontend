import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { PlanningSurfacesGallery } from "@/features/build/milestones/planning-surfaces-gallery";

export const metadata: Metadata = {
  title: "Planning surfaces",
  robots: { index: false, follow: false },
};

export default function PlanningSurfacesGalleryPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <PlanningSurfacesGallery />;
}
