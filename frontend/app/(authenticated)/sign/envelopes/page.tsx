import { Suspense } from "react";
import { requireModulePermission } from "@/lib/rbac/require-permission";
import { EnvelopeList } from "@/features/sign";

export default async function SignEnvelopesPage() {
  await requireModulePermission("sign", "sign:envelope:view");
  return (
    <Suspense>
      <EnvelopeList />
    </Suspense>
  );
}
