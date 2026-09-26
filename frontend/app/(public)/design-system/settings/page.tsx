import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { SettingsGallery } from "@/features/build/settings/settings-gallery";

export const metadata: Metadata = {
  title: "Settings surfaces",
  robots: { index: false, follow: false },
};

export default function SettingsGalleryPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <SettingsGallery />;
}
