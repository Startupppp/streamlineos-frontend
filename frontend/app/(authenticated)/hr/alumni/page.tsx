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
import { Combobox, type ComboboxOption } from "@/components/ui/combobox";
import { HrSheet } from "@/features/hr/hr-sheet";
import { toast } from "sonner";
import { format } from "date-fns";
import { Plus, Briefcase, Calendar, Mail } from "lucide-react";
import { EmptyTeamIllustration } from "@/components/illustrations";
import { useAbility } from "@/lib/abilities-context";
import type { Employee, PaginatedEmployees } from "@/types/hr";

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

export default function AlumniPage() {
  const qc = useQueryClient();
  const ability = useAbility();
  const isAdmin = ability.can("manage", "hr:employees");

  const { data: alumni, isLoading } = useQuery({
    queryKey: alumniKeys.list(),
    queryFn: () => apiClient.get<AlumniRecord[]>("/hr/alumni"),
  });

  const { data: employeesRaw } = useHrEmployees();
  const employees = useMemo<Employee[]>(() => {
    if (Array.isArray(employeesRaw)) return employeesRaw;
    return (employeesRaw as PaginatedEmployees | undefined)?.data ?? [];
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

  if (isLoading) {
    return (
      <PageWrapper title="Alumni Network" subtitle="Stay connected with former team members">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-32" />)}
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title="Alumni Network"
      subtitle="Stay connected with former team members"
      badge={`${alumni?.length ?? 0} alumni`}
      actions={isAdmin ? <Button size="sm" onClick={() => setSheetOpen(true)}><Plus className="h-3.5 w-3.5 mr-1" />Add Alumni</Button> : undefined}
    >
      {!alumni?.length ? (
        <Card><CardContent className="py-12 text-center">
          <EmptyTeamIllustration className="mx-auto mb-4 h-40 w-40 opacity-95" />
          <p className="text-sm text-muted-foreground">No alumni records yet.</p>
        </CardContent></Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {alumni.map((a: AlumniRecord) => (
            <Card key={a.id} className="hover:shadow-sm transition-shadow">
              <CardContent className="p-4 space-y-2">
                <h3 className="text-sm font-semibold">{a.user?.name ?? "Former Employee"}</h3>
                {a.currentRole && <p className="text-xs text-muted-foreground">{a.currentRole}</p>}
                <div className="flex flex-wrap gap-2 text-[10px] text-muted-foreground">
                  {a.leftDate && (
                    <span className="flex items-center gap-0.5">
                      <Calendar className="h-3 w-3" />Left {format(new Date(a.leftDate), "MMM yyyy")}
                    </span>
                  )}
                  {a.currentCompany && (
                    <span className="flex items-center gap-0.5">
                      <Briefcase className="h-3 w-3" />{a.currentCompany}
                    </span>
                  )}
                  {(a.email ?? a.user?.email) && (
                    <span className="flex items-center gap-0.5">
                      <Mail className="h-3 w-3" />{a.email ?? a.user?.email}
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <HrSheet
        open={sheetOpen}
        onOpenChange={(open) => { if (!open) resetForm(); setSheetOpen(open); }}
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
          <Input type="date" value={leftDate} max={new Date().toISOString().slice(0, 10)} onChange={(e) => setLeftDate(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Current Company</label>
            <Input placeholder="Where they work now" value={currentCompany} onChange={(e) => setCurrentCompany(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Current Role</label>
            <Input placeholder="e.g., Engineering Lead" value={currentRole} onChange={(e) => setCurrentRole(e.target.value)} />
          </div>
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">LinkedIn URL</label>
          <Input type="url" placeholder="https://linkedin.com/in/..." value={linkedinUrl} onChange={(e) => setLinkedinUrl(e.target.value)} />
        </div>
      </HrSheet>
    </PageWrapper>
  );
}
