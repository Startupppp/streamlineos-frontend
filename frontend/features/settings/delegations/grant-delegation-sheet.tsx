"use client";

import { useState, useCallback, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, Loader2, RefreshCw } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { SearchInput } from "@/components/ui/search-input";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Sheet,
  SheetBody,
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
import { getErrorMessage } from "@/lib/get-error-message";
import { toast } from "sonner";
import { delegationSchema, type DelegationFormValues } from "./delegation-schema";
import { useGrantDelegation } from "@/hooks/api/delegations";
import {
  usePermissionCatalog,
  useRbacDiscoveryGrantable,
} from "@/hooks/api/access";
import { groupDelegationPermissions } from "./delegation-permissions";

export interface Member {
  userId: string;
  name: string | null;
  email: string;
}

interface GrantDelegationSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  members: Member[];
  membersLoading: boolean;
  membersError: unknown;
  onRetryMembers: () => void;
}

function toDatePart(value: string): string {
  if (!value) return "";
  return value.slice(0, 10);
}

function withDefaultTime(date: string, time: string): string {
  if (!date) return "";
  return `${date}T${time}`;
}

export function GrantDelegationSheet({
  open,
  onOpenChange,
  onSuccess,
  members,
  membersLoading,
  membersError,
  onRetryMembers,
}: GrantDelegationSheetProps) {
  const [permSearch, setPermSearch] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);

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
  const startsAt = watch("startsAt");
  const endsAt = watch("endsAt");

  const mutation = useGrantDelegation({
    onSuccess: () => {
      toast.success("Delegation created");
      reset();
      setPermSearch("");
      setSubmitError(null);
      onSuccess();
    },
    onError: (error) => setSubmitError(getErrorMessage(error)),
  });

  const handleDelegateeChange = useCallback(
    (v: string) => setValue("delegateeId", v, { shouldValidate: true }),
    [setValue],
  );

  const handleStartsAtChange = useCallback(
    (date: string) => {
      setValue("startsAt", withDefaultTime(date, "00:00"), {
        shouldValidate: true,
      });
    },
    [setValue],
  );

  const handleEndsAtChange = useCallback(
    (date: string) => {
      setValue("endsAt", withDefaultTime(date, "23:59"), {
        shouldValidate: true,
      });
    },
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
        setSubmitError(null);
      }
      onOpenChange(next);
    },
    [reset, onOpenChange],
  );

  const handleCloseSheet = useCallback(() => handleOpenChange(false), [handleOpenChange]);

  const onSubmit = useCallback(
    (values: DelegationFormValues) => mutation.mutate(values),
    [mutation],
  );

  const permissionCatalog = usePermissionCatalog({ enabled: open });
  const grantable = useRbacDiscoveryGrantable({ enabled: open });
  const permissionGroups = useMemo(
    () =>
      groupDelegationPermissions(
        permissionCatalog.data ?? [],
        grantable.data?.grantableKeys ?? [],
        permSearch,
      ),
    [permissionCatalog.data, grantable.data?.grantableKeys, permSearch],
  );
  const permissionsLoading =
    permissionCatalog.isLoading || grantable.isLoading;
  const permissionsError = permissionCatalog.error ?? grantable.error;

  const handleRetryPermissions = useCallback(() => {
    void Promise.all([permissionCatalog.refetch(), grantable.refetch()]);
  }, [permissionCatalog, grantable]);

  const endsFromDate = useMemo(() => {
    const start = toDatePart(startsAt);
    return start ? new Date(`${start}T00:00:00`) : undefined;
  }, [startsAt]);

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent className="sm:max-w-[400px] p-0 flex flex-col gap-0">
        <SheetHeader className="shrink-0 px-6 py-4 border-b text-left gap-1">
          <SheetTitle>Delegate permissions</SheetTitle>
          <SheetDescription className="text-xs">
            Share specific permissions with a team member for a set period.
          </SheetDescription>
        </SheetHeader>

        <form
          onSubmit={handleSubmit(onSubmit)}
          noValidate
          className="flex flex-col flex-1 overflow-hidden"
        >
          <SheetBody className="flex flex-col gap-3 px-6 py-5">
            {submitError ? (
              <div
                role="alert"
                className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-sm text-destructive"
              >
                <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
                <span>{submitError}</span>
              </div>
            ) : null}
            <div className="space-y-1.5">
              <Label htmlFor="del-to" className="text-xs">
                Delegate to
              </Label>
              <Select
                value={delegateeId}
                onValueChange={handleDelegateeChange}
                disabled={membersLoading || !!membersError || members.length === 0}
              >
                <SelectTrigger id="del-to">
                  <SelectValue placeholder="Select team member…" />
                </SelectTrigger>
                <SelectContent className="min-w-[var(--radix-select-trigger-width)]">
                  {members.map((m) => (
                    <SelectItem key={m.userId} value={m.userId}>
                      {m.name ?? m.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {membersError ? (
                <div className="flex items-center justify-between gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-2.5 py-2">
                  <p className="text-xs text-destructive">
                    {getErrorMessage(membersError)}
                  </p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={onRetryMembers}
                  >
                    <RefreshCw className="size-3.5" aria-hidden />
                    Retry
                  </Button>
                </div>
              ) : !membersLoading && members.length === 0 ? (
                <p className="text-xs leading-5 text-muted-foreground">
                  There is no other active organization member available to
                  receive a delegation.
                </p>
              ) : null}
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
                  <SearchInput
                    placeholder="Search permissions…"
                    value={permSearch}
                    onValueChange={setPermSearch}
                  />
                </div>
                <ScrollArea className="flex-1">
                  <div className="p-1.5 space-y-0.5">
                    {permissionsLoading ? (
                      <div className="flex items-center justify-center gap-2 py-6 text-xs text-muted-foreground">
                        <Loader2 className="size-4 animate-spin" aria-hidden />
                        Loading grantable permissions…
                      </div>
                    ) : permissionsError ? (
                      <div className="space-y-2 py-4 text-center">
                        <p className="text-xs text-destructive">
                          {getErrorMessage(permissionsError)}
                        </p>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleRetryPermissions}
                        >
                          <RefreshCw className="size-3.5" aria-hidden />
                          Try again
                        </Button>
                      </div>
                    ) : permissionGroups.length > 0 ? (
                      permissionGroups.map((group) => (
                        <section key={group.key} className="pb-2 last:pb-0">
                          <p className="sticky top-0 z-10 bg-background/95 px-1.5 py-1.5 text-micro font-semibold uppercase tracking-wide text-muted-foreground backdrop-blur">
                            {group.label}
                          </p>
                          {group.permissions.map((permission) => (
                            <PermissionItem
                              key={permission.name}
                              perm={permission}
                              checked={selectedPerms.includes(permission.name)}
                              onToggle={handlePermToggle}
                            />
                          ))}
                        </section>
                      ))
                    ) : (
                      <p className="text-xs text-muted-foreground text-center py-4">
                        {permSearch
                          ? "No grantable permissions match"
                          : "You do not currently hold any permissions that can be delegated."}
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
              <div className="min-w-0 space-y-1.5">
                <Label htmlFor="del-start" className="text-xs">
                  Starts at
                </Label>
                <DatePicker
                  id="del-start"
                  value={toDatePart(startsAt)}
                  onChange={handleStartsAtChange}
                  placeholder="Start date"
                  disablePast
                  dateFormat="MMM d, yyyy"
                  className="w-full"
                />
                {errors.startsAt && (
                  <p className="text-xs text-destructive">
                    {errors.startsAt.message}
                  </p>
                )}
              </div>
              <div className="min-w-0 space-y-1.5">
                <Label htmlFor="del-end" className="text-xs">
                  Ends at
                </Label>
                <DatePicker
                  id="del-end"
                  value={toDatePart(endsAt)}
                  onChange={handleEndsAtChange}
                  placeholder="End date"
                  disablePast
                  fromDate={endsFromDate}
                  dateFormat="MMM d, yyyy"
                  className="w-full"
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
                placeholder="e.g. Covering annual leave"
                {...register("reason")}
              />
            </div>
          </SheetBody>

          <div className="shrink-0 px-6 py-4 border-t">
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCloseSheet}
                disabled={mutation.isPending}
              >
                Cancel
              </Button>
              <LoadingButton
                type="submit"
                size="sm"
                isPending={mutation.isPending}
                disabled={
                  mutation.isPending ||
                  permissionsLoading ||
                  !!permissionsError ||
                  membersLoading ||
                  !!membersError ||
                  members.length === 0
                }
                loadingText="Delegating…"
                className="bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                Delegate
              </LoadingButton>
            </div>
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
        <p className="text-micro text-muted-foreground leading-tight">
          {perm.description}
        </p>
      </div>
    </label>
  );
}
