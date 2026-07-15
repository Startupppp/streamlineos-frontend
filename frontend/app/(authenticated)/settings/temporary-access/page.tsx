"use client";

import { useState, useCallback, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient, getApiError } from "@/lib/api-client";
import { toast } from "sonner";
import { Plus, Timer, X, Loader2 } from "lucide-react";
import { formatRelative } from "date-fns";
import { DashboardGate } from "@/components/shared/dashboard-gate";
import { useRoles } from "@/hooks/api/roles";
import { useOrgMembers } from "@/hooks/api/organization";

interface TemporaryAssignment {
  id: number;
  userId: string;
  userName: string | null;
  roleId: number;
  roleName: string;
  expiresAt: string | null;
  reason: string | null;
  assignedBy: string | null;
  createdAt: string;
}

const grantSchema = z.object({
  userId: z.string().min(1, "Select an employee"),
  roleId: z.string().min(1, "Select a role"),
  expiresAt: z.string().min(1, "Set an expiry date"),
  reason: z.string().max(500).optional(),
});

type GrantFormValues = z.infer<typeof grantSchema>;

export default function TemporaryAccessPage() {
  return (
    <DashboardGate permission="settings:rbac:manage">
      <TemporaryAccessContent />
    </DashboardGate>
  );
}

function TemporaryAccessContent() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [revoking, setRevoking] = useState<number | null>(null);

  const { data: assignments, isLoading } = useQuery<TemporaryAssignment[]>({
    queryKey: ["temporary-access"],
    queryFn: () => apiClient.get<TemporaryAssignment[]>("/access/temporary"),
    staleTime: 60_000,
  });

  const revokeMutation = useMutation({
    mutationFn: (id: number) => apiClient.delete(`/access/temporary/${id}`),
    onSuccess: () => {
      toast.success("Access revoked");
      void queryClient.invalidateQueries({ queryKey: ["temporary-access"] });
      setRevoking(null);
    },
    onError: (error) => {
      toast.error(getApiError(error));
      setRevoking(null);
    },
  });

  const handleRevoke = useCallback(
    (id: number) => {
      setRevoking(id);
      revokeMutation.mutate(id);
    },
    [revokeMutation],
  );

  const handleGrantSuccess = useCallback(() => {
    setDialogOpen(false);
    void queryClient.invalidateQueries({ queryKey: ["temporary-access"] });
  }, [queryClient]);

  const now = new Date();
  const active = useMemo(
    () =>
      (assignments ?? []).filter(
        (a) => !a.expiresAt || new Date(a.expiresAt) > now,
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [assignments],
  );
  const expired = useMemo(
    () =>
      (assignments ?? []).filter(
        (a) => a.expiresAt && new Date(a.expiresAt) <= now,
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [assignments],
  );

  return (
    <PageWrapper
      title="Temporary Access"
      subtitle="Time-bound role assignments for contractors and cover"
      actions={
        <Button
          size="sm"
          className="gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground"
          onClick={() => setDialogOpen(true)}
        >
          <Plus className="h-3.5 w-3.5" />
          Grant access
        </Button>
      }
    >
      <div className="space-y-4">
        <Card>
          <CardHeader className="px-4 pt-4 pb-2">
            <CardTitle className="text-sm font-semibold flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Timer className="h-3.5 w-3.5 text-muted-foreground" />
                Active
              </span>
              {!isLoading && active.length > 0 && (
                <Badge variant="secondary" className="text-xs font-medium">
                  {active.length}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="divide-y divide-border/60">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between px-4 py-2.5 gap-3"
                  >
                    <div className="space-y-1.5 flex-1">
                      <Skeleton className="h-4 w-36" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                    <Skeleton className="h-7 w-7 rounded-md" />
                  </div>
                ))}
              </div>
            ) : active.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <Timer className="w-8 text-muted-foreground/30 mb-2" />
                <p className="text-sm font-medium">No active assignments</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Grant a time-limited role to get started
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border/60">
                {active.map((a) => (
                  <AssignmentRow
                    key={a.id}
                    assignment={a}
                    onRevoke={handleRevoke}
                    isRevoking={revoking === a.id}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {expired.length > 0 && (
          <Card>
            <CardHeader className="px-4 pt-4 pb-2">
              <CardTitle className="text-sm font-semibold text-muted-foreground">
                Expired
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border/60">
                {expired.map((a) => (
                  <AssignmentRow key={a.id} assignment={a} isExpired />
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <GrantTempAccessDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSuccess={handleGrantSuccess}
      />
    </PageWrapper>
  );
}

interface AssignmentRowProps {
  assignment: TemporaryAssignment;
  onRevoke?: (id: number) => void;
  isRevoking?: boolean;
  isExpired?: boolean;
}

function AssignmentRow({
  assignment,
  onRevoke,
  isRevoking,
  isExpired,
}: AssignmentRowProps) {
  const handleRevoke = useCallback(
    () => onRevoke?.(assignment.id),
    [assignment.id, onRevoke],
  );

  return (
    <div className="flex items-center gap-3 px-4 py-2.5">
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 flex-nowrap items-center gap-2 overflow-x-auto scrollbar-hide [&>*]:shrink-0">
          <span className="text-sm font-medium leading-none">
            {assignment.userName ?? assignment.userId.slice(0, 12)}
          </span>
          <Badge variant="secondary" className="text-xs font-normal shrink-0">
            {assignment.roleName}
          </Badge>
          {isExpired && (
            <Badge
              variant="outline"
              className="text-xs text-muted-foreground shrink-0"
            >
              Expired
            </Badge>
          )}
        </div>
        {assignment.expiresAt && (
          <p className="text-xs text-muted-foreground mt-0.5">
            {isExpired ? "Expired" : "Expires"}{" "}
            {formatRelative(new Date(assignment.expiresAt), new Date())}
            {assignment.reason && (
              <span className="text-muted-foreground/60">
                {" "}
                · {assignment.reason}
              </span>
            )}
          </p>
        )}
      </div>
      {!isExpired && onRevoke && (
        <Button
          variant="ghost"
          size="icon"
          className="w-7 shrink-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
          onClick={handleRevoke}
          disabled={isRevoking}
          aria-label="Revoke access"
        >
          {isRevoking ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <X className="h-3.5 w-3.5" />
          )}
        </Button>
      )}
    </div>
  );
}

interface GrantTempAccessDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

function GrantTempAccessDialog({
  open,
  onOpenChange,
  onSuccess,
}: GrantTempAccessDialogProps) {
  const { data: rolesData } = useRoles();
  const { data: membersData } = useOrgMembers(1, 200);
  const members = membersData?.data ?? [];

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<GrantFormValues, unknown, GrantFormValues>({
    resolver: zodResolver(grantSchema),
    defaultValues: { userId: "", roleId: "", expiresAt: "", reason: "" },
  });

  const userId = watch("userId");
  const roleId = watch("roleId");

  const mutation = useMutation({
    mutationFn: (values: GrantFormValues) =>
      apiClient.post("/access/temporary", {
        userId: values.userId,
        roleId: Number(values.roleId),
        expiresAt: new Date(values.expiresAt).toISOString(),
        reason: values.reason || undefined,
      }),
    onSuccess: () => {
      toast.success("Access granted");
      reset();
      onSuccess();
    },
    onError: (error) => toast.error(getApiError(error)),
  });

  const handleUserChange = useCallback(
    (v: string) => setValue("userId", v, { shouldValidate: true }),
    [setValue],
  );

  const handleRoleChange = useCallback(
    (v: string) => setValue("roleId", v, { shouldValidate: true }),
    [setValue],
  );

  const handleOpenChange = useCallback(
    (next: boolean) => {
      if (!next) reset();
      onOpenChange(next);
    },
    [reset, onOpenChange],
  );

  const onSubmit = useCallback(
    (values: GrantFormValues) => mutation.mutate(values),
    [mutation],
  );

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const minDate = tomorrow.toISOString().slice(0, 16);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Grant temporary access</DialogTitle>
          <DialogDescription className="text-xs">
            Assign a role with an automatic expiry date.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={handleSubmit(onSubmit)}
          noValidate
          className="space-y-3"
        >
          <div className="space-y-1.5">
            <Label htmlFor="ta-user" className="text-xs">
              Employee
            </Label>
            <Select value={userId} onValueChange={handleUserChange}>
              <SelectTrigger id="ta-user" className="">
                <SelectValue placeholder="Select employee…" />
              </SelectTrigger>
              <SelectContent>
                {members.map((m) => (
                  <SelectItem key={m.userId} value={m.userId}>
                    {m.name ?? m.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.userId && (
              <p className="text-xs text-destructive">{errors.userId.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="ta-role" className="text-xs">
              Role
            </Label>
            <Select value={roleId} onValueChange={handleRoleChange}>
              <SelectTrigger id="ta-role" className="">
                <SelectValue placeholder="Select role…" />
              </SelectTrigger>
              <SelectContent>
                {(rolesData ?? []).map((r) => (
                  <SelectItem key={r.id} value={String(r.id)}>
                    {r.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.roleId && (
              <p className="text-xs text-destructive">{errors.roleId.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="ta-expires" className="text-xs">
              Expires at
            </Label>
            <Input
              id="ta-expires"
              type="datetime-local"
              min={minDate}
              className=""
              aria-invalid={Boolean(errors.expiresAt)}
              {...register("expiresAt")}
            />
            {errors.expiresAt && (
              <p className="text-xs text-destructive">
                {errors.expiresAt.message}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label
              htmlFor="ta-reason"
              className="text-xs text-muted-foreground"
            >
              Reason <span className="font-normal">(optional)</span>
            </Label>
            <Input
              id="ta-reason"
              className=""
              placeholder="e.g. Covering annual leave"
              {...register("reason")}
            />
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleOpenChange(false)}
              disabled={mutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={mutation.isPending}
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              {mutation.isPending && (
                <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
              )}
              Grant access
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
