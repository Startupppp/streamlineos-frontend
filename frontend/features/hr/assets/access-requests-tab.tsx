"use client";

import { useState, useCallback } from "react";
import { Shield } from "lucide-react";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { PlusIcon } from "@animateicons/react/lucide";
import { LoadingButton } from "@/components/ui/loading-button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { HrSheet } from "@/components/shared/hr-sheet";
import { EmployeePicker } from "@/features/hr/shared/employee-picker";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import {
  useAccessRequests,
  useCreateAccessRequest,
  useUpdateAccessRequest,
} from "@/hooks/api/hr/access-requests";
import type { EmployeeListItem } from "@/types/hr";
import { format } from "date-fns";
import { TruncatedText } from "@/components/ui/truncated-text";
import { cn } from "@/lib/utils";
import { SecurityIllustration } from "@/components/illustrations";
import { ErrorState } from "@/components/shared";

const STATUS_META: Record<string, { label: string; badge: string }> = {
  requested: {
    label: "Requested",
    badge: "bg-status-warning-surface border-status-warning-rule text-status-warning-ink",
  },
  granted: {
    label: "Granted",
    badge: "bg-status-success-surface border-status-success-rule text-status-success-ink",
  },
  revoked: {
    label: "Revoked",
    badge: "bg-status-danger-surface border-status-danger-rule text-status-danger-ink",
  },
};

interface AccessRequestsTabProps {
  employees: EmployeeListItem[];
  canManage: boolean;
}

function getEmployeeName(employees: EmployeeListItem[], id: string) {
  const emp = employees.find((e) => e.id === id);
  if (!emp) return id;
  return `${emp.firstName ?? ""} ${emp.lastName ?? ""}`.trim() || emp.email;
}

export function AccessRequestsTab({ employees, canManage }: AccessRequestsTabProps) {
  const [createOpen, setCreateOpen] = useState(false);
  const [employeeId, setEmployeeId] = useState("");
  const [systemName, setSystemName] = useState("");
  const [accessLevel, setAccessLevel] = useState("");

  const { data: requests = [], isLoading, isError, error, refetch } = useAccessRequests();
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
      { accessRequestId: id, status: "granted" },
      {
        onSuccess: () => toast.success("Access granted"),
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  }, [updateMutation]);

  const handleRevoke = useCallback((id: string) => {
    updateMutation.mutate(
      { accessRequestId: id, status: "revoked" },
      {
        onSuccess: () => toast.success("Access revoked"),
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  }, [updateMutation]);

  const handleSystemNameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setSystemName(e.target.value), []);
  const handleAccessLevelChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setAccessLevel(e.target.value), []);

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 10 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <ErrorState
        title="Couldn't load access requests"
        description={getErrorMessage(error)}
        onRetry={refetch}
        className="py-16"
      />
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-foreground whitespace-nowrap">Software &amp; System Access</p>
        {canManage && (
          <AnimatedIconButton size="sm" className="gap-1.5 h-7 text-xs shrink-0" onClick={handleOpenCreate} icon={PlusIcon} iconSize={14} iconClassName="mr-1.5">
            Request Access
          </AnimatedIconButton>
        )}
      </div>

      {requests.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-card py-10 px-6 text-center">
          <div className="h-20 w-20">
            <SecurityIllustration />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">No access requests</p>
            <p className="mt-0.5 text-xs text-muted-foreground max-w-[200px]">
              Software and app access requests will appear here.
            </p>
          </div>
          {canManage && (
            <AnimatedIconButton size="sm" variant="outline" className="text-xs gap-1.5" onClick={handleOpenCreate} icon={PlusIcon} iconSize={14} iconClassName="mr-1.5">
              Request Access
            </AnimatedIconButton>
          )}
        </div>
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
                  <div className="w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Shield className="h-4 w-4 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <TruncatedText text={req.systemName} className="text-sm font-medium text-foreground" />
                    <p className="text-micro text-muted-foreground">
                      {getEmployeeName(employees, req.employeeId)} · {req.accessLevel} · {format(new Date(req.createdAt), "MMM d, yyyy")}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={cn("inline-flex items-center text-micro font-semibold px-2 py-0.5 rounded-full border", meta.badge)}>
                    {meta.label}
                  </span>
                  {canManage && req.status === "requested" && (
                    <LoadingButton
                      size="sm"
                      variant="outline"
                      className="h-6 text-micro px-2"
                      onClick={() => handleGrant(req.id)}
                      isPending={updateMutation.isPending}
                    >
                      Grant
                    </LoadingButton>
                  )}
                  {canManage && req.status === "granted" && (
                    <LoadingButton
                      size="sm"
                      variant="outline"
                      className="h-6 text-micro px-2 text-destructive border-destructive/30 hover:bg-destructive/10"
                      onClick={() => handleRevoke(req.id)}
                      isPending={updateMutation.isPending}
                    >
                      Revoke
                    </LoadingButton>
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
            <EmployeePicker
              value={employeeId}
              onChange={setEmployeeId}
              placeholder="Select employee..."
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">System / Application <span className="text-destructive">*</span></label>
            <Input
              placeholder="e.g. GitHub, Jira, AWS Console"
              value={systemName}
              onChange={handleSystemNameChange}
              className=""
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Access Level <span className="text-destructive">*</span></label>
            <Input
              placeholder="e.g. Read, Write, Admin"
              value={accessLevel}
              onChange={handleAccessLevelChange}
              className=""
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
