"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useCan } from "@/hooks/api/access";
import { useRevokeGrant } from "@/hooks/api/portal-access/grants";
import { getErrorMessage } from "@/lib/get-error-message";
import { PM_ROW } from "@/components/pm-chrome";
import { cn } from "@/lib/utils";

export interface GrantRowGrant {
  projectClientGrantId: string;
  status: string;
  contactFirstName: string | null;
  contactLastName: string | null;
  expiresAt: string | null;
  canViewMilestones: boolean;
  canViewTasks: boolean;
  canViewAttachments: boolean;
  canViewComments: boolean;
  canSubmitChangeRequests: boolean;
}

interface GrantRowProps {
  grant: GrantRowGrant;
}

export function GrantRow({ grant }: GrantRowProps) {
  const [confirmRevoke, setConfirmRevoke] = useState(false);
  const canManage = useCan("build:clientvisibility:manage");
  const revokeGrant = useRevokeGrant(grant.projectClientGrantId);

  const name =
    [grant.contactFirstName, grant.contactLastName].filter(Boolean).join(" ") ||
    grant.projectClientGrantId.slice(0, 8) + "…";

  const capabilities = [
    grant.canViewMilestones && "Milestones",
    grant.canViewTasks && "Tasks",
    grant.canViewAttachments && "Attachments",
    grant.canViewComments && "Comments",
    grant.canSubmitChangeRequests && "Change Requests",
  ].filter(Boolean);

  const isRevoked = grant.status !== "ACTIVE";

  const handleRevokeClick = useCallback(() => setConfirmRevoke(true), []);

  const handleRevokeConfirm = useCallback(() => {
    revokeGrant.mutate(undefined, {
      onSuccess: () => {
        toast.success("Portal access revoked");
        setConfirmRevoke(false);
      },
      onError: (error) => toast.error(getErrorMessage(error)),
    });
  }, [revokeGrant]);

  return (
    <>
      <div className={cn(PM_ROW, "flex-col items-start gap-1 py-3")}>
        <div className="flex w-full items-center justify-between gap-2">
          <span className="text-sm font-medium">{name}</span>
          <div className="flex items-center gap-2">
            <Badge
              variant={grant.status === "ACTIVE" ? "default" : "secondary"}
              className="text-micro"
            >
              {grant.status.toLowerCase()}
            </Badge>
            {canManage && !isRevoked ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-muted-foreground hover:text-destructive"
                onClick={handleRevokeClick}
              >
                Revoke
              </Button>
            ) : null}
          </div>
        </div>
        {capabilities.length > 0 && (
          <p className="text-xs text-muted-foreground">
            Can view: {capabilities.join(", ")}
          </p>
        )}
        {grant.expiresAt && (
          <p className="text-xs text-muted-foreground">
            Expires {new Date(grant.expiresAt).toLocaleDateString()}
          </p>
        )}
      </div>
      <ConfirmDialog
        open={confirmRevoke}
        onOpenChange={setConfirmRevoke}
        title="Revoke portal access?"
        description="The client loses portal access immediately. The grant is kept as revoked with its history, and a new grant can be issued later."
        confirmLabel="Revoke"
        destructive
        isPending={revokeGrant.isPending}
        onConfirm={handleRevokeConfirm}
      />
    </>
  );
}
