"use client";

import { getErrorMessage } from "@/lib/get-error-message";
import { useState, useCallback } from "react";
import { useEmployeeSkills, useAddSkill, type EmployeeSkill } from "@/hooks/api/hr";
import { useRoleSkillRequirements } from "@/hooks/api/hr/skill-gap";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { HrSheet } from "@/features/hr/hr-sheet";
import { toast } from "sonner";
import { Plus, CheckCircle2, BookOpen, Users, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { TruncatedText } from "@/components/ui/truncated-text";

const LEVELS = [
  { value: "1", label: "Beginner" },
  { value: "2", label: "Elementary" },
  { value: "3", label: "Intermediate" },
  { value: "4", label: "Advanced" },
  { value: "5", label: "Expert" },
];

function normalizeSkillName(name: string): string {
  return name.trim().replace(/\s+/g, " ").toLowerCase();
}

function validateSkillName(name: string): string | null {
  const trimmed = name.trim().replace(/\s+/g, " ");
  if (trimmed.length < 1) return "Skill name is required.";
  if (trimmed.length > 80) return "Skill name must be at most 80 characters.";
  if (!/[\p{L}\p{N}]/u.test(trimmed)) return "Skill name must contain a letter or number.";
  return null;
}

function levelLabel(level: number | null): string {
  return LEVELS.find((l) => l.value === String(level))?.label ?? "Unknown";
}

function getProficiencyMeta(level: number | null): {
  label: string;
  badge: string;
  dot: string;
} {
  if (level === null || level === undefined) return {
    label: "Unknown",
    badge: "bg-muted border-border text-muted-foreground",
    dot: "bg-slate-400",
  };
  if (level >= 5) return {
    label: "Expert",
    badge: "bg-emerald-100 border-emerald-200 text-emerald-700 dark:bg-emerald-500/10 dark:border-emerald-500/30 dark:text-emerald-300",
    dot: "bg-emerald-500",
  };
  if (level >= 3) return {
    label: level === 4 ? "Advanced" : "Intermediate",
    badge: "bg-blue-100 border-blue-200 text-blue-700 dark:bg-blue-500/10 dark:border-blue-500/30 dark:text-blue-300",
    dot: "bg-blue-500",
  };
  return {
    label: level === 2 ? "Elementary" : "Beginner",
    badge: "bg-amber-100 border-amber-200 text-amber-700 dark:bg-amber-500/10 dark:border-amber-500/30 dark:text-amber-300",
    dot: "bg-amber-500",
  };
}

function getCardAccent(maxLevel: number | null): string {
  if (maxLevel === null) return "border-l-border";
  if (maxLevel >= 5) return "border-l-emerald-500";
  if (maxLevel >= 3) return "border-l-blue-500";
  return "border-l-amber-500";
}

export default function SkillsPage() {
  const { data: skills, isLoading, isError, refetch } = useEmployeeSkills();
  const addSkill = useAddSkill();
  const { data: requirements } = useRoleSkillRequirements();

  const handleRetry = useCallback(() => { void refetch(); }, [refetch]);

  const [sheetOpen, setSheetOpen] = useState(false);
  const [skillName, setSkillName] = useState("");
  const [level, setLevel] = useState("3");
  const [nameError, setNameError] = useState<string | null>(null);

  const handleSkillNameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSkillName(e.target.value);
    setNameError(null);
  }, []);

  const handleOpenSheet = useCallback(() => setSheetOpen(true), []);

  const handleSheetOpenChange = useCallback((open: boolean) => {
    setSheetOpen(open);
    if (!open) { setSkillName(""); setLevel("3"); setNameError(null); }
  }, []);

  const handleAdd = useCallback(() => {
    const validationError = validateSkillName(skillName);
    if (validationError) { setNameError(validationError); return; }

    const normalizedNew = normalizeSkillName(skillName);
    const grouped = (skills ?? []).reduce<Record<string, string>>((acc, s) => {
      acc[normalizeSkillName(s.skillName)] = s.skillName;
      return acc;
    }, {});

    if (grouped[normalizedNew]) {
      setNameError(`A skill with this name already exists (did you mean "${grouped[normalizedNew]}"?)`);
      return;
    }

    addSkill.mutate(
      { skillName: skillName.trim().replace(/\s+/g, " "), level: Number(level) },
      {
        onSuccess: () => {
          toast.success("Skill added");
          setSheetOpen(false);
          setSkillName(""); setLevel("3"); setNameError(null);
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  }, [skillName, level, addSkill, skills]);

  if (isLoading) {
    return (
      <PageWrapper title="Skills Matrix" subtitle="Track team competencies" variant="display">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 10 }).map((_, i) => <Skeleton key={i} className="h-40 rounded-2xl" />)}
        </div>
      </PageWrapper>
    );
  }

  if (isError) {
    return (
      <PageWrapper title="Skills Matrix" subtitle="Track team competencies" variant="display">
        <div className="flex flex-col items-center justify-center py-14 text-center gap-3">
          <AlertCircle className="w-8 text-destructive" />
          <div>
            <p className="text-sm font-medium text-foreground">Failed to load skills</p>
            <p className="text-xs text-muted-foreground mt-0.5">Something went wrong. Please try again.</p>
          </div>
          <Button size="sm" variant="outline" onClick={handleRetry}>Try again</Button>
        </div>
      </PageWrapper>
    );
  }

  const grouped = (skills ?? []).reduce<Record<string, EmployeeSkill[]>>((acc, s) => {
    (acc[s.skillName] ??= []).push(s);
    return acc;
  }, {});

  const sortedGroups = Object.entries(grouped).sort((a, b) => b[1].length - a[1].length);

  return (
    <PageWrapper
      title="Skills Matrix"
      subtitle="Organization-wide skill mapping and competency tracking"
      actions={
        <Button size="sm" className="gap-1.5" onClick={handleOpenSheet}>
          <Plus className="h-3.5 w-3.5" />
          Add Skill
        </Button>
      }
    >
      {!skills?.length ? (
        <EmptyState
          illustrationPreset="learning"
          title="No skills recorded yet"
          description="Add your skills to build the organization's competency map."
          action={{ label: "Add Skill", onClick: handleOpenSheet }}
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {sortedGroups.map(([name, entries]) => {
            const maxLevel = entries.reduce<number | null>((max, e) => {
              if (e.level === null) return max;
              return max === null ? e.level : Math.max(max, e.level);
            }, null);
            const accent = getCardAccent(maxLevel);

            const expertCount = entries.filter((e) => e.level !== null && e.level >= 5).length;
            const intermediateCount = entries.filter((e) => e.level !== null && e.level >= 3 && e.level < 5).length;
            const beginnerCount = entries.filter((e) => e.level !== null && e.level < 3).length;

            return (
              <Card
                key={name}
                className={cn(
                  "rounded-2xl border border-border/70 bg-card/90 backdrop-blur-sm shadow-[0_1px_2px_rgba(15,23,42,0.04),0_12px_32px_-14px_rgba(15,23,42,0.12)] overflow-hidden",
                  "border-l-4 transition-shadow duration-200 hover:shadow-md",
                  accent,
                )}
              >
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="w-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <BookOpen className="h-3.5 w-3.5 text-primary" />
                      </div>
                      <h3 className="text-sm font-semibold text-foreground leading-tight">{name}</h3>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Users className="h-3 w-3 text-muted-foreground" />
                      <span className="text-[11px] font-semibold text-muted-foreground">{entries.length}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {expertCount > 0 && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border bg-emerald-100 border-emerald-200 text-emerald-700 dark:bg-emerald-500/10 dark:border-emerald-500/30 dark:text-emerald-300">
                        {expertCount} Expert{expertCount > 1 ? "s" : ""}
                      </span>
                    )}
                    {intermediateCount > 0 && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border bg-blue-100 border-blue-200 text-blue-700 dark:bg-blue-500/10 dark:border-blue-500/30 dark:text-blue-300">
                        {intermediateCount} Intermediate
                      </span>
                    )}
                    {beginnerCount > 0 && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border bg-amber-100 border-amber-200 text-amber-700 dark:bg-amber-500/10 dark:border-amber-500/30 dark:text-amber-300">
                        {beginnerCount} Beginner{beginnerCount > 1 ? "s" : ""}
                      </span>
                    )}
                  </div>

                  <div className="space-y-1.5 pt-0.5">
                    {entries.slice(0, 4).map((s) => {
                      const profMeta = getProficiencyMeta(s.level);
                      return (
                        <div key={s.id} className="flex items-center gap-2">
                          <span className={cn("h-2 w-2 rounded-full shrink-0", profMeta.dot)} />
                          <TruncatedText text={s.user?.name ?? "You"} className="flex-1 text-xs text-foreground" />
                          <span className={cn(
                            "inline-flex items-center gap-1 text-[9px] font-semibold px-1.5 py-0.5 rounded-full border shrink-0",
                            profMeta.badge,
                          )}>
                            {levelLabel(s.level)}
                          </span>
                          {s.verifiedBy && (
                            <CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0" />
                          )}
                        </div>
                      );
                    })}
                    {entries.length > 4 && (
                      <p className="text-[10px] text-muted-foreground pt-0.5">
                        +{entries.length - 4} more
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Card className="mt-6">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Role Skill Requirements</CardTitle>
        </CardHeader>
        <CardContent>
          {requirements?.length ? (
            requirements.map((req) => (
              <div key={req.id} className="flex items-center justify-between py-1.5 border-b last:border-0 text-sm">
                <span className="font-medium">{req.skillName}</span>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">{req.roleName ?? "General"}</span>
                  <Badge variant="outline" className="text-xs">Level {req.requiredLevel}</Badge>
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground py-2">No role requirements defined yet.</p>
          )}
        </CardContent>
      </Card>

      <HrSheet
        open={sheetOpen}
        onOpenChange={handleSheetOpenChange}
        title="Add Skill"
        onSubmit={handleAdd}
        submitLabel="Add"
        isPending={addSkill.isPending}
      >
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Skill Name</label>
          <Input
            placeholder="e.g., React, Python, Leadership"
            value={skillName}
            onChange={handleSkillNameChange}
            aria-invalid={!!nameError}
          />
          {nameError && <p className="text-xs text-destructive">{nameError}</p>}
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Proficiency Level</label>
          <Select value={level} onValueChange={setLevel}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent className="w-[var(--radix-select-trigger-width)]">
              {LEVELS.map((l) => <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </HrSheet>
    </PageWrapper>
  );
}
