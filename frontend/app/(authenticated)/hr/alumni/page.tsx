"use client";

import { getErrorMessage } from "@/lib/get-error-message";
import { useState, useCallback, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useHrEmployees } from "@/lib/api/hooks/hr";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Combobox, type ComboboxOption } from "@/components/ui/combobox";
import { HrSheet } from "@/features/hr/hr-sheet";
import { toast } from "sonner";
import { format } from "date-fns";
import { Plus, Briefcase, Calendar, Mail, Users, ExternalLink, AlertCircle } from "lucide-react";
import { useCan } from "@/lib/api/hooks/access";
import { cn } from "@/lib/utils";
import type { Employee } from "@/types/hr";

interface AlumniRecord {
  id: number;
  userId: string;
  currentCompany: string | null;
  currentRole: string | null;
  linkedinUrl: string | null;
  email: string | null;
  leftDate: string | null;
  isOptedIn: boolean;
  createdAt: string;
  user: { name: string | null; email: string | null; image: string | null } | null;
}

const alumniKeys = {
  all: [...queryKeys.hr.all, "alumni"] as const,
  list: () => [...alumniKeys.all, "list"] as const,
};

function getInitials(name: string | null): string {
  if (!name) return "?";
  return name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
}

export default function AlumniPage() {
  const qc = useQueryClient();
  const isAdmin = useCan("hr:employees:manage");

  const { data: alumni, isLoading, isError, refetch } = useQuery({
    queryKey: alumniKeys.list(),
    queryFn: () => apiClient.get<AlumniRecord[]>("/hr/alumni"),
  });
  const handleRetry = useCallback(() => { void refetch(); }, [refetch]);

  const { data: employeesRaw } = useHrEmployees();
  const employees = useMemo<Employee[]>(() => {
    if (Array.isArray(employeesRaw)) return employeesRaw;
    if (employeesRaw && "data" in employeesRaw) return employeesRaw.data;
    return [];
  }, [employeesRaw]);

  const existingUserIds = useMemo(
    () => new Set((alumni ?? []).map((a) => a.userId)),
    [alumni],
  );

  const employeeOptions = useMemo<ComboboxOption[]>(() =>
    employees
      .filter((e) => !e.isActive && !existingUserIds.has(e.id))
      .map((e) => ({
        value: e.id,
        label: e.firstName && e.lastName ? `${e.firstName} ${e.lastName}` : (e.name ?? e.email),
        sublabel: e.designation ?? e.email,
      })),
    [employees, existingUserIds],
  );

  const create = useMutation({
    mutationFn: (data: { userId: string; currentCompany?: string; currentRole?: string; linkedinUrl?: string; email?: string; leftDate?: string }) =>
      apiClient.post<AlumniRecord>("/hr/alumni", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: alumniKeys.list() }),
  });

  const [sheetOpen, setSheetOpen] = useState(false);
  const [userId, setUserId] = useState("");
  const [currentCompany, setCurrentCompany] = useState("");
  const [currentRole, setCurrentRole] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [leftDate, setLeftDate] = useState("");

  const resetForm = useCallback(() => {
    setUserId("");
    setCurrentCompany("");
    setCurrentRole("");
    setLinkedinUrl("");
    setLeftDate("");
  }, []);

  const handleCreate = useCallback(() => {
    if (!userId) { toast.error("Employee is required"); return; }
    create.mutate(
      {
        userId,
        currentCompany: currentCompany || undefined,
        currentRole: currentRole || undefined,
        linkedinUrl: linkedinUrl || undefined,
        leftDate: leftDate || undefined,
      },
      {
        onSuccess: () => {
          toast.success("Alumni added to network");
          setSheetOpen(false);
          resetForm();
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  }, [userId, currentCompany, currentRole, linkedinUrl, leftDate, create, resetForm]);

  const handleOpenSheet = useCallback(() => setSheetOpen(true), []);

  const handleSheetOpenChange = useCallback((open: boolean) => {
    if (!open) resetForm();
    setSheetOpen(open);
  }, [resetForm]);

  const handleLeftDateChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setLeftDate(e.target.value), []);
  const handleCurrentCompanyChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setCurrentCompany(e.target.value), []);
  const handleCurrentRoleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setCurrentRole(e.target.value), []);
  const handleLinkedinUrlChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setLinkedinUrl(e.target.value), []);

  if (isLoading) {
    return (
      <PageWrapper title="Alumni Network" subtitle="Stay connected with former team members">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-36 rounded-2xl" />
          ))}
        </div>
      </PageWrapper>
    );
  }

  if (isError) {
    return (
      <PageWrapper title="Alumni Network" subtitle="Stay connected with former team members">
        <EmptyState
          illustration={<AlertCircle className="h-8 w-8 text-destructive" />}
          title="Failed to load alumni"
          description="Something went wrong. Please try again."
          action={{ label: "Retry", onClick: handleRetry }}
        />
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title="Alumni Network"
      subtitle="Stay connected with former team members"
      badge={`${alumni?.length ?? 0} alumni`}
      actions={
        isAdmin ? (
          <Button size="sm" className="gap-1.5" onClick={handleOpenSheet}>
            <Plus className="h-3.5 w-3.5" />
            Add Alumni
          </Button>
        ) : undefined
      }
    >
      {!alumni?.length ? (
        <EmptyState
          illustration={<Users className="h-8 w-8 text-muted-foreground" />}
          title="No alumni yet"
          description="Add former team members to your alumni network to stay connected."
          action={isAdmin ? { label: "Add Alumni", onClick: handleOpenSheet } : undefined}
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {alumni.map((a: AlumniRecord) => (
            <Card
              key={a.id}
              className={cn(
                "rounded-2xl border border-border bg-card shadow-sm overflow-hidden",
                "border-l-4 border-l-violet-500 transition-shadow duration-200 hover:shadow-md",
              )}
            >
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="h-9 w-9 rounded-full bg-violet-100 dark:bg-violet-950/40 flex items-center justify-center shrink-0">
                    <span className="text-xs font-semibold text-violet-700 dark:text-violet-300">
                      {getInitials(a.user?.name ?? null)}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-foreground truncate">
                        {a.user?.name ?? "Former Employee"}
                      </p>
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border bg-violet-100 border-violet-200 text-violet-700 dark:bg-violet-900/40 dark:border-violet-800 dark:text-violet-300">
                        ALUMNI
                      </span>
                    </div>
                    {a.currentRole && (
                      <p className="text-xs text-muted-foreground truncate">{a.currentRole}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-1.5">
                  {a.leftDate && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Calendar className="h-3.5 w-3.5 shrink-0" />
                      <span>Left {format(new Date(a.leftDate), "MMM d, yyyy")}</span>
                    </div>
                  )}
                  {a.currentCompany && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Briefcase className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{a.currentCompany}</span>
                    </div>
                  )}
                  {(a.email ?? a.user?.email) && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Mail className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{a.email ?? a.user?.email}</span>
                    </div>
                  )}
                </div>

                {a.linkedinUrl && (
                  <a
                    href={a.linkedinUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    <ExternalLink className="h-3 w-3" />
                    LinkedIn Profile
                  </a>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <HrSheet
        open={sheetOpen}
        onOpenChange={handleSheetOpenChange}
        title="Add Alumni"
        onSubmit={handleCreate}
        submitLabel="Add"
        isPending={create.isPending}
      >
        <div className="space-y-1.5">
          <label className="text-sm font-medium">
            Former Employee <span className="text-destructive">*</span>
          </label>
          <Combobox
            options={employeeOptions}
            value={userId}
            onChange={setUserId}
            placeholder="Select separated employee…"
            searchPlaceholder="Search by name…"
          />
          <p className="text-xs text-muted-foreground">Only inactive / separated employees appear here.</p>
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Left / Exit Date</label>
          <Input type="date" value={leftDate} max={new Date().toISOString().slice(0, 10)} onChange={handleLeftDateChange} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Current Company</label>
            <Input placeholder="Where they work now" value={currentCompany} onChange={handleCurrentCompanyChange} />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Current Role</label>
            <Input placeholder="e.g., Engineering Lead" value={currentRole} onChange={handleCurrentRoleChange} />
          </div>
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">LinkedIn URL</label>
          <Input type="url" placeholder="https://linkedin.com/in/..." value={linkedinUrl} onChange={handleLinkedinUrlChange} />
        </div>
      </HrSheet>
    </PageWrapper>
  );
}
