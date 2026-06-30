"use client";

import { useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { PageWrapper } from "@/components/ui/page-wrapper";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
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
import { ArrowRightLeft, Plus, Trash2, Users, Clock } from "lucide-react";
import { formatRelative } from "date-fns";
import { DashboardGate } from "@/components/shared/dashboard-gate";
import { useHrEmployees } from "@/hooks/api/hr/employees";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import type { Employee } from "@/types/hr";

interface Delegation {
  id: string;
  orgId: string;
  delegatorId: string;
  delegateeId: string;
  permissions: string[];
  startsAt: string;
  endsAt: string;
  reason: string | null;
  status: string;
  createdAt: string;
  revokedAt: string | null;
  revokedBy: string | null;
}

const delegationSchema = z
  .object({
    delegateeId: z.string().min(1, "Select a recipient"),
    permissions: z.array(z.string()).min(1, "Select at least one permission"),
    startsAt: z.string().min(1, "Start date required"),
    endsAt: z.string().min(1, "End date required"),
    reason: z.string().max(500).optional(),
  })
  .refine((d) => new Date(d.endsAt) > new Date(d.startsAt), {
    message: "End date must be after start date",
    path: ["endsAt"],
  });

type DelegationFormValues = z.infer<typeof delegationSchema>;

export default function DelegationsPage() {
  return (
    <DashboardGate permission="settings:rbac:manage">
      <DelegationsContent />
    </DashboardGate>
  );
}

function DelegationsContent() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [revoking, setRevoking] = useState<string | null>(null);

  const { data: received, isLoading: loadingReceived } = useQuery<Delegation[]>({
    queryKey: ["delegations", "received"],
    queryFn: () => apiClient.get<Delegation[]>("/access/delegations"),
    staleTime: 60_000,
  });

  const { data: given, isLoading: loadingGiven } = useQuery<Delegation[]>({
    queryKey: ["delegations", "given"],
    queryFn: () => apiClient.get<Delegation[]>("/access/delegations/given"),
    staleTime: 60_000,
  });

  const revokeMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/access/delegations/${id}`),
    onSuccess: () => {
      toast.success("Delegation revoked");
      void queryClient.invalidateQueries({ queryKey: ["delegations"] });
      setRevoking(null);
    },
    onError: (error) => {
      toast.error(getApiError(error));
      setRevoking(null);
    },
  });

  const handleRevoke = useCallback(
    (id: string) => {
      setRevoking(id);
      revokeMutation.mutate(id);
    },
    [revokeMutation],
  );

  const handleGrantSuccess = useCallback(() => {
    setDialogOpen(false);
    void queryClient.invalidateQueries({ queryKey: ["delegations"] });
  }, [queryClient]);

  const activeGiven = (given ?? []).filter(
    (d) => d.status === "ACTIVE" && new Date(d.endsAt) > new Date(),
  );
  const expiredOrRevoked = (given ?? []).filter(
    (d) => d.status !== "ACTIVE" || new Date(d.endsAt) <= new Date(),
  );

  return (
    <PageWrapper
      title="Permission Delegations"
      subtitle="Manage permissions you've delegated to others or received from others"
      actions={
        <Button className="gap-2" onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4" /> Delegate permissions
        </Button>
      }
    >
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Users className="h-4 w-4" />
              Delegated to you
            </CardTitle>
            <CardDescription>
              Active permissions another user has delegated to you.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingReceived ? (
              <div className="space-y-3">
                {[...Array(2)].map((_, i) => (
                  <Skeleton key={i} className="h-14 rounded-lg" />
                ))}
              </div>
            ) : !received?.length ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <ArrowRightLeft className="h-9 w-9 text-muted-foreground mb-3 opacity-40" />
                <p className="text-sm font-medium">No delegations received</p>
                <p className="text-xs text-muted-foreground mt-1">
                  When another user delegates permissions to you they will appear
                  here.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {received.map((d) => (
                  <DelegationRow key={d.id} delegation={d} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <ArrowRightLeft className="h-4 w-4" />
              Delegations you granted
            </CardTitle>
            <CardDescription>
              Permissions you have delegated to other users.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingGiven ? (
              <div className="space-y-3">
                {[...Array(2)].map((_, i) => (
                  <Skeleton key={i} className="h-14 rounded-lg" />
                ))}
              </div>
            ) : !activeGiven.length && !expiredOrRevoked.length ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <Clock className="h-9 w-9 text-muted-foreground mb-3 opacity-40" />
                <p className="text-sm font-medium">No delegations granted</p>
                <p className="text-xs text-muted-foreground mt-1">
                  You haven&apos;t delegated any permissions to other users.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {activeGiven.map((d) => (
                  <DelegationRow
                    key={d.id}
                    delegation={d}
                    canRevoke
                    onRevoke={handleRevoke}
                    isRevoking={revoking === d.id}
                  />
                ))}
                {expiredOrRevoked.map((d) => (
                  <DelegationRow key={d.id} delegation={d} isExpired />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <GrantDelegationDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSuccess={handleGrantSuccess}
      />
    </PageWrapper>
  );
}

interface DelegationRowProps {
  delegation: Delegation;
  canRevoke?: boolean;
  onRevoke?: (id: string) => void;
  isRevoking?: boolean;
  isExpired?: boolean;
}

function DelegationRow({
  delegation,
  canRevoke,
  onRevoke,
  isRevoking,
  isExpired,
}: DelegationRowProps) {
  const handleRevoke = useCallback(
    () => onRevoke?.(delegation.id),
    [delegation.id, onRevoke],
  );
  const isRevoked = delegation.status === "REVOKED";
  const isExpiredByTime =
    !isRevoked && new Date(delegation.endsAt) <= new Date();

  return (
    <div className="flex items-center justify-between rounded-lg border p-3 gap-3">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium truncate">
            {delegation.delegateeId}
          </span>
          <div className="flex gap-1 flex-wrap">
            {delegation.permissions.slice(0, 3).map((p) => (
              <Badge key={p} variant="outline" className="text-xs font-mono">
                {p}
              </Badge>
            ))}
            {delegation.permissions.length > 3 && (
              <Badge
                variant="outline"
                className="text-xs text-muted-foreground"
              >
                +{delegation.permissions.length - 3} more
              </Badge>
            )}
          </div>
          {(isExpired || isRevoked || isExpiredByTime) && (
            <Badge variant="outline" className="text-xs text-muted-foreground">
              {isRevoked ? "Revoked" : "Expired"}
            </Badge>
          )}
        </div>
        <div className="text-xs text-muted-foreground mt-0.5 flex gap-3 flex-wrap">
          {delegation.reason && <span>{delegation.reason}</span>}
          <span
            className={isExpired || isExpiredByTime ? "text-red-500" : ""}
          >
            {isExpired || isExpiredByTime || isRevoked ? "Ended" : "Ends"}{" "}
            {formatRelative(new Date(delegation.endsAt), new Date())}
          </span>
        </div>
      </div>
      {canRevoke && !isExpired && (
        <Button
          variant="ghost"
          size="sm"
          className="h-8 text-destructive hover:bg-destructive/10"
          onClick={handleRevoke}
          disabled={isRevoking}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      )}
    </div>
  );
}

interface GrantDelegationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

function GrantDelegationDialog({
  open,
  onOpenChange,
  onSuccess,
}: GrantDelegationDialogProps) {
  const employeesQuery = useHrEmployees({ limit: 500 });
  const [permSearch, setPermSearch] = useState("");

  const employees: Employee[] = (() => {
    const data = employeesQuery.data;
    if (!data) return [];
    if (Array.isArray(data)) return data;
    return (data as { data?: Employee[] }).data ?? [];
  })();

  const filteredPermissions = PERMISSIONS.filter(
    (p) =>
      !permSearch ||
      p.name.toLowerCase().includes(permSearch.toLowerCase()) ||
      p.description.toLowerCase().includes(permSearch.toLowerCase()),
  );

  const form = useForm<DelegationFormValues>({
    resolver: zodResolver(delegationSchema),
    defaultValues: {
      delegateeId: "",
      permissions: [],
      startsAt: "",
      endsAt: "",
      reason: "",
    },
  });

  const mutation = useMutation({
    mutationFn: (values: DelegationFormValues) =>
      apiClient.post("/access/delegations", {
        delegateeId: values.delegateeId,
        permissions: values.permissions,
        startsAt: new Date(values.startsAt).toISOString(),
        endsAt: new Date(values.endsAt).toISOString(),
        reason: values.reason || undefined,
      }),
    onSuccess: () => {
      toast.success("Delegation created");
      form.reset();
      setPermSearch("");
      onSuccess();
    },
    onError: (error) => toast.error(getApiError(error)),
  });

  const handleSubmit = useCallback(
    (values: DelegationFormValues) => mutation.mutate(values),
    [mutation],
  );

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!open) {
        form.reset();
        setPermSearch("");
      }
      onOpenChange(open);
    },
    [form, onOpenChange],
  );

  const today = new Date().toISOString().slice(0, 16);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Delegate Permissions</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-4"
          >
            <FormField
              control={form.control}
              name="delegateeId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Delegate to</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select employee…" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {employees.map((e) => (
                        <SelectItem key={e.id} value={e.id}>
                          {e.name ?? e.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="permissions"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Permissions ({field.value.length} selected)
                  </FormLabel>
                  <div className="border rounded-md">
                    <div className="p-2 border-b">
                      <Input
                        placeholder="Search permissions…"
                        value={permSearch}
                        onChange={(e) => setPermSearch(e.target.value)}
                        className="h-8 text-xs"
                      />
                    </div>
                    <ScrollArea className="h-40">
                      <div className="p-2 space-y-1">
                        {filteredPermissions.map((perm) => (
                          <PermissionCheckboxItem
                            key={perm.name}
                            perm={perm}
                            checked={field.value.includes(perm.name)}
                            onCheckedChange={(checked) => {
                              const next = checked
                                ? [...field.value, perm.name]
                                : field.value.filter((p) => p !== perm.name);
                              field.onChange(next);
                            }}
                          />
                        ))}
                        {filteredPermissions.length === 0 && (
                          <p className="text-xs text-muted-foreground text-center py-4">
                            No permissions match
                          </p>
                        )}
                      </div>
                    </ScrollArea>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="startsAt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Starts at</FormLabel>
                    <FormControl>
                      <Input type="datetime-local" min={today} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="endsAt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ends at</FormLabel>
                    <FormControl>
                      <Input type="datetime-local" min={today} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reason (optional)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g. Covering annual leave"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={mutation.isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? "Delegating…" : "Delegate"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

interface PermissionCheckboxItemProps {
  perm: { name: string; description: string };
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}

function PermissionCheckboxItem({
  perm,
  checked,
  onCheckedChange,
}: PermissionCheckboxItemProps) {
  const handleChange = useCallback(
    (v: boolean | "indeterminate") => onCheckedChange(v === true),
    [onCheckedChange],
  );

  return (
    <label className="flex items-start gap-2 cursor-pointer rounded p-1 hover:bg-muted/50">
      <Checkbox
        checked={checked}
        onCheckedChange={handleChange}
        className="mt-0.5 shrink-0"
      />
      <div className="min-w-0">
        <p className="text-xs font-mono leading-snug truncate">{perm.name}</p>
        <p className="text-[10px] text-muted-foreground leading-tight">
          {perm.description}
        </p>
      </div>
    </label>
  );
}
