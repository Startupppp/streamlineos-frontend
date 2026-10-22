import { Suspense } from "react";
import { HydrationBoundary } from "@tanstack/react-query";
import { enforceRouteAccess } from "@/lib/rbac/route-access/enforce-route-access";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { RequireModule } from "@/components/auth/require-module";
import { FeedbucketSubmissionDetail } from "@/features/feedbucket";
import { prefetchFeedbucketSubmission } from "@/lib/prefetch/build-project-extras";
import FeedbucketSubmissionLoading from "./loading";

interface PageProps {
  params: Promise<{ projectId: string; submissionId: string }>;
}

async function SubmissionDetailHydrated({
  submissionId,
  backHref,
}: {
  submissionId: number;
  backHref: string;
}) {
  const state = await prefetchFeedbucketSubmission(submissionId);
  return (
    <HydrationBoundary state={state}>
      <PageWrapper title="Submission" backHref={backHref}>
        <FeedbucketSubmissionDetail submissionId={submissionId} backHref={backHref} />
      </PageWrapper>
    </HydrationBoundary>
  );
}

export default async function ProjectFeedbackSubmissionRoute({ params }: PageProps) {
  await enforceRouteAccess("/build/[projectId]/feedbucket/[submissionId]");
  const { projectId, submissionId } = await params;
  const id = Number(submissionId);
  const backHref = `/build/${projectId}/feedbucket`;
  return (
    <RequireModule module="build">
      <Suspense fallback={<FeedbucketSubmissionLoading />}>
        <SubmissionDetailHydrated submissionId={id} backHref={backHref} />
      </Suspense>
    </RequireModule>
  );
}
