"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { LoadingButton } from "@/components/ui/loading-button";
import {
  useActivatePolicy,
  useArchivePolicy,
  useCreatePolicyVersion,
  usePolicyConflicts,
} from "@/hooks/api/hr/policies";
import type { HrPolicy } from "@/types/hr/policies";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { PolicyConflictBanner } from "./policy-conflict-banner";
import { isApiError } from "@/lib/api-envelope";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-muted text-muted-foreground border-border",
  active: "bg-status-success-surface text-status-success-ink border-status-success-rule",
  archived: "bg-status-warning-surface text-status-warning-ink border-status-warning-rule",
};

interface Props {
  policy: HrPolicy;
  canManage: boolean;
}

export function PolicyVersionHistory({ policy, canManage }: Props) {
  const createVersion = useCreatePolicyVersion();
  const activate = useActivatePolicy();
  const archive = useArchivePolicy();
  const conflicts = usePolicyConflicts(policy.status === "draft" ? policy.id : 0);
  const [forceArmed, setForceArmed] = useState(false);

  function handleCreateVersion() {
    createVersion.mutate(policy.id, {
      onSuccess: () => toast.success("New draft version created"),
      onError: (err) => toast.error(getErrorMessage(err)),
    });
  }

  function handleActivate(force = false) {
    activate.mutate(
      { policyId: policy.id, force },
      {
        onSuccess: () => {
          toast.success(force ? "Policy force-activated" : "Policy activated");
          setForceArmed(false);
        },
        onError: (err) => {
          toast.error(getErrorMessage(err));
          // FE-78: the backend answers a scope/date conflict with 409.
          if (isApiError(err) && err.status === 409) {
            setForceArmed(true);
          }
        },
      },
    );
  }

  function handleArchive() {
    archive.mutate(policy.id, {
      onSuccess: () => toast.success("Policy archived"),
      onError: (err) => toast.error(getErrorMessage(err)),
    });
  }

  function handleActivateClick() {
    handleActivate(false);
  }

  function handleForceActivateClick() {
    handleActivate(true);
  }

  const canActivateSafely = conflicts.data?.canActivate !== false;

  return (
    <div className="space-y-2">
      {policy.status === "draft" && <PolicyConflictBanner policyId={policy.id} />}

      <div className="flex items-center gap-2">
        <Badge
          variant="outline"
          className={`text-xs px-2 py-0.5 ${STATUS_COLORS[policy.status] ?? ""}`}
        >
          {policy.status}
        </Badge>
        <span className="text-xs text-muted-foreground">v{policy.version}</span>

        {canManage && (
          <div className="flex items-center gap-1 ml-auto flex-wrap justify-end">
            {policy.status === "active" && (
              <LoadingButton
                variant="outline"
                size="sm"
                className="text-xs"
                isPending={createVersion.isPending}
                onClick={handleCreateVersion}
              >
                New Version
              </LoadingButton>
            )}
            {policy.status === "draft" && (
              <>
                <LoadingButton
                  size="sm"
                  className="text-xs"
                  isPending={activate.isPending}
                  onClick={handleActivateClick}
                  disabled={conflicts.isLoading}
                >
                  Activate
                </LoadingButton>
                {forceArmed && !canActivateSafely && (
                  <LoadingButton
                    size="sm"
                    variant="destructive"
                    className="text-xs"
                    isPending={activate.isPending}
                    onClick={handleForceActivateClick}
                  >
                    Force activate
                  </LoadingButton>
                )}
              </>
            )}
            {policy.status !== "archived" && (
              <ConfirmDialog
                trigger={
                  <Button type="button" variant="outline" size="sm" className="text-xs text-muted-foreground">
                    Archive
                  </Button>
                }
                title="Archive this policy?"
                description="An archived policy stops applying to employees."
                confirmLabel="Archive"
                destructive
                keepOpenOnConfirm
                isPending={archive.isPending}
                onConfirm={handleArchive}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
