import { notFound, redirect } from "next/navigation";
import { requireModulePermission } from "@/lib/rbac/require-permission";
import { EnvelopeBuilder } from "@/features/sign";

export default async function SignEnvelopeBuilderPage({ params }: { params: Promise<{ envelopeId: string }> }) {
  await requireModulePermission("sign", "sign:envelope:view");
  const { envelopeId } = await params;
  if (envelopeId === "new") redirect("/sign/envelopes?create=1");
  if (!/^[1-9]\d{0,15}$/.test(envelopeId)) notFound();
  return <EnvelopeBuilder envelopeId={Number(envelopeId)} />;
}
