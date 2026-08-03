"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CandidateProfileCard } from "@/features/candidates/candidate-profile-card";
import { AiScoreCard } from "@/features/candidates/ai-score-card";
import { CompositeScoreCard } from "@/features/candidates/composite-score-card";
import type { AiScoreResult } from "@/hooks/api/hr";
import type { CompositeScoreResult } from "@/hooks/api/hr/recruitment";
import type { CandidateStatus } from "@/types/hr";

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
