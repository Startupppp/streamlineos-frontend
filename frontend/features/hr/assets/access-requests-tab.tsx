"use client";

import { useState, useCallback } from "react";
import { Plus, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { HrSheet } from "@/features/hr/hr-sheet";
import { Combobox } from "@/components/ui/combobox";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import {
  useAccessRequests,
  useCreateAccessRequest,
  useUpdateAccessRequest,
} from "@/hooks/api/hr/access-requests";
import type { Employee } from "@/types/hr";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const STATUS_META: Record<string, { label: string; badge: string }> = {
  requested: {
    label: "Requested",
    badge: "bg-amber-100 border-amber-200 text-amber-700 dark:bg-amber-900/40 dark:border-amber-800 dark:text-amber-300",
  },
  granted: {
    label: "Granted",
    badge: "bg-emerald-100 border-emerald-200 text-emerald-700 dark:bg-emerald-900/40 dark:border-emerald-800 dark:text-emerald-300",
  },
  revoked: {
    label: "Revoked",
    badge: "bg-rose-100 border-rose-200 text-rose-700 dark:bg-rose-900/40 dark:border-rose-800 dark:text-rose-300",
  },
};

interface AccessRequestsTabProps {
  employees: Employee[];
  canManage: boolean;
}

function buildEmployeeOptions(employees: Employee[]) {
  return employees.map((e) => ({
    value: e.id,
    label: `${e.firstName ?? ""} ${e.lastName ?? ""}`.trim() || e.email,
    sublabel: e.designation ?? e.email,
  }));
}

function getEmployeeName(employees: Employee[], id: string) {
  const emp = employees.find((e) => e.id === id);
  if (!emp) return id;
  return `${emp.firstName ?? ""} ${emp.lastName ?? ""}`.trim() || emp.email;
}

export function AccessRequestsTab({ employees, canManage }: AccessRequestsTabProps) {
  const [createOpen, setCreateOpen] = useState(false);
  const [employeeId, setEmployeeId] = useState("");
  const [systemName, setSystemName] = useState("");
  const [accessLevel, setAccessLevel] = useState("");

  const { data: requests = [], isLoading } = useAccessRequests();
  const createMutation = useCreateAccessRequest();
  const updateMutation = useUpdateAccessRequest();

  const handleOpenCreate = useCallback(() => setCreateOpen(true), []);
  const handleCloseCreate = useCallback((open: boolean) => {
    if (!open) {
      setEmployeeId("");
      setSystemName("");
      setAccessLevel("");
    }
    setCreateOpen(open);
  }, []);

  const handleCreate = useCallback(() => {
    if (!employeeId || !systemName.trim() || !accessLevel.trim()) {
      toast.error("Employee, system name, and access level are required");
      return;
    }
    createMutation.mutate(
      { employeeId, systemName: systemName.trim(), accessLevel: accessLevel.trim() },
      {
        onSuccess: () => {
          toast.success("Access request created");
          handleCloseCreate(false);
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  }, [employeeId, systemName, accessLevel, createMutation, handleCloseCreate]);

  const handleGrant = useCallback((id: string) => {
    updateMutation.mutate(
      { id, status: "granted" },
      {
        onSuccess: () => toast.success("Access granted"),
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  }, [updateMutation]);

  const handleRevoke = useCallback((id: string) => {
    updateMutation.mutate(
      { id, status: "revoked" },
      {
        onSuccess: () => toast.success("Access revoked"),
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  }, [updateMutation]);

  const handleSystemNameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setSystemName(e.target.value), []);
  const handleAccessLevelChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setAccessLevel(e.target.value), []);

  const empOptions = buildEmployeeOptions(employees);

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 10 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-foreground">Software & System Access</p>
        {canManage && (
          <Button size="sm" className="gap-1.5 h-7 text-xs" onClick={handleOpenCreate}>
            <Plus className="h-3.5 w-3.5" />
            Request Access
          </Button>
        )}
      </div>

      {requests.length === 0 ? (
        <EmptyState
          illustration={<Shield className="h-8 w-8 text-muted-foreground" />}
          title="No access requests"
          description="Software and app access requests will appear here."
          compact
        />
      ) : (
        <div className="space-y-1.5">
          {requests.map((req) => {
            const meta = STATUS_META[req.status] ?? STATUS_META.requested;
            return (
              <div
                key={req.id}
                className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl border border-border bg-card hover:bg-muted/30 transition-colors duration-200"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Shield className="h-4 w-4 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{req.systemName}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {getEmployeeName(employees, req.employeeId)} · {req.accessLevel} · {format(new Date(req.createdAt), "MMM d, yyyy")}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={cn("inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full border", meta.badge)}>
                    {meta.label}
                  </span>
                  {canManage && req.status === "requested" && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-6 text-[10px] px-2"
                      onClick={() => handleGrant(req.id)}
                      disabled={updateMutation.isPending}
                    >
                      Grant
                    </Button>
                  )}
                  {canManage && req.status === "granted" && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-6 text-[10px] px-2 text-destructive border-destructive/30 hover:bg-destructive/10"
                      onClick={() => handleRevoke(req.id)}
                      disabled={updateMutation.isPending}
                    >
                      Revoke
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <HrSheet
        open={createOpen}
        onOpenChange={handleCloseCreate}
        title="Request Software Access"
        description="Submit an access request for a system or application."
        showSubmit={false}
      >
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Employee <span className="text-destructive">*</span></label>
            <Combobox
              options={empOptions}
              value={employeeId}
              onChange={setEmployeeId}
              placeholder="Select employee..."
              searchPlaceholder="Search employees..."
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">System / Application <span className="text-destructive">*</span></label>
            <Input
              placeholder="e.g. GitHub, Jira, AWS Console"
              value={systemName}
              onChange={handleSystemNameChange}
              className="h-8"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Access Level <span className="text-destructive">*</span></label>
            <Input
              placeholder="e.g. Read, Write, Admin"
              value={accessLevel}
              onChange={handleAccessLevelChange}
              className="h-8"
            />
          </div>
          <LoadingButton
            className="w-full"
            onClick={handleCreate}
            isPending={createMutation.isPending}
            loadingText="Submitting..."
          >
            Submit Request
          </LoadingButton>
        </div>
      </HrSheet>
    </div>
  );
}
