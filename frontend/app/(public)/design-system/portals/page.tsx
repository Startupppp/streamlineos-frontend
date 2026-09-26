import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { PortalsGallery } from "@/features/portal/portals-gallery";

export const metadata: Metadata = {
  title: "Portal surfaces",
  robots: { index: false, follow: false },
};

export default function PortalsGalleryPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <PortalsGallery />;
}
