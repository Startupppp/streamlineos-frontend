import { PublicSessionView } from "@/features/sign";

export default async function PublicSignPage({ params }: { params: Promise<{ recipientToken: string }> }) {
  const { recipientToken } = await params;
  return <PublicSessionView token={recipientToken} />;
}
