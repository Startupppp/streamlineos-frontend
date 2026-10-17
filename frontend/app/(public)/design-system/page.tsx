import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { TokenGallery } from "@/features/design-system/token-gallery";
import { GalleryIndex } from "@/features/design-system/gallery-index";

export const metadata: Metadata = {
  title: "Design tokens",
  robots: { index: false, follow: false },
};

export default function DesignSystemPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return (
    <div className="flex flex-col gap-8 p-4">
      <GalleryIndex />
      <TokenGallery />
    </div>
  );
}
