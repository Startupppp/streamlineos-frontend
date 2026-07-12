import { PublicSessionView } from "@/features/sign";

export default async function PublicSignPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <PublicSessionView token={token} />;
}
