"use client";

import { getErrorMessage } from "@/lib/get-error-message";
import { useState, useCallback } from "react";
import { useEmployeeSkills, useAddSkill, type EmployeeSkill } from "@/lib/api/hooks/hr";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { HrSheet } from "@/features/hr/hr-sheet";
import { toast } from "sonner";
import { Plus, Zap, BarChart3, CheckCircle2 } from "lucide-react";

const LEVELS = [
  { value: "1", label: "Beginner" },
  { value: "2", label: "Intermediate" },
  { value: "3", label: "Advanced" },
  { value: "4", label: "Expert" },
  { value: "5", label: "Master" },
];

function levelLabel(level: number | null): string {
  return LEVELS.find((l) => l.value === String(level))?.label ?? "Unknown";
}

function levelColor(level: number | null): string {
  if (level === null) return "bg-muted";
  if (level >= 4) return "bg-green-500";
  if (level >= 3) return "bg-blue-500";
  if (level >= 2) return "bg-amber-500";
  return "bg-muted-foreground";
}

export default function SkillsPage() {
  const { data: skills, isLoading } = useEmployeeSkills();
  const addSkill = useAddSkill();

  const [sheetOpen, setSheetOpen] = useState(false);
  const [skillName, setSkillName] = useState("");
  const [level, setLevel] = useState("3");

  const handleAdd = useCallback(() => {
    if (!skillName.trim()) { toast.error("Skill name is required"); return; }
    addSkill.mutate(
      { skillName: skillName.trim(), level: Number(level) },
      {
        onSuccess: () => {
          toast.success("Skill added"); setSheetOpen(false);
          setSkillName(""); setLevel("3");
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  }, [skillName, level, addSkill]);

  if (isLoading) {
    return (
      <PageWrapper title="Skills Matrix" subtitle="Track team competencies">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
      </PageWrapper>
    );
  }

  // Group skills by skillName for a matrix view
  const grouped = (skills ?? []).reduce<Record<string, EmployeeSkill[]>>((acc, s) => {
    (acc[s.skillName] ??= []).push(s);
    return acc;
  }, {});

  return (
    <PageWrapper
      title="Skills Matrix"
      subtitle="Organization-wide skill mapping and competency tracking"
      badge={`${skills?.length ?? 0} entries`}
      actions={<Button size="sm" onClick={() => setSheetOpen(true)}><Plus className="h-3.5 w-3.5 mr-1" />Add Skill</Button>}
    >
      {!skills?.length ? (
        <Card><CardContent className="py-12 text-center">
          <Zap className="h-8 w-8 text-muted-foreground/20 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No skills recorded yet. Add your first skill.</p>
        </CardContent></Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Object.entries(grouped).map(([name, entries]) => (
            <Card key={name} className="hover:shadow-sm transition-shadow">
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold">{name}</h3>
                  <Badge variant="outline" className="text-[10px]">{entries.length} people</Badge>
                </div>
                <div className="space-y-1">
                  {entries.slice(0, 5).map((s) => (
                    <div key={s.id} className="flex items-center gap-2 text-xs">
                      <div className={`h-2 w-2 rounded-full ${levelColor(s.level)}`} />
                      <span className="flex-1 truncate">{s.user?.name ?? "You"}</span>
                      <span className="text-[10px] text-muted-foreground">{levelLabel(s.level)}</span>
                      {s.verifiedBy && <CheckCircle2 className="h-3 w-3 text-green-500 shrink-0" />}
                    </div>
                  ))}
                  {entries.length > 5 && <p className="text-[10px] text-muted-foreground">+{entries.length - 5} more</p>}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <HrSheet open={sheetOpen} onOpenChange={setSheetOpen} title="Add Skill" onSubmit={handleAdd} submitLabel="Add" isPending={addSkill.isPending}>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Skill Name</label>
          <Input placeholder="e.g., React, Python, Leadership" value={skillName} onChange={(e) => setSkillName(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Proficiency Level</label>
          <Select value={level} onValueChange={setLevel}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{LEVELS.map((l) => <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </HrSheet>
    </PageWrapper>
  );
}
