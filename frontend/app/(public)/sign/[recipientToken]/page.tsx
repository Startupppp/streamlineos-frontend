import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PublicSessionView } from "@/features/sign";

const RECIPIENT_TOKEN = /^[0-9a-f]{64}$/i;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ recipientToken: string }>;
}): Promise<Metadata> {
  const { recipientToken } = await params;
  if (!RECIPIENT_TOKEN.test(recipientToken)) {
    return { title: "Page not found", robots: { index: false, follow: false } };
  }
  return {
    title: "Review and sign",
    robots: { index: false, follow: false },
    referrer: "no-referrer",
  };
}

export default async function PublicSignPage({ params }: { params: Promise<{ recipientToken: string }> }) {
  const { recipientToken } = await params;
  if (!RECIPIENT_TOKEN.test(recipientToken)) notFound();
  return <PublicSessionView token={recipientToken} />;
}
