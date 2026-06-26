"use client";

import { getErrorMessage } from "@/lib/get-error-message";
import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { HrSheet } from "@/features/hr/hr-sheet";
import { toast } from "sonner";
import { format } from "date-fns";
import { Plus, ThumbsUp, MessageSquare, User, EyeOff } from "lucide-react";
import { EmptyActivityIllustration } from "@/components/illustrations";
import { useAbility } from "@/lib/abilities-context";
import { Switch } from "@/components/ui/switch";

interface EnpsScore {
  id: number;
  score: number;
  comment: string | null;
  isAnonymous: boolean;
  period: string;
  createdAt: string | null;
}

const enpsKeys = { all: [...queryKeys.hr.all, "enps"] as const, list: () => [...enpsKeys.all, "list"] as const };

function scoreLabel(score: number): { label: string; variant: "default" | "secondary" | "outline" } {
  if (score >= 9) return { label: "Promoter", variant: "default" };
  if (score >= 7) return { label: "Passive", variant: "secondary" };
  return { label: "Detractor", variant: "outline" };
}

export default function EnpsPage() {
  const qc = useQueryClient();
  const ability = useAbility();
  const isAdmin = ability.can("manage", "hr:performance");

  const { data: scores, isLoading } = useQuery({
    queryKey: enpsKeys.list(),
    queryFn: () => apiClient.get<EnpsScore[]>("/hr/enps"),
    enabled: isAdmin,
  });

  const submit = useMutation({
    mutationFn: (data: { score: number; comment?: string; isAnonymous?: boolean }) =>
      apiClient.post<EnpsScore>("/hr/enps", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: enpsKeys.list() }),
  });

  const [sheetOpen, setSheetOpen] = useState(false);
  const [npsScore, setNpsScore] = useState("8");
  const [comment, setComment] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(true);

  const resetForm = useCallback(() => { setNpsScore("8"); setComment(""); setIsAnonymous(true); }, []);

  const handleSubmit = useCallback(() => {
    const numScore = Number(npsScore);
    if (!Number.isInteger(numScore) || numScore < 0 || numScore > 10) {
      toast.error("Score must be a whole number between 0 and 10"); return;
    }
    submit.mutate(
      { score: numScore, comment: comment.trim() || undefined, isAnonymous },
      {
        onSuccess: () => {
          toast.success("eNPS response submitted"); setSheetOpen(false); resetForm();
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  }, [npsScore, comment, isAnonymous, submit, resetForm]);

  const promoters = (scores ?? []).filter((s) => s.score >= 9).length;
  const detractors = (scores ?? []).filter((s) => s.score <= 6).length;
  const total = scores?.length ?? 0;
  const enpsValue = total > 0 ? Math.round(((promoters - detractors) / total) * 100) : null;

  if (isLoading) {
    return (
      <PageWrapper title="Employee NPS" subtitle="Measure employee loyalty">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-28" />)}
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title="Employee NPS"
      subtitle="Measure and track employee Net Promoter Score"
      badge={enpsValue !== null ? `Score: ${enpsValue > 0 ? "+" : ""}${enpsValue}` : `${total} responses`}
      actions={<Button size="sm" onClick={() => setSheetOpen(true)}><Plus className="h-3.5 w-3.5 mr-1" />Submit Score</Button>}
    >
      {total > 0 && (
        <div className="grid grid-cols-3 gap-3 mb-4">
          <Card><CardContent className="p-3 text-center">
            <p className="text-xs text-muted-foreground">Promoters</p>
            <p className="text-lg font-bold text-green-600">{promoters}</p>
          </CardContent></Card>
          <Card><CardContent className="p-3 text-center">
            <p className="text-xs text-muted-foreground">Passives</p>
            <p className="text-lg font-bold text-amber-600">{total - promoters - detractors}</p>
          </CardContent></Card>
          <Card><CardContent className="p-3 text-center">
            <p className="text-xs text-muted-foreground">Detractors</p>
            <p className="text-lg font-bold text-red-600">{detractors}</p>
          </CardContent></Card>
        </div>
      )}

      {!scores?.length ? (
        <Card><CardContent className="py-12 text-center">
          <EmptyActivityIllustration className="mx-auto mb-4 h-40 w-40 opacity-95" />
          <p className="text-sm text-muted-foreground">No eNPS responses yet.</p>
        </CardContent></Card>
      ) : isAdmin ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {scores.map((s: EnpsScore) => {
            const { label, variant } = scoreLabel(s.score);
            return (
              <Card key={s.id} className="hover:shadow-sm transition-shadow">
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold">{s.score}<span className="text-sm text-muted-foreground">/10</span></span>
                    <Badge variant={variant} className="text-[10px]">{label}</Badge>
                  </div>
                  {s.comment && <p className="text-xs text-muted-foreground line-clamp-2 flex items-start gap-1"><MessageSquare className="h-3 w-3 shrink-0 mt-0.5" />{s.comment}</p>}
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                    {s.isAnonymous ? <EyeOff className="h-3 w-3" /> : <User className="h-3 w-3" />}
                    <span>{s.isAnonymous ? "Anonymous" : "Named"}</span>
                    <span>·</span>
                    <span>{s.period}</span>
                    {s.createdAt && <><span>·</span><span>{format(new Date(s.createdAt), "MMM d")}</span></>}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card><CardContent className="py-8 text-center">
          <ThumbsUp className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Your responses are submitted anonymously. Thank you for participating.</p>
        </CardContent></Card>
      )}

      <HrSheet open={sheetOpen} onOpenChange={(open) => { if (!open) resetForm(); setSheetOpen(open); }} title="Submit eNPS Score" onSubmit={handleSubmit} submitLabel="Submit" isPending={submit.isPending}>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">
            On a scale of 0–10, how likely are you to recommend this company as a place to work? <span className="text-destructive">*</span>
          </label>
          <Input type="number" min={0} max={10} step={1} value={npsScore} onChange={(e) => setNpsScore(e.target.value)} />
          <p className="text-xs text-muted-foreground">0 = Not at all likely · 10 = Extremely likely</p>
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">What&apos;s the main reason for your score? (optional)</label>
          <Textarea placeholder="Share your thoughts..." value={comment} onChange={(e) => setComment(e.target.value)} rows={3} maxLength={500} className="resize-none w-full" />
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Submit anonymously</p>
            <p className="text-xs text-muted-foreground">Your name won&apos;t be attached to this response</p>
          </div>
          <Switch checked={isAnonymous} onCheckedChange={setIsAnonymous} />
        </div>
      </HrSheet>
    </PageWrapper>
  );
}
