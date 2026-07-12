"use client";

import { PageWrapper } from "@/components/ui/page-wrapper";
import { ErrorState } from "@/components/shared";

interface InboxErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function InboxError({ reset }: InboxErrorProps) {
  return (
    <PageWrapper title="Sales Inbox" subtitle="Your daily command center">
      <ErrorState
        title="Failed to load inbox"
        description="Something went wrong loading your inbox."
        onRetry={reset}
        className="flex-1 min-h-[300px]"
      />
    </PageWrapper>
  );
}
