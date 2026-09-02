import { requireModulePermission } from "@/lib/rbac/require-permission";
import { EnvelopeBuilder } from "@/features/sign";

export default async function SignEnvelopeBuilderPage({ params }: { params: Promise<{ envelopeId: string }> }) {
  await requireModulePermission("sign", "sign:envelope:view");
  const { envelopeId } = await params;
  return <EnvelopeBuilder envelopeId={Number(envelopeId)} />;
}
