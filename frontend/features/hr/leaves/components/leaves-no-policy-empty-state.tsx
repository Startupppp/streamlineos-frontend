"use client";

import { useCallback } from "react";
import { toast } from "sonner";

import { EmptyState } from "@/components/ui/empty-state";
import { useCan } from "@/hooks/api/access";
import { useSeedLeaveTypes } from "@/hooks/api/hr";
import { getErrorMessage } from "@/lib/get-error-message";

/**
 * V-051. An org that has configured no leave type used to get a hint string and
 * nothing else — no route into setup. This is the guided version: it says what
 * is missing and offers the two ways out, both gated on `hr:leaves:manage`
 * (FE-44), so a member sees the explanation without a control they cannot use.
 */
export function LeavesNoPolicyEmptyState() {
  const canManage = useCan("hr:leaves:manage");
  const seed = useSeedLeaveTypes();

  const handleSeed = useCallback(() => {
    seed.mutate(undefined, {
      onSuccess: (result) =>
        toast.success(
          result.seeded > 0
            ? `Added ${result.seeded} standard leave type${result.seeded === 1 ? "" : "s"}`
            : "Standard leave types already exist",
        ),
      onError: (error) => toast.error(getErrorMessage(error)),
    });
  }, [seed]);

  return (
    <EmptyState
      illustrationPreset="default"
      title="Policies not configured"
      description={
        canManage
          ? "No leave type has been set up yet, so nothing accrues and nobody can request leave. Configure the policies, or start from the standard Indian SMB set."
          : "No leave type has been set up yet, so nothing accrues and nobody can request leave. An HR admin can configure the policies."
      }
      action={
        canManage
          ? { label: "Configure leave policies", href: "/hr/leave-policies" }
          : undefined
      }
      secondaryAction={
        canManage
          ? {
              label: seed.isPending
                ? "Adding standard types…"
                : "Use the India SMB template",
              onClick: handleSeed,
            }
          : undefined
      }
    />
  );
}
