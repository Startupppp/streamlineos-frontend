import type { Metadata } from "next";
import { PublicSessionView } from "@/features/sign";

export const metadata: Metadata = {
  title: "Review and sign",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default async function PublicSignPage({ params }: { params: Promise<{ recipientToken: string }> }) {
  const { recipientToken } = await params;
  return <PublicSessionView token={recipientToken} />;
}
