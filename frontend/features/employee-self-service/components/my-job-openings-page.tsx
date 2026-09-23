"use client";

import { useCallback } from "react";
import { Briefcase, MapPin } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingButton } from "@/components/ui/loading-button";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";
import { PAGE_BODY_SKELETON_CLASS } from "@/components/ui/content-fill-panel";
import { usePageState } from "@/hooks/api/use-page-state";
import {
  useApplyToJobOpening,
  useSelfJobOpenings,
} from "@/hooks/api/employee-self-service/job-openings";
import type { SelfJobOpening } from "@/hooks/api/employee-self-service/job-openings-schema";
import { getErrorMessage } from "@/lib/get-error-message";

interface JobOpeningCardProps {
  opening: SelfJobOpening;
  onApply: (jobId: number) => void;
  applyingJobId: number | null;
}

function JobOpeningCard({ opening, onApply, applyingJobId }: JobOpeningCardProps) {
  const handleApply = useCallback(() => {
    onApply(opening.id);
  }, [onApply, opening.id]);

  return (
    <Card>
      <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{opening.title}</p>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            {opening.department ? (
              <span className="inline-flex items-center gap-1">
                <Briefcase className="h-3 w-3" />
                {opening.department.name}
              </span>
            ) : null}
            {opening.location ? (
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {opening.location}
              </span>
            ) : null}
            <Badge variant="secondary">{opening.type}</Badge>
            {opening.experience ? <span>{opening.experience}</span> : null}
          </div>
        </div>
        <LoadingButton
          size="sm"
          isPending={applyingJobId === opening.id}
          onClick={handleApply}
        >
          Apply
        </LoadingButton>
      </CardContent>
    </Card>
  );
}

export function MyJobOpeningsPage() {
  const openings = useSelfJobOpenings();
  const { mutate: apply, isPending, variables } = useApplyToJobOpening();

  const handleApply = useCallback(
    (jobId: number) => {
      apply(
        { jobId },
        {
          onSuccess: () => {
            toast.success("Application submitted");
          },
          onError: (error) => {
            toast.error(getErrorMessage(error));
          },
        },
      );
    },
    [apply],
  );

  const rows = openings.data ?? [];
  const state = usePageState({
    permission: "self:job-openings",
    isLoading: openings.isLoading,
    isError: openings.isError,
    error: openings.error,
    isEmpty: rows.length === 0,
  });

  return (
    <PageWrapper
      title="Internal Job Openings"
      subtitle="Open roles across the organization you can apply to."
      state={state}
      onRetry={openings.refetch}
      loading={
        <div className={PAGE_BODY_SKELETON_CLASS}>
          {Array.from({ length: 5 }, (_, index) => (
            <Skeleton key={index} className="h-20 rounded-lg" />
          ))}
        </div>
      }
      empty={
        <EmptyState
          illustrationPreset="search"
          title="No internal openings right now"
          description="Roles opened to internal applicants will appear here."
        />
      }
    >
      <div className="flex min-h-0 flex-1 flex-col gap-2">
        {rows.map((opening) => (
          <JobOpeningCard
            key={opening.id}
            opening={opening}
            onApply={handleApply}
            applyingJobId={isPending ? (variables?.jobId ?? null) : null}
          />
        ))}
      </div>
    </PageWrapper>
  );
}
