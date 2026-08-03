"use client";

import { useState, useCallback } from "react";
import { ArrowRightLeft, Clock, X } from "lucide-react";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getErrorMessage } from "@/lib/get-error-message";
import { isApiError } from "@/lib/api-client";
import {
  useModuleOwnership,
  useTransferModuleOwnership,
  useCancelModuleOwnershipTransfer,
  useModuleMemberCandidates,
} from "@/hooks/api/module-access";
import {
  transferOwnershipSchema,
  type TransferOwnershipInput,
} from "@/features/module-access/module-access-schema";

interface OwnershipSectionProps {
  moduleKey: string;
  canManage: boolean;
}

export function OwnershipSection({
  moduleKey,
  canManage,
}: OwnershipSectionProps) {
  const [transferOpen, setTransferOpen] = useState(false);
  const ownershipQuery = useModuleOwnership(moduleKey);
  const cancelMutation = useCancelModuleOwnershipTransfer(moduleKey);
  const candidatesQuery = useModuleMemberCandidates(moduleKey);
  const transferMutation = useTransferModuleOwnership(moduleKey);

  const form = useForm<TransferOwnershipInput>({
    resolver: zodResolver(transferOwnershipSchema),
    defaultValues: { toUserId: "" },
  });

  const handleRetryOwnership = useCallback(() => {
    void ownershipQuery.refetch();
  }, [ownershipQuery]);

  const handleOpenTransfer = useCallback(() => {
    form.reset();
    setTransferOpen(true);
  }, [form]);

  const handleCloseTransfer = useCallback(
    (open: boolean) => {
      if (!open) form.reset();
      setTransferOpen(open);
    },
    [form],
  );

  function handleTransferSubmit(values: TransferOwnershipInput) {
    transferMutation.mutate(values, {
      onSuccess: () => {
        toast.success("Ownership transfer initiated. The recipient must accept.");
        setTransferOpen(false);
      },
      onError: (err) => toast.error(getErrorMessage(err)),
    });
  }

  const handleCancelTransfer = useCallback(() => {
    cancelMutation.mutate(undefined, {
      onSuccess: () => toast.success("Transfer cancelled"),
      onError: (err) => toast.error(getErrorMessage(err)),
    });
  }, [cancelMutation]);

  const ownership = ownershipQuery.data;
  const pending = ownership?.pendingTransfer;

  if (ownershipQuery.isLoading) {
    return (
      <Card className="p-4 flex items-center gap-3">
        <Skeleton className="h-5 w-5 rounded-full" />
        <Skeleton className="h-4 w-48" />
      </Card>
    );
  }

  const ownershipUnconfigured =
    ownershipQuery.isError &&
    isApiError(ownershipQuery.error) &&
    ownershipQuery.error.status === 404;

  if (ownershipQuery.isError && !ownershipUnconfigured) {
    return (
      <EmptyState
        illustrationPreset="permissions"
        title="Couldn't load module ownership"
        description={getErrorMessage(ownershipQuery.error)}
        action={{ label: "Retry", onClick: handleRetryOwnership }}
        className="flex-1"
      />
    );
  }

  if (!ownership) {
    return (
      <EmptyState
        illustrationPreset="permissions"
        title="No owner assigned"
        description={
          canManage
            ? "This module has no owner yet. Assign one so requests and approvals have a clear destination."
            : "This module has no owner yet. An organization owner can assign one."
        }
        {...(canManage
          ? { action: { label: "Assign owner", onClick: handleOpenTransfer } }
          : {})}
        className="flex-1"
      />
    );
  }

  const candidates = (candidatesQuery.data ?? []).filter(
    (c) => c.userId !== ownership.ownerId,
  );

  return (
    <>
      <Card className="p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <ArrowRightLeft className="h-4 w-4 text-muted-foreground shrink-0" />
          <div className="min-w-0">
            <span className="text-sm text-muted-foreground">Module owner:</span>{" "}
            <span className="text-sm font-medium text-foreground">
              {ownership.ownerDisplayName}
            </span>{" "}
            <span className="text-xs text-muted-foreground">
              ({ownership.ownerEmail})
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {pending && (
            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className="text-xs gap-1 text-amber-700 border-amber-300 bg-amber-50 dark:text-amber-400 dark:border-amber-700/50 dark:bg-amber-500/10"
              >
                <Clock className="h-3 w-3" />
                Transfer pending → {pending.toDisplayName}
              </Badge>
              {canManage && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={handleCancelTransfer}
                  disabled={cancelMutation.isPending}
                >
                  <X className="h-3 w-3 mr-1" />
                  Cancel
                </Button>
              )}
            </div>
          )}
          {!pending && canManage && (
            <Button
              variant="outline"
              size="sm"
              className="text-xs"
              onClick={handleOpenTransfer}
            >
              <ArrowRightLeft className="h-3.5 w-3.5 mr-1.5" />
              Transfer ownership
            </Button>
          )}
        </div>
      </Card>

      <Dialog open={transferOpen} onOpenChange={handleCloseTransfer}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Transfer module ownership</DialogTitle>
            <DialogDescription>
              {candidates.length === 0
                ? "You are currently the only active member of this organization. Invite someone and have them accept before you can transfer ownership."
                : "The selected user must accept the transfer before it takes effect."}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(handleTransferSubmit)}
              className="space-y-4"
            >
              <FormField
                control={form.control}
                name="toUserId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Transfer to</FormLabel>
                    <FormControl>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a member…" />
                        </SelectTrigger>
                        <SelectContent className="min-w-[var(--radix-select-trigger-width)]">
                          {candidates.length === 0 ? (
                            <div className="py-3 px-3 text-xs text-muted-foreground">
                              No eligible members
                            </div>
                          ) : (
                            candidates.map((c) => (
                              <SelectItem key={c.userId} value={c.userId}>
                                {c.displayName} ({c.email})
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleCloseTransfer(false)}
                  disabled={transferMutation.isPending}
                >
                  Cancel
                </Button>
                <LoadingButton
                  type="submit"
                  isPending={transferMutation.isPending}
                  disabled={candidates.length === 0}
                  loadingText="Initiating…"
                >
                  Transfer
                </LoadingButton>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
}
