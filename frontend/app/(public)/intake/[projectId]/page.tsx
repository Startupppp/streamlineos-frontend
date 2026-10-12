import type { Metadata } from "next";
import { PublicIntakeView } from "@/features/build/intake/public-intake-view";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function PublicIntakePage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  return <PublicIntakeView projectId={projectId} />;
}
