"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Sparkles } from "lucide-react";
import type { AiScoreResult } from "@/lib/api/hooks/hr";
import { format } from "date-fns";

const AI_SCORE_DIMENSIONS: Array<{ key: keyof AiScoreResult["breakdown"]; label: string }> = [
  { key: "technicalSkills", label: "Technical Skills" },
  { key: "experience", label: "Experience" },
  { key: "communication", label: "Communication" },
  { key: "cultureFit", label: "Culture Fit" },
  { key: "leadership", label: "Leadership" },
];

function scoreColor(score: number): string {
  if (score >= 70) return "text-green-600";
  if (score >= 40) return "text-yellow-600";
  return "text-destructive";
}

interface AiScoreCardProps {
  displayAiScore: AiScoreResult | null;
  aiScoreGeneratedAt: string | null | undefined;
  hasLatestScore: boolean;
  onGenerate: () => void;
  isPending: boolean;
}

export function AiScoreCard({
  displayAiScore,
  aiScoreGeneratedAt,
  hasLatestScore,
  onGenerate,
  isPending,
}: AiScoreCardProps) {
  return (
    <Card>
      <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-xs font-medium flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          AI Score
        </CardTitle>
        <Button
          variant="outline"
          size="sm"
          className="h-6 text-xs px-2"
          onClick={onGenerate}
          disabled={isPending}
        >
          {isPending ? "Scoring..." : displayAiScore ? "Re-score" : "Generate"}
        </Button>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        {displayAiScore ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Overall</span>
              <span className={`text-2xl font-bold ${scoreColor(displayAiScore.overall)}`}>
                {displayAiScore.overall}<span className="text-sm text-muted-foreground">/100</span>
              </span>
            </div>
            <Progress value={displayAiScore.overall} className="h-1.5" />
            <div className="space-y-2 pt-1">
              {AI_SCORE_DIMENSIONS.map(({ key, label }) => {
                const score = displayAiScore.breakdown[key] ?? 0;
                return (
                  <div key={key}>
                    <div className="flex justify-between text-xs mb-0.5">
                      <span className="text-muted-foreground">{label}</span>
                      <span className={scoreColor(score)}>{score}</span>
                    </div>
                    <Progress value={score} className="h-1" />
                  </div>
                );
              })}
            </div>
            {displayAiScore.summary && (
              <p className="text-xs text-muted-foreground italic pt-1 border-t">
                {displayAiScore.summary}
              </p>
            )}
            {aiScoreGeneratedAt && !hasLatestScore && (
              <p className="text-[10px] text-muted-foreground">
                Scored {format(new Date(aiScoreGeneratedAt), "PPp")}
              </p>
            )}
          </div>
        ) : (
          <div className="py-4 text-center">
            <Sparkles className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-xs text-muted-foreground">
              Click &quot;Generate&quot; to score this candidate with AI.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
