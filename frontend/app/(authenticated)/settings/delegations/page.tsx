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
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
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
import { Plus, ArrowLeftRight, X, Loader2 } from "lucide-react";
import { formatRelative } from "date-fns";
import { DashboardGate } from "@/components/shared/dashboard-gate";
import { useOrgMembers } from "@/hooks/api/organization";
import { PERMISSIONS } from "@/lib/rbac/permissions";

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
  const [sheetOpen, setSheetOpen] = useState(false);
  const [revoking, setRevoking] = useState<string | null>(null);

  const { data: membersData } = useOrgMembers(1, 200);
  const members = membersData?.data ?? [];
  const memberMap = useMemo(
    () => new Map(members.map((m) => [m.userId, m.name ?? m.email])),
    [members],
  );

  const { data: received, isLoading: loadingReceived } = useQuery<Delegation[]>(
    {
      queryKey: ["delegations", "received"],
      queryFn: () => apiClient.get<Delegation[]>("/access/delegations"),
      staleTime: 60_000,
    },
  );

  const { data: given, isLoading: loadingGiven } = useQuery<Delegation[]>({
    queryKey: ["delegations", "given"],
    queryFn: () =>
      apiClient.get<Delegation[]>("/access/delegations/given"),
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
    setSheetOpen(false);
    void queryClient.invalidateQueries({ queryKey: ["delegations"] });
  }, [queryClient]);

  const now = new Date();
  const activeGiven = useMemo(
    () =>
      (given ?? []).filter(
        (d) => d.status === "ACTIVE" && new Date(d.endsAt) > now,
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [given],
  );
  const inactiveGiven = useMemo(
    () =>
      (given ?? []).filter(
        (d) => d.status !== "ACTIVE" || new Date(d.endsAt) <= now,
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [given],
  );

  return (
    <PageWrapper
      title="Delegations"
      subtitle="Share specific permissions with other team members for a period of time"
      actions={
        <Button
          size="sm"
          className="gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground"
          onClick={() => setSheetOpen(true)}
        >
          <Plus className="h-3.5 w-3.5" />
          Delegate
        </Button>
      }
    >
      <div className="space-y-4">
        <Card>
          <CardHeader className="px-4 pt-4 pb-2">
            <CardTitle className="text-sm font-semibold flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <ArrowLeftRight className="h-3.5 w-3.5 text-muted-foreground" />
                Received from others
              </span>
              {!loadingReceived && (received?.length ?? 0) > 0 && (
                <Badge variant="secondary" className="text-xs font-medium">
                  {received!.length}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loadingReceived ? (
              <DelegationSkeletons count={2} />
            ) : !received?.length ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <ArrowLeftRight className="h-8 w-8 text-muted-foreground/30 mb-2" />
                <p className="text-sm font-medium">No delegations received</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Permissions delegated to you will appear here
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border/30">
                {received.map((d) => (
                  <DelegationRow
                    key={d.id}
                    delegation={d}
                    memberMap={memberMap}
                    nameField="delegatorId"
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="px-4 pt-4 pb-2">
            <CardTitle className="text-sm font-semibold flex items-center justify-between">
              <span>Granted by you</span>
              {!loadingGiven && activeGiven.length > 0 && (
                <Badge variant="secondary" className="text-xs font-medium">
                  {activeGiven.length} active
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loadingGiven ? (
              <DelegationSkeletons count={2} />
            ) : !activeGiven.length && !inactiveGiven.length ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <ArrowLeftRight className="h-8 w-8 text-muted-foreground/30 mb-2" />
                <p className="text-sm font-medium">No delegations granted</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Delegate permissions to share access with colleagues
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border/30">
                {activeGiven.map((d) => (
                  <DelegationRow
                    key={d.id}
                    delegation={d}
                    memberMap={memberMap}
                    nameField="delegateeId"
                    canRevoke
                    onRevoke={handleRevoke}
                    isRevoking={revoking === d.id}
                  />
                ))}
                {inactiveGiven.map((d) => (
                  <DelegationRow
                    key={d.id}
                    delegation={d}
                    memberMap={memberMap}
                    nameField="delegateeId"
                    isInactive
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <GrantDelegationSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        onSuccess={handleGrantSuccess}
        members={members}
      />
    </PageWrapper>
  );
}

function DelegationSkeletons({ count }: { count: number }) {
  return (
    <div className="divide-y divide-border/30">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-4 py-2.5">
          <div className="space-y-1.5 flex-1">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-48" />
          </div>
        </div>
      ))}
    </div>
  );
}

interface DelegationRowProps {
  delegation: Delegation;
  memberMap: Map<string, string>;
  nameField: "delegatorId" | "delegateeId";
  canRevoke?: boolean;
  onRevoke?: (id: string) => void;
  isRevoking?: boolean;
  isInactive?: boolean;
}

function DelegationRow({
  delegation,
  memberMap,
  nameField,
  canRevoke,
  onRevoke,
  isRevoking,
  isInactive,
}: DelegationRowProps) {
  const handleRevoke = useCallback(
    () => onRevoke?.(delegation.id),
    [delegation.id, onRevoke],
  );

  const principalId = delegation[nameField];
  const displayName = memberMap.get(principalId) ?? principalId.slice(0, 12);
  const isRevoked = delegation.status === "REVOKED";
  const isExpired =
    !isRevoked && new Date(delegation.endsAt) <= new Date();

  return (
    <div className="flex items-center gap-3 px-4 py-2.5">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium leading-none">{displayName}</span>
          <span className="text-xs text-muted-foreground tabular-nums">
            {delegation.permissions.length} permission
            {delegation.permissions.length !== 1 ? "s" : ""}
          </span>
          {isInactive && (
            <Badge
              variant="outline"
              className="text-xs text-muted-foreground shrink-0"
            >
              {isRevoked ? "Revoked" : "Expired"}
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-0.5 truncate">
          {isInactive ? "Ended" : "Ends"}{" "}
          {formatRelative(new Date(delegation.endsAt), new Date())}
          {delegation.reason && (
            <span className="text-muted-foreground/60">
              {" "}
              · {delegation.reason}
            </span>
          )}
        </p>
      </div>
      {canRevoke && !isInactive && onRevoke && (
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
          onClick={handleRevoke}
          disabled={isRevoking}
          aria-label="Revoke delegation"
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

interface Member {
  userId: string;
  name: string | null;
  email: string;
}

interface GrantDelegationSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  members: Member[];
}

function GrantDelegationSheet({
  open,
  onOpenChange,
  onSuccess,
  members,
}: GrantDelegationSheetProps) {
  const [permSearch, setPermSearch] = useState("");

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<DelegationFormValues>({
    resolver: zodResolver(delegationSchema),
    defaultValues: {
      delegateeId: "",
      permissions: [],
      startsAt: "",
      endsAt: "",
      reason: "",
    },
  });

  const delegateeId = watch("delegateeId");
  const selectedPerms = watch("permissions");

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
      reset();
      setPermSearch("");
      onSuccess();
    },
    onError: (error) => toast.error(getApiError(error)),
  });

  const handleDelegateeChange = useCallback(
    (v: string) => setValue("delegateeId", v, { shouldValidate: true }),
    [setValue],
  );

  const handlePermToggle = useCallback(
    (permName: string, checked: boolean) => {
      const current = selectedPerms ?? [];
      setValue(
        "permissions",
        checked
          ? [...current, permName]
          : current.filter((p) => p !== permName),
        { shouldValidate: true },
      );
    },
    [selectedPerms, setValue],
  );

  const handleOpenChange = useCallback(
    (next: boolean) => {
      if (!next) {
        reset();
        setPermSearch("");
      }
      onOpenChange(next);
    },
    [reset, onOpenChange],
  );

  const onSubmit = useCallback(
    (values: DelegationFormValues) => mutation.mutate(values),
    [mutation],
  );

  const filteredPerms = useMemo(
    () =>
      PERMISSIONS.filter(
        (p) =>
          !permSearch ||
          p.name.toLowerCase().includes(permSearch.toLowerCase()) ||
          p.description.toLowerCase().includes(permSearch.toLowerCase()),
      ),
    [permSearch],
  );

  const today = new Date().toISOString().slice(0, 16);

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent className="sm:max-w-[400px] flex flex-col">
        <SheetHeader className="pb-4">
          <SheetTitle>Delegate permissions</SheetTitle>
          <SheetDescription className="text-xs">
            Share specific permissions with a team member for a set period.
          </SheetDescription>
        </SheetHeader>

        <form
          onSubmit={handleSubmit(onSubmit)}
          noValidate
          className="flex flex-col gap-3 flex-1 overflow-hidden"
        >
          <div className="space-y-1.5">
            <Label htmlFor="del-to" className="text-xs">
              Delegate to
            </Label>
            <Select value={delegateeId} onValueChange={handleDelegateeChange}>
              <SelectTrigger id="del-to" className="h-9">
                <SelectValue placeholder="Select team member…" />
              </SelectTrigger>
              <SelectContent>
                {members.map((m) => (
                  <SelectItem key={m.userId} value={m.userId}>
                    {m.name ?? m.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.delegateeId && (
              <p className="text-xs text-destructive">
                {errors.delegateeId.message}
              </p>
            )}
          </div>

          <div className="space-y-1.5 flex-1 min-h-0 flex flex-col">
            <Label className="text-xs">
              Permissions{" "}
              {selectedPerms.length > 0 && (
                <span className="text-muted-foreground font-normal">
                  ({selectedPerms.length} selected)
                </span>
              )}
            </Label>
            <div className="border rounded-md flex flex-col flex-1 min-h-0 overflow-hidden">
              <div className="p-2 border-b shrink-0">
                <Input
                  placeholder="Search permissions…"
                  value={permSearch}
                  onChange={(e) => setPermSearch(e.target.value)}
                  className="h-7 text-xs"
                />
              </div>
              <ScrollArea className="flex-1">
                <div className="p-1.5 space-y-0.5">
                  {filteredPerms.map((perm) => (
                    <PermissionItem
                      key={perm.name}
                      perm={perm}
                      checked={selectedPerms.includes(perm.name)}
                      onToggle={handlePermToggle}
                    />
                  ))}
                  {filteredPerms.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-4">
                      No permissions match
                    </p>
                  )}
                </div>
              </ScrollArea>
            </div>
            {errors.permissions && (
              <p className="text-xs text-destructive">
                {errors.permissions.message}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 shrink-0">
            <div className="space-y-1.5">
              <Label htmlFor="del-start" className="text-xs">
                Starts at
              </Label>
              <Input
                id="del-start"
                type="datetime-local"
                min={today}
                className="h-9"
                aria-invalid={Boolean(errors.startsAt)}
                {...register("startsAt")}
              />
              {errors.startsAt && (
                <p className="text-xs text-destructive">
                  {errors.startsAt.message}
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="del-end" className="text-xs">
                Ends at
              </Label>
              <Input
                id="del-end"
                type="datetime-local"
                min={today}
                className="h-9"
                aria-invalid={Boolean(errors.endsAt)}
                {...register("endsAt")}
              />
              {errors.endsAt && (
                <p className="text-xs text-destructive">
                  {errors.endsAt.message}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-1.5 shrink-0">
            <Label
              htmlFor="del-reason"
              className="text-xs text-muted-foreground"
            >
              Reason <span className="font-normal">(optional)</span>
            </Label>
            <Input
              id="del-reason"
              className="h-9"
              placeholder="e.g. Covering annual leave"
              {...register("reason")}
            />
          </div>

          <div className="flex justify-end gap-2 pt-1 shrink-0">
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
              Delegate
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}

interface PermissionItemProps {
  perm: { name: string; description: string };
  checked: boolean;
  onToggle: (name: string, checked: boolean) => void;
}

function PermissionItem({ perm, checked, onToggle }: PermissionItemProps) {
  const handleChange = useCallback(
    (v: boolean | "indeterminate") => onToggle(perm.name, v === true),
    [perm.name, onToggle],
  );

  return (
    <label className="flex items-start gap-2 cursor-pointer rounded px-1.5 py-1 hover:bg-muted/50 transition-colors">
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
