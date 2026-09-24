"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CandidateProfileCard } from "@/features/hr/recruitment/candidates/candidate-profile-card";
import { AiScoreCard } from "@/features/hr/recruitment/candidates/ai-score-card";
import { CompositeScoreCard } from "@/features/hr/recruitment/candidates/composite-score-card";
import type { AiScoreResult } from "@/hooks/api/hr";
import type { CompositeScoreResult } from "@/hooks/api/hr/recruitment";
import {
  REJECTION_REASON_LABELS,
  type RejectionReason,
} from "@/hooks/api/hr/recruitment/rejection-reasons-schema";
import type { CandidateStatus } from "@/types/hr";

/**
 * What a rejected candidate was rejected for.
 *
 * Shown for every rejected candidate, including the ones with no reason on
 * record: rejections made before the reason became required are real rows, and
 * rendering nothing for them would read as "this screen does not show reasons"
 * rather than "nobody recorded one".
 *
 * The label is looked up from the stored code — the code is what the row holds,
 * so rewording a label here never rewrites history.
 */
function RejectionReasonCard({
  reason,
  note,
}: {
  reason: RejectionReason | null;
  note: string | null;
}) {
  return (
    <Card>
      <CardHeader className="p-4 pb-2">
        <CardTitle className="text-xs font-medium">Rejection reason</CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-0 space-y-1.5">
        {reason ? (
          <p className="text-sm font-medium text-foreground">
            {REJECTION_REASON_LABELS[reason]}
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">
            Not recorded — this rejection predates the reason requirement.
          </p>
        )}
        {note && (
          <p className="text-xs text-muted-foreground whitespace-pre-wrap">{note}</p>
        )}
      </CardContent>
    </Card>
  );
}

interface CandidateDetailSidebarProps {
  status: CandidateStatus | null;
  rating: number | null;
  email: string;
  phone: string | null;
  source: string | null;
  experienceYears: string | null;
  linkedinUrl: string | null;
  skills: string[] | null;
  notes: string | null;
  rejectionReason: RejectionReason | null;
  rejectionNote: string | null;
  displayAiScore: AiScoreResult | null;
  aiScoreGeneratedAt: Date | string | null;
  isLatestScore: boolean;
  isAiScorePending: boolean;
  compositeScore: CompositeScoreResult | null;
  isCompositeScorePending: boolean;
  hasSubmittedScorecard: boolean;
  isUpdating: boolean;
  onStatusChange: (status: CandidateStatus) => void;
  onGenerateAiScore: () => void;
  onGenerateCompositeScore: () => void;
}

export function CandidateDetailSidebar({
  status,
  rating,
  email,
  phone,
  source,
  experienceYears,
  linkedinUrl,
  skills,
  notes,
  rejectionReason,
  rejectionNote,
  displayAiScore,
  aiScoreGeneratedAt,
  isLatestScore,
  isAiScorePending,
  compositeScore,
  isCompositeScorePending,
  hasSubmittedScorecard,
  isUpdating,
  onStatusChange,
  onGenerateAiScore,
  onGenerateCompositeScore,
}: CandidateDetailSidebarProps) {
  return (
    <div className="lg:col-span-1 space-y-4">
      <CandidateProfileCard
        status={status}
        rating={rating}
        email={email}
        phone={phone}
        source={source}
        experienceYears={experienceYears}
        linkedinUrl={linkedinUrl}
        skills={skills}
        onStatusChange={onStatusChange}
        isUpdating={isUpdating}
      />

      {status === "REJECTED" && (
        <RejectionReasonCard reason={rejectionReason} note={rejectionNote} />
      )}

      <AiScoreCard
        displayAiScore={displayAiScore}
        aiScoreGeneratedAt={aiScoreGeneratedAt}
        isLatestScore={isLatestScore}
        isPending={isAiScorePending}
        onGenerate={onGenerateAiScore}
      />

      {(hasSubmittedScorecard || compositeScore) && (
        <CompositeScoreCard
          compositeScore={compositeScore}
          isPending={isCompositeScorePending}
          onGenerate={onGenerateCompositeScore}
        />
      )}

      {notes && (
        <Card>
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-xs font-medium">Notes</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <p className="text-xs text-muted-foreground whitespace-pre-wrap">
              {notes}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
