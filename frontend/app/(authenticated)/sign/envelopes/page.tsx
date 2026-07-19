import { Suspense } from "react";
import { EnvelopeList } from "@/features/sign";

export default function SignEnvelopesPage() {
  return (
    <Suspense>
      <EnvelopeList />
    </Suspense>
  );
}
