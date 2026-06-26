"use client";

import { getErrorMessage } from "@/lib/get-error-message";
import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { HrSheet } from "@/features/hr/hr-sheet";
import { toast } from "sonner";
import { Plus, ClipboardCheck, Clock, Users } from "lucide-react";
import { EmptyDocumentsIllustration } from "@/components/illustrations";
import { useAbility } from "@/lib/abilities-context";

interface Assessment {
  id: number;
  title: string;
  skillName: string;
  questions: { id: string; question: string; options: string[]; correctIndex: number }[] | null;
  passingScore: number;
  timeLimit: number | null;
  createdAt: string;
  attempts: { id: number; score: number | null; passed: boolean }[];
}

const assessKeys = { all: [...queryKeys.hr.all, "assessments"] as const, list: () => [...assessKeys.all, "list"] as const };

export default function AssessmentsPage() {
  const qc = useQueryClient();
  const ability = useAbility();
  const isAdmin = ability.can("manage", "hr:performance");

  const { data: items, isLoading } = useQuery({
    queryKey: assessKeys.list(),
    queryFn: () => apiClient.get<Assessment[]>("/hr/assessments"),
  });

  const create = useMutation({
    mutationFn: (data: { title: string; skillName?: string; durationMinutes?: number }) =>
      apiClient.post<Assessment>("/hr/assessments", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: assessKeys.list() }),
  });

  const [sheetOpen, setSheetOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [skillName, setSkillName] = useState("");
  const [duration, setDuration] = useState("30");

  const resetForm = useCallback(() => { setTitle(""); setSkillName(""); setDuration("30"); }, []);

  const handleCreate = useCallback(() => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) { toast.error("Title is required"); return; }
    if (trimmedTitle.length < 2) { toast.error("Title must be at least 2 characters"); return; }
    if (trimmedTitle.length > 200) { toast.error("Title must be at most 200 characters"); return; }
    const numDuration = Number(duration);
    if (duration && (!Number.isInteger(numDuration) || numDuration < 1 || numDuration > 480)) {
      toast.error("Duration must be a whole number between 1 and 480 minutes"); return;
    }
    create.mutate(
      { title: trimmedTitle, skillName: skillName.trim() || undefined, durationMinutes: numDuration || 30 },
      {
        onSuccess: () => { toast.success("Assessment created"); setSheetOpen(false); resetForm(); },
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  }, [title, skillName, duration, create, resetForm]);

  if (isLoading) {
    return (
      <PageWrapper title="Assessments" subtitle="Skills assessments and quizzes">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-36" />)}
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title="Skills Assessments"
      subtitle="Create and take skill assessment quizzes"
      badge={`${items?.length ?? 0} assessments`}
      actions={isAdmin ? <Button size="sm" onClick={() => setSheetOpen(true)}><Plus className="h-3.5 w-3.5 mr-1" />Create Assessment</Button> : undefined}
    >
      {!items?.length ? (
        <Card><CardContent className="py-12 text-center">
          <EmptyDocumentsIllustration className="mx-auto mb-4 h-40 w-40 opacity-95" />
            <p className="text-sm text-muted-foreground">No assessments available.</p>
        </CardContent></Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((a: Assessment) => {
            const questionCount = a.questions?.length ?? 0;
            const completedCount = a.attempts?.length ?? 0;
            return (
              <Card key={a.id} className="hover:shadow-sm transition-shadow">
                <CardContent className="p-4 space-y-2">
                  {a.skillName && <span className="text-[10px] text-muted-foreground">{a.skillName}</span>}
                  <h3 className="text-sm font-semibold leading-tight">{a.title}</h3>
                  <div className="flex flex-wrap gap-2 text-[10px] text-muted-foreground">
                    {a.timeLimit && <span className="flex items-center gap-0.5"><Clock className="h-3 w-3" />{a.timeLimit} min</span>}
                    <span className="flex items-center gap-0.5"><ClipboardCheck className="h-3 w-3" />{questionCount} questions</span>
                    <span className="flex items-center gap-0.5"><Users className="h-3 w-3" />{completedCount} completed</span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <HrSheet open={sheetOpen} onOpenChange={(open) => { if (!open) resetForm(); setSheetOpen(open); }} title="Create Assessment" onSubmit={handleCreate} submitLabel="Create" isPending={create.isPending}>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Title <span className="text-destructive">*</span></label>
          <Input placeholder="e.g., JavaScript Proficiency" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Skill / Category</label>
            <Input placeholder="e.g., Technical" value={skillName} onChange={(e) => setSkillName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Duration (min)</label>
            <Input type="number" min={1} max={480} step={1} value={duration} onChange={(e) => setDuration(e.target.value)} />
          </div>
        </div>
      </HrSheet>
    </PageWrapper>
  );
}
