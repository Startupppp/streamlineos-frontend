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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, GraduationCap, Clock } from "lucide-react";
import { EmptyDocumentsIllustration } from "@/components/illustrations";
import { useAbility } from "@/lib/abilities-context";

interface LearningPath {
  id: number;
  title: string;
  description: string | null;
  level: string | null;
  estimatedHours: number | null;
  targetRole: string | null;
  createdAt: string | null;
}

const lpKeys = { all: [...queryKeys.hr.all, "learning-paths"] as const, list: () => [...lpKeys.all, "list"] as const };

export default function LearningPathsPage() {
  const qc = useQueryClient();
  const ability = useAbility();
  const isAdmin = ability.can("manage", "hr:performance");

  const { data: paths, isLoading } = useQuery({
    queryKey: lpKeys.list(),
    queryFn: () => apiClient.get<LearningPath[]>("/hr/learning-paths"),
  });

  const create = useMutation({
    mutationFn: (data: { title: string; description?: string; level?: string; estimatedHours?: number }) =>
      apiClient.post<LearningPath>("/hr/learning-paths", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: lpKeys.list() }),
  });

  const [sheetOpen, setSheetOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [level, setLevel] = useState("");
  const [hours, setHours] = useState("");

  const resetForm = useCallback(() => { setTitle(""); setDescription(""); setLevel(""); setHours(""); }, []);

  const handleCreate = useCallback(() => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) { toast.error("Title is required"); return; }
    if (trimmedTitle.length < 2) { toast.error("Title must be at least 2 characters"); return; }
    if (trimmedTitle.length > 200) { toast.error("Title must be at most 200 characters"); return; }
    const numHours = Number(hours);
    if (hours && (!Number.isInteger(numHours) || numHours < 1)) {
      toast.error("Estimated hours must be a positive whole number"); return;
    }
    create.mutate(
      { title: trimmedTitle, description: description.trim() || undefined, level: level || undefined, estimatedHours: numHours || undefined },
      {
        onSuccess: () => { toast.success("Learning path created"); setSheetOpen(false); resetForm(); },
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  }, [title, description, level, hours, create, resetForm]);

  if (isLoading) {
    return (
      <PageWrapper title="Learning Paths" subtitle="Structured learning programs">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-36" />)}
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title="Learning Paths"
      subtitle="Structured learning programs and career development"
      badge={`${paths?.length ?? 0} paths`}
      actions={isAdmin ? <Button size="sm" onClick={() => setSheetOpen(true)}><Plus className="h-3.5 w-3.5 mr-1" />Create Path</Button> : undefined}
    >
      {!paths?.length ? (
        <Card><CardContent className="py-12 text-center">
          <EmptyDocumentsIllustration className="mx-auto mb-4 h-40 w-40 opacity-95" />
          <p className="text-sm text-muted-foreground">No learning paths available.</p>
        </CardContent></Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {paths.map((lp: LearningPath) => (
            <Card key={lp.id} className="hover:shadow-sm transition-shadow">
              <CardContent className="p-4 space-y-2">
                <div className="flex items-start justify-between">
                  <GraduationCap className="h-4 w-4 text-primary" />
                  {lp.level && <Badge variant="outline" className="text-[10px]">{lp.level}</Badge>}
                </div>
                <h3 className="text-sm font-semibold leading-tight">{lp.title}</h3>
                {lp.description && <p className="text-xs text-muted-foreground line-clamp-2">{lp.description}</p>}
                {(lp.estimatedHours || lp.targetRole) && (
                  <div className="flex flex-wrap gap-2 text-[10px] text-muted-foreground">
                    {lp.estimatedHours && <span className="flex items-center gap-0.5"><Clock className="h-3 w-3" />{lp.estimatedHours}h</span>}
                    {lp.targetRole && <span>{lp.targetRole}</span>}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <HrSheet open={sheetOpen} onOpenChange={(open) => { if (!open) resetForm(); setSheetOpen(open); }} title="Create Learning Path" onSubmit={handleCreate} submitLabel="Create" isPending={create.isPending}>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Title <span className="text-destructive">*</span></label>
          <Input placeholder="e.g., Frontend Engineering Track" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Description</label>
          <Textarea placeholder="Path overview..." value={description} onChange={(e) => setDescription(e.target.value)} rows={3} maxLength={1000} className="resize-none w-full" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Level</label>
            <Select value={level} onValueChange={setLevel}>
              <SelectTrigger><SelectValue placeholder="Select level" /></SelectTrigger>
              <SelectContent className="w-[var(--radix-select-trigger-width)]">
                <SelectItem value="Beginner">Beginner</SelectItem>
                <SelectItem value="Intermediate">Intermediate</SelectItem>
                <SelectItem value="Advanced">Advanced</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Est. Hours</label>
            <Input type="number" min={1} step={1} placeholder="40" value={hours} onChange={(e) => setHours(e.target.value)} />
          </div>
        </div>
      </HrSheet>
    </PageWrapper>
  );
}
