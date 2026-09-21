import { enforceRouteAccess } from "@/lib/rbac/route-access/enforce-route-access";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { DashboardGate } from "@/components/shared/dashboard-gate";
import { RequireModule } from "@/components/auth/require-module";
import { FeedbucketSubmissionDetail } from "@/features/feedbucket";

interface PageProps {
  params: Promise<{ projectId: string; submissionId: string }>;
}

export default async function ProjectFeedbackSubmissionRoute({ params }: PageProps) {
  await enforceRouteAccess("/build/[projectId]/feedbucket/[submissionId]");
  const { projectId, submissionId } = await params;
  const id = Number(submissionId);
  const backHref = `/build/${projectId}/feedbucket`;

  return (
    <RequireModule module="feedbucket">
      <DashboardGate permission="feedbucket:submissions:view">
        <PageWrapper title="Submission" backHref={backHref}>
          <FeedbucketSubmissionDetail submissionId={id} backHref={backHref} />
        </PageWrapper>
      </DashboardGate>
    </RequireModule>
  );
}
