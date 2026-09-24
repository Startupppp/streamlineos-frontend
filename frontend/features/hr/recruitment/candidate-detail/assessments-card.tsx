"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { LoadingButton } from "@/components/ui/loading-button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDateTime } from "@/lib/date-utils";
import { getErrorMessage } from "@/lib/get-error-message";
import { useCan } from "@/hooks/api/access";
import {
  useCandidateAssessments,
  useInviteAssessment,
  type AssessmentView,
} from "@/hooks/api/hr/recruitment/assessments";

interface Props {
  candidateId: number;
}

/**
 * Tests sent to this candidate, and their scores.
 *
 * Recruiter-only by construction: the read is gated on `hr:requisitions:view`
 * and no candidate-facing surface reads this hook. A score is an evaluation of
 * somebody, not a message to them, and showing it in a candidate portal is a
 * decision an organisation would have to make deliberately rather than inherit.
 */
export function AssessmentsCard({ candidateId }: Props) {
  const { data, isLoading, isError } = useCandidateAssessments(candidateId);
  const invite = useInviteAssessment(candidateId);
  const canManage = useCan("hr:requisitions:manage");
  const [testId, setTestId] = useState("");

  const handleTestIdChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => setTestId(e.target.value),
    [],
  );

  const handleInvite = useCallback(() => {
    if (!testId.trim()) {
      toast.error("Enter the vendor's test id.");
      return;
    }
    invite.mutate(testId.trim(), {
      onSuccess: () => {
        toast.success("Assessment sent");
        setTestId("");
      },
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  }, [invite, testId]);

  if (isError) return null;

  const blocked = data?.[0]?.providerBlockedReason ?? null;

  return (
    <Card>
      <CardHeader className="p-4 pb-2">
        <CardTitle className="text-sm">Assessments</CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-0 space-y-3">
        {isLoading ? (
          <Skeleton className="h-16 w-full" />
        ) : (data?.length ?? 0) === 0 ? (
          <p className="text-xs text-muted-foreground">No tests sent to this candidate.</p>
        ) : (
          <div className="space-y-2">
            {(data ?? []).map((assessment) => (
              <AssessmentRow key={assessment.id} assessment={assessment} />
            ))}
          </div>
        )}

        {/*
          When no vendor is connected the reason replaces the send control
          entirely. Offering a "Send test" button that would refuse sends a
          recruiter to find a key that this organisation has not bought.
        */}
        {blocked ? (
          <p className="text-xs text-muted-foreground rounded-md border bg-muted/40 px-3 py-2">
            {blocked}
          </p>
        ) : (
          canManage && (
            <div className="flex gap-2">
              <Input
                value={testId}
                onChange={handleTestIdChange}
                placeholder="Vendor test id"
                aria-label="Vendor test id"
              />
              <LoadingButton size="sm" onClick={handleInvite} isPending={invite.isPending}>
                Send test
              </LoadingButton>
            </div>
          )
        )}
      </CardContent>
    </Card>
  );
}

function AssessmentRow({ assessment }: { assessment: AssessmentView }) {
  return (
    <div className="rounded-md border px-3 py-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-foreground">{assessment.testId ?? "Assessment"}</p>
        <div className="flex items-center gap-2">
          {assessment.score !== null && (
            <span className="text-xs font-mono tabular-nums text-foreground">
              {assessment.score}%
            </span>
          )}
          <Badge variant="outline" className="text-micro">
            {assessment.result}
          </Badge>
        </div>
      </div>
      {/*
        A score with a PENDING result is not a bug and the copy says so: the
        organisation has set no pass mark, so nothing here decides whether that
        number is a pass.
      */}
      {assessment.score !== null && assessment.result === "PENDING" && (
        <p className="text-xs text-muted-foreground mt-1">
          Scored, but no pass mark is set for this vendor — nobody has decided whether this passes.
        </p>
      )}
      <p className="text-xs text-muted-foreground mt-1">
        Sent {formatDateTime(assessment.invitedAt)}
        {assessment.scoredAt ? ` · scored ${formatDateTime(assessment.scoredAt)}` : ""}
      </p>
    </div>
  );
}
