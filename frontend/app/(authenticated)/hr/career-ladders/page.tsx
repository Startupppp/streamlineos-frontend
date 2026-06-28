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
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { HrSheet } from "@/features/hr/hr-sheet";
import { EmptyState } from "@/components/ui/empty-state";
import { toast } from "sonner";
import { Plus, TrendingUp, ArrowRight, ChevronsUpDown, Check, Building2, AlertCircle } from "lucide-react";
import { useCan } from "@/lib/api/hooks/access";
import { useHrDepartments } from "@/lib/api/hooks/hr";
import { cn } from "@/lib/utils";

interface CareerLadderLevel {
  level: number;
  title: string;
  description: string;
  minExperience: number;
  skills: string[];
}

interface CareerLadder {
  id: number;
  title: string;
  department: string | null;
  description: string | null;
  levels: CareerLadderLevel[] | null;
  createdAt: string | null;
}

const clKeys = {
  all: [...queryKeys.hr.all, "career-ladders"] as const,
  list: () => [...clKeys.all, "list"] as const,
};

export default function CareerLaddersPage() {
  const qc = useQueryClient();
  const isAdmin = useCan("hr:employees:manage");
  const { data: departments } = useHrDepartments();

  const { data: ladders, isLoading, isError, refetch } = useQuery({
    queryKey: clKeys.list(),
    queryFn: () => apiClient.get<CareerLadder[]>("/hr/career-ladders"),
  });

  const handleRetry = useCallback(() => { void refetch(); }, [refetch]);

  const create = useMutation({
    mutationFn: (data: { title: string; department?: string; description?: string }) =>
      apiClient.post<CareerLadder>("/hr/career-ladders", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: clKeys.list() }),
  });

  const [sheetOpen, setSheetOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [department, setDepartment] = useState("");
  const [deptPickerOpen, setDeptPickerOpen] = useState(false);
  const [description, setDescription] = useState("");

  const handleOpenSheet = useCallback(() => setSheetOpen(true), []);

  const handleSheetOpenChange = useCallback((open: boolean) => {
    if (!open) {
      setTitle("");
      setDepartment("");
      setDescription("");
    }
    setSheetOpen(open);
  }, []);

  const handleTitleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setTitle(e.target.value);
  }, []);

  const handleDescriptionChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setDescription(e.target.value);
  }, []);

  const handleDeptSelect = useCallback((name: string) => {
    setDepartment((prev) => (prev === name ? "" : name));
    setDeptPickerOpen(false);
  }, []);

  const handleCreate = useCallback(() => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) { toast.error("Title is required"); return; }
    if (trimmedTitle.length < 2) { toast.error("Title must be at least 2 characters"); return; }
    if (trimmedTitle.length > 100) { toast.error("Title must be at most 100 characters"); return; }
    if (!/[a-zA-Z]/.test(trimmedTitle)) { toast.error("Title must contain at least one letter"); return; }
    if (/^\W+$/.test(trimmedTitle)) { toast.error("Title cannot contain only special characters"); return; }
    if (/\s{2,}/.test(trimmedTitle)) { toast.error("Title cannot have consecutive spaces"); return; }

    const trimmedDesc = description.trim();
    if (trimmedDesc.length > 0) {
      if (trimmedDesc.length < 10) { toast.error("Description must be at least 10 characters"); return; }
      if (trimmedDesc.length > 1000) { toast.error("Description must be at most 1000 characters"); return; }
      if (!/[a-zA-Z0-9]/.test(trimmedDesc)) { toast.error("Description cannot contain only special characters"); return; }
    }

    create.mutate(
      { title: trimmedTitle, department: department || undefined, description: trimmedDesc || undefined },
      {
        onSuccess: () => {
          toast.success("Career ladder created");
          setSheetOpen(false);
          setTitle("");
          setDepartment("");
          setDescription("");
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  }, [title, department, description, create]);

  if (isLoading) {
    return (
      <PageWrapper title="Career Ladders" subtitle="Growth paths and career progression">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-44 rounded-2xl" />
          ))}
        </div>
      </PageWrapper>
    );
  }

  if (isError) {
    return (
      <PageWrapper title="Career Ladders" subtitle="Growth paths and career progression">
        <div className="flex flex-col items-center justify-center py-14 text-center gap-3">
          <AlertCircle className="h-8 w-8 text-destructive" />
          <div>
            <p className="text-sm font-medium text-foreground">Failed to load career ladders</p>
            <p className="text-xs text-muted-foreground mt-0.5">Something went wrong. Please try again.</p>
          </div>
          <Button size="sm" variant="outline" onClick={handleRetry}>Try again</Button>
        </div>
      </PageWrapper>
    );
  }

  const selectedDeptLabel = department || "Select department (optional)";

  return (
    <PageWrapper
      title="Career Ladders"
      subtitle="Define career progression paths for your organization"
      badge={`${ladders?.length ?? 0} paths`}
      actions={
        isAdmin ? (
          <Button size="sm" className="gap-1.5" onClick={handleOpenSheet}>
            <Plus className="h-3.5 w-3.5" />
            Create Ladder
          </Button>
        ) : undefined
      }
    >
      {!ladders?.length ? (
        <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
          <EmptyState
            illustration={<TrendingUp className="h-8 w-8 text-muted-foreground" />}
            title="No career ladders yet"
            description="Define growth paths to help employees understand progression opportunities."
          />
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {ladders.map((cl: CareerLadder) => (
            <Card
              key={cl.id}
              className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden hover:shadow-md transition-shadow duration-200 border-l-4 border-l-violet-500"
            >
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="h-7 w-7 rounded-lg bg-violet-100 dark:bg-violet-950/40 flex items-center justify-center shrink-0">
                      <TrendingUp className="h-3.5 w-3.5 text-violet-600 dark:text-violet-400" />
                    </div>
                    <h3 className="text-sm font-semibold text-foreground leading-tight truncate">
                      {cl.title}
                    </h3>
                  </div>
                  {cl.department && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border bg-slate-100 text-slate-700 dark:bg-slate-900/40 dark:text-slate-300 border-slate-200 dark:border-slate-800 shrink-0">
                      <Building2 className="h-2.5 w-2.5" />
                      {cl.department}
                    </span>
                  )}
                </div>

                {cl.description && (
                  <p className="text-xs text-muted-foreground line-clamp-2">{cl.description}</p>
                )}

                {cl.levels && cl.levels.length > 0 ? (
                  <div className="space-y-2">
                    <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                      {cl.levels.length} Level{cl.levels.length !== 1 ? "s" : ""}
                    </p>
                    <div className="flex items-center gap-1 flex-wrap">
                      {cl.levels.map((lvl, i) => (
                        <div key={i} className="flex items-center gap-1">
                          <span
                            className="inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full border bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300 border-violet-200 dark:border-violet-800 whitespace-nowrap"
                            title={lvl.title}
                          >
                            L{lvl.level}
                          </span>
                          {i < cl.levels!.length - 1 && (
                            <ArrowRight className="h-2.5 w-2.5 text-muted-foreground/40 shrink-0" />
                          )}
                        </div>
                      ))}
                    </div>
                    <div className="space-y-0.5 pt-1 border-t border-border/50">
                      {cl.levels.slice(0, 3).map((lvl, i) => (
                        <p key={i} className="text-[11px] text-muted-foreground truncate">
                          <span className="font-medium text-foreground/60">L{lvl.level}</span>
                          {" — "}
                          {lvl.title}
                        </p>
                      ))}
                      {cl.levels.length > 3 && (
                        <p className="text-[10px] text-muted-foreground/50">
                          +{cl.levels.length - 3} more levels
                        </p>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="text-[11px] text-muted-foreground/50 italic">No levels defined</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <HrSheet
        open={sheetOpen}
        onOpenChange={handleSheetOpenChange}
        title="Create Career Ladder"
        onSubmit={handleCreate}
        submitLabel="Create"
        isPending={create.isPending}
      >
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Title</label>
          <Input
            placeholder="e.g., Engineering Career Path"
            value={title}
            onChange={handleTitleChange}
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Department</label>
          <Popover open={deptPickerOpen} onOpenChange={setDeptPickerOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={deptPickerOpen}
                className="w-full justify-between font-normal"
              >
                <span className="truncate text-left">{selectedDeptLabel}</span>
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
              <Command>
                <CommandInput placeholder="Search departments..." />
                <CommandList className="max-h-48 overflow-y-auto">
                  <CommandEmpty>No department found.</CommandEmpty>
                  <CommandGroup>
                    {(departments ?? []).map((d) => (
                      <CommandItem key={d.id} value={d.name} onSelect={handleDeptSelect}>
                        <Check
                          className={cn("mr-2 h-4 w-4", department === d.name ? "opacity-100" : "opacity-0")}
                        />
                        {d.name}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Description</label>
          <Textarea
            placeholder="Describe the career path..."
            value={description}
            onChange={handleDescriptionChange}
            rows={3}
          />
        </div>
      </HrSheet>
    </PageWrapper>
  );
}
