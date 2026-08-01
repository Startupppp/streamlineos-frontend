"use client";

import { useState, useCallback, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { SearchInput } from "@/components/ui/search-input";
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
import { apiClient } from "@/lib/api-client";
import { getErrorMessage } from "@/lib/get-error-message";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { toast } from "sonner";
import { delegationSchema, type DelegationFormValues } from "./delegation-schema";

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
}

export function GrantDelegationSheet({
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
    onError: (error) => toast.error(getErrorMessage(error)),
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

  const handleCloseSheet = useCallback(() => handleOpenChange(false), [handleOpenChange]);

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
            <div className="space-y-1.5">
              <Label htmlFor="del-to" className="text-xs">
                Delegate to
              </Label>
              <Select value={delegateeId} onValueChange={handleDelegateeChange}>
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
        <p className="text-[10px] text-muted-foreground leading-tight">
          {perm.description}
        </p>
      </div>
    </label>
  );
}
