import { Award } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatCard, StatCardGrid } from "@/components/ui/stat-card";
import { Skeleton } from "@/components/ui/skeleton";
import { NoPermissionState } from "@/components/shared/no-permission-state";
import { ErrorState } from "@/components/shared/error-state";
import { getErrorMessage } from "@/lib/get-error-message";
import { formatShortDate } from "@/lib/date-utils";
import { useAssessmentAttempts, useSurveyCertificates } from "@/hooks/api/surveys/assessment";

export function AssessmentResultsCard({ surveyId }: { surveyId: number }) {
  const attemptsQuery = useAssessmentAttempts(surveyId, { pageSize: 100 });
  const certificatesQuery = useSurveyCertificates(surveyId);
  const attempts = attemptsQuery.data;
  const certificates = certificatesQuery.data;

  function handleRetry() {
    void attemptsQuery.refetch();
    void certificatesQuery.refetch();
  }

  if (attemptsQuery.access.denied) {
    return <NoPermissionState permission="surveys:assessments:manage" compact />;
  }

  if (
    attemptsQuery.access.pending ||
    certificatesQuery.access.pending ||
    attemptsQuery.isLoading ||
    certificatesQuery.isLoading
  ) {
    return <Skeleton className="h-32 w-full" />;
  }

  if (attemptsQuery.isError || certificatesQuery.isError) {
    return (
      <ErrorState
        compact
        title="Couldn't load assessment results"
        description={getErrorMessage(attemptsQuery.error ?? certificatesQuery.error)}
        onRetry={handleRetry}
      />
    );
  }

  const submitted = (attempts ?? []).filter((a) => a.status === "passed" || a.status === "failed");
  const passedCount = submitted.filter((a) => a.passed).length;
  const passRate = submitted.length > 0 ? Math.round((passedCount / submitted.length) * 100) : 0;

  return (
    <div className="space-y-3">
      <StatCardGrid cols={3}>
        <StatCard label="Attempts" value={attempts?.length ?? 0} icon={Award} />
        <StatCard label="Pass rate" value={`${passRate}%`} icon={Award} />
        <StatCard label="Certificates issued" value={certificates?.length ?? 0} icon={Award} />
      </StatCardGrid>

      {certificates && certificates.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Certificates</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {certificates.map((cert) => (
              <div key={cert.id} className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm">
                <span className="font-mono text-xs">{cert.certificateNumber}</span>
                <Badge variant="default">Issued {formatShortDate(cert.issuedAt)}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
