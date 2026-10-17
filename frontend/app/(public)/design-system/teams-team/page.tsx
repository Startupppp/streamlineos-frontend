import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { TeamHomeGallery } from "@/features/build/teams/team-home-gallery";

export const metadata: Metadata = {
  title: "Team detail surfaces",
  robots: { index: false, follow: false },
};

export default function TeamHomeGalleryPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <TeamHomeGallery />;
}
