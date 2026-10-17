import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ManagedProductsGallery } from "@/features/build/managed-products/managed-products-gallery";

export const metadata: Metadata = {
  title: "Managed Products surfaces",
  robots: { index: false, follow: false },
};

export default function ManagedProductsGalleryPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <ManagedProductsGallery />;
}
