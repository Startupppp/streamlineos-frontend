"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ClipboardCheck } from "lucide-react";
import type { CompositeScoreResult, CompositeVerdict } from "@/lib/api/hooks/hr/recruitment";

function verdictColor(verdict: CompositeVerdict): string {
  if (verdict === "STRONG_HIRE") return "text-green-600";
  if (verdict === "HIRE") return "text-emerald-500";
  if (verdict === "ON_FENCE") return "text-yellow-600";
  return "text-destructive";
}

function verdictBadge(verdict: CompositeVerdict): "default" | "secondary" | "outline" | "destructive" {
  if (verdict === "STRONG_HIRE" || verdict === "HIRE") return "default";
  if (verdict === "ON_FENCE") return "secondary";
  return "destructive";
}

interface CompositeScoreCardProps {
  compositeScore: CompositeScoreResult | null;
  onGenerate: () => void;
  isPending: boolean;
}

export function CompositeScoreCard({ compositeScore, onGenerate, isPending }: CompositeScoreCardProps) {
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
              <Badge variant={verdictBadge(compositeScore.verdict)} className="text-[10px]">
                {compositeScore.verdict.replace("_", " ")}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Composite</span>
              <span className={`text-2xl font-bold ${verdictColor(compositeScore.verdict)}`}>
                {compositeScore.overall}<span className="text-sm text-muted-foreground">/100</span>
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
                <p className="text-[10px] font-medium text-green-700 dark:text-green-400 mb-1">Strengths</p>
                <ul className="space-y-0.5">
                  {compositeScore.strengthsAcrossRounds.map((s, i) => (
                    <li key={i} className="text-[10px] text-muted-foreground flex gap-1">
                      <span className="text-green-500 shrink-0">+</span>{s}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {compositeScore.concernsAcrossRounds.length > 0 && (
              <div>
                <p className="text-[10px] font-medium text-destructive mb-1">Concerns</p>
                <ul className="space-y-0.5">
                  {compositeScore.concernsAcrossRounds.map((c, i) => (
                    <li key={i} className="text-[10px] text-muted-foreground flex gap-1">
                      <span className="text-destructive shrink-0">{"\u2212"}</span>{c}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ) : (
          <div className="py-3 text-center">
            <p className="text-xs text-muted-foreground">
              Click &quot;Analyze&quot; to generate a composite hire recommendation across all interview rounds.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
