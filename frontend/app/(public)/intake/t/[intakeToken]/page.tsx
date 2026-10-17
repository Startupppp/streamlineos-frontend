import type { Metadata } from "next";
import { PublicIntakeTokenView } from "@/features/build/intake/public-intake-token-view";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function PublicIntakeTokenPage({
  params,
}: {
  params: Promise<{ intakeToken: string }>;
}) {
  const { intakeToken } = await params;
  return <PublicIntakeTokenView intakeToken={intakeToken} />;
}
