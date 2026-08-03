"use client";

import { useEffect } from "react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { ErrorState } from "@/components/shared/error-state";
import { PmPageShell } from "@/features/build/shared/pm-chrome";

export default function PmWorkspacesError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <PageWrapper
      title="PM Workspaces"
      subtitle="Group products, teams and projects under a workspace"
    >
      <PmPageShell>
        <ErrorState onRetry={reset} />
      </PmPageShell>
    </PageWrapper>
  );
}
