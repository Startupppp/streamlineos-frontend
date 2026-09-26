import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { PlanningSurfacesGallery } from "@/features/build/milestones/planning-surfaces-gallery";
import { PlanningSurfacesExtraSections } from "@/features/build/milestones/planning-surfaces-extra-sections";

export const metadata: Metadata = {
  title: "Planning surfaces",
  robots: { index: false, follow: false },
};

export default function PlanningSurfacesGalleryPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return (
    <>
      <PlanningSurfacesGallery />
      <div className="flex flex-col gap-8 px-4 pb-4">
        <PlanningSurfacesExtraSections />
      </div>
    </>
  );
}
