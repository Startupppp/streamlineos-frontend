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

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-muted text-muted-foreground border-border",
  active: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30",
  archived: "bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/30",
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
          const message = getErrorMessage(err);
          toast.error(message);
          if (message.toLowerCase().includes("conflict")) {
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
                  onClick={() => handleActivate(false)}
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
                    onClick={() => handleActivate(true)}
                  >
                    Force activate
                  </LoadingButton>
                )}
              </>
            )}
            {policy.status !== "archived" && (
              <LoadingButton
                variant="outline"
                size="sm"
                className="text-xs text-muted-foreground"
                isPending={archive.isPending}
                onClick={handleArchive}
              >
                Archive
              </LoadingButton>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
