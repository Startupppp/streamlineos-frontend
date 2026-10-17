"use client";

import { notFound } from "next/navigation";

import { PageWrapper } from "@/components/ui/page-wrapper";
import { ErrorState } from "@/components/shared/error-state";
import { isApiError } from "@/lib/api-envelope";
import { getErrorMessage } from "@/lib/get-error-message";

interface ProjectLoadFallbackProps {
  title: string;
  error: unknown;
  onRetry: () => void;
}


export function ProjectLoadFallback({ title, error, onRetry }: ProjectLoadFallbackProps) {
  if (isApiError(error) && error.status === 404) notFound();

  return (
    <PageWrapper title={title}>
      <ErrorState
        className="flex-1"
        title="Couldn't load this project"
        description={getErrorMessage(error)}
        onRetry={onRetry}
      />
    </PageWrapper>
  );
}
