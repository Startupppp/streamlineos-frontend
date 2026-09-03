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

/**
 * What a failed project read renders.
 *
 * `project-board-page` and `project-backlog-page` both went straight from
 * `isLoading` to `if (!data) return notFound()`, with no `isError` consumer
 * between them. A transient 500 on `GET /build/:projectId` — the schema-drift
 * 500 this repo has shipped before — therefore rendered Next's hard
 * "This page could not be found", so the user's project looked DELETED: no
 * retry, and refreshing reproduced it.
 *
 * `notFound()` is right for exactly one thing: a server that RESOLVED the id and
 * said it is absent. `getProject` throws `PROJECTS_NOT_FOUND` (404) for that, so
 * the status is the discriminator and everything else is a failure to find out.
 * Same split as `ticket-detail-page.tsx`.
 */
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
