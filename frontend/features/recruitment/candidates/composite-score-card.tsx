"use client";

import { memo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ClipboardCheck } from "lucide-react";
import type { CompositeScoreResult, CompositeVerdict } from "@/hooks/api/hr/recruitment";

function verdictColor(verdict: CompositeVerdict): string {
  if (verdict === "STRONG_HIRE") return "text-status-success-ink";
  if (verdict === "HIRE") return "text-status-success-ink";
  if (verdict === "ON_FENCE") return "text-status-warning-ink";
  return "text-destructive";
}

function verdictBadge(verdict: CompositeVerdict): "default" | "secondary" | "outline" | "destructive" {
  if (verdict === "STRONG_HIRE" || verdict === "HIRE") return "default";
  if (verdict === "ON_FENCE") return "secondary";
  return "destructive";
}

interface StrengthItemProps {
  text: string;
}

const StrengthItem = memo(function StrengthItem({ text }: StrengthItemProps) {
  return (
    <li className="text-micro text-muted-foreground flex gap-1">
      <span className="text-status-success-ink shrink-0">+</span>{text}
    </li>
  );
});

interface ConcernItemProps {
  text: string;
}

const ConcernItem = memo(function ConcernItem({ text }: ConcernItemProps) {
  return (
    <li className="text-micro text-muted-foreground flex gap-1">
      <span className="text-destructive shrink-0">−</span>{text}
    </li>
  );
});

interface CompositeScoreCardProps {
  compositeScore: CompositeScoreResult | null;
  isPending: boolean;
  onGenerate: () => void;
}

export const CompositeScoreCard = memo(function CompositeScoreCard({
  compositeScore,
  isPending,
  onGenerate,
}: CompositeScoreCardProps) {
  return (
    <Card>
      <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-xs font-medium flex items-center gap-1.5">
          <ClipboardCheck className="h-3.5 w-3.5 text-primary" />
          Composite Score
        </CardTitle>
        <Button
          variant="outline"
          size="sm"
          className="h-6 text-xs px-2"
          onClick={onGenerate}
          disabled={isPending}
        >
          {isPending ? "Analyzing..." : compositeScore ? "Re-analyze" : "Analyze"}
        </Button>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        {compositeScore ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Verdict</span>
              <Badge variant={verdictBadge(compositeScore.verdict)} className="text-micro">
                {compositeScore.verdict.replace("_", " ")}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Composite</span>
              <span className={`text-2xl font-bold ${verdictColor(compositeScore.verdict)}`}>
                {compositeScore.overall}
                <span className="text-sm text-muted-foreground">/100</span>
              </span>
            </div>
            <Progress value={compositeScore.overall} className="h-1.5" />
            {compositeScore.reasoning && (
              <p className="text-xs text-muted-foreground italic pt-1 border-t">
                {compositeScore.reasoning}
              </p>
            )}
            {compositeScore.strengthsAcrossRounds.length > 0 && (
              <div>
                <p className="text-micro font-medium text-status-success-ink mb-1">
                  Strengths
                </p>
                <ul className="space-y-0.5">
                  {compositeScore.strengthsAcrossRounds.map((s, i) => (
                    <StrengthItem key={i} text={s} />
                  ))}
                </ul>
              </div>
            )}
            {compositeScore.concernsAcrossRounds.length > 0 && (
              <div>
                <p className="text-micro font-medium text-destructive mb-1">Concerns</p>
                <ul className="space-y-0.5">
                  {compositeScore.concernsAcrossRounds.map((c, i) => (
                    <ConcernItem key={i} text={c} />
                  ))}
                </ul>
              </div>
            )}
          </div>
        ) : (
          <div className="py-3 text-center">
            <p className="text-xs text-muted-foreground">
              Click &quot;Analyze&quot; to generate a composite hire recommendation across all
              interview rounds.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
});
