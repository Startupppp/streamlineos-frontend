"use client";

import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";

interface Props {
  error: Error;
  reset: () => void;
}

export default function BenefitsError({ error, reset }: Props) {
  return (
    <PageWrapper title="Benefits" subtitle="An error occurred">
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <p className="text-sm text-muted-foreground">{error.message}</p>
        <Button size="sm" onClick={reset}>Retry</Button>
      </div>
    </PageWrapper>
  );
}
