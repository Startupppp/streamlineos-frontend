import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { OrgWorkGallery } from "./gallery";

export const metadata: Metadata = {
  title: "Org-work surfaces",
  robots: { index: false, follow: false },
};

export default function OrgWorkGalleryPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <OrgWorkGallery />;
}
