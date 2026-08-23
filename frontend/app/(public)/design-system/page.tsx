import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { TokenGallery } from "@/features/design-system/token-gallery";

export const metadata: Metadata = {
  title: "Design tokens",
  robots: { index: false, follow: false },
};

export default function DesignSystemPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <TokenGallery />;
}
