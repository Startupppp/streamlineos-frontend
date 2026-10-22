import { Suspense } from "react";
import { HydrationBoundary } from "@tanstack/react-query";
import { MailShell } from "@/features/mail";
import { prefetchMailAccounts } from "@/lib/prefetch/mail";
import MailLoading from "./loading";

async function MailHydrated() {
  const state = await prefetchMailAccounts();
  return (
    <HydrationBoundary state={state}>
      <MailShell />
    </HydrationBoundary>
  );
}

export default function MailPage() {
  return (
    <Suspense fallback={<MailLoading />}>
      <MailHydrated />
    </Suspense>
  );
}
