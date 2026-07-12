import { EnvelopeBuilder } from "@/features/sign";

export default async function SignEnvelopeBuilderPage({ params }: { params: Promise<{ envelopeId: string }> }) {
  const { envelopeId } = await params;
  return <EnvelopeBuilder envelopeId={Number(envelopeId)} />;
}
