"use client";

import { Fragment, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { getErrorMessage } from "@/lib/get-error-message";
import { useTransitionHrTemplate } from "@/hooks/api/hr/hr-templates";
import type { HrTemplateListItem, HrTemplateStatus } from "@/types/hr/templates";

const TRANSITIONS: Record<HrTemplateStatus, Array<{ to: HrTemplateStatus; label: string; variant: "default" | "outline" | "destructive" }>> = {
  draft: [{ to: "review", label: "Submit for Review", variant: "default" }],
  review: [
    { to: "approved", label: "Approve", variant: "default" },
    { to: "draft", label: "Send Back to Draft", variant: "outline" },
  ],
  approved: [
    { to: "active", label: "Activate", variant: "default" },
    { to: "draft", label: "Revert to Draft", variant: "outline" },
  ],
  active: [{ to: "archived", label: "Archive", variant: "destructive" }],
  archived: [],
};

interface TemplateLifecycleActionsProps {
  template: HrTemplateListItem;
}

export function TemplateLifecycleActions({ template }: TemplateLifecycleActionsProps) {
  const [confirmTarget, setConfirmTarget] = useState<HrTemplateStatus | null>(null);
  const transition = useTransitionHrTemplate();
  const actions = TRANSITIONS[template.status] ?? [];

  function handleTransition(to: HrTemplateStatus) {
    transition.mutate(
      { id: template.id, to },
      {
        onSuccess: () => {
          toast.success(`Template moved to ${to}`);
          setConfirmTarget(null);
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  }

  if (actions.length === 0) return null;

  return (
    <div className="flex items-center gap-2">
      {actions.map((action) => (
        <Fragment key={action.to}>
          <Button
            size="sm"
            variant={action.variant}
            disabled={transition.isPending}
            onClick={() => setConfirmTarget(action.to)}
          >
            {action.label}
          </Button>
          <ConfirmDialog
            open={confirmTarget === action.to}
            onOpenChange={(v) => !v && setConfirmTarget(null)}
            title={action.label}
            description={`Are you sure you want to move this template to ${action.to}?`}
            confirmLabel="Confirm"
            destructive={action.variant === "destructive"}
            isPending={transition.isPending}
            onConfirm={() => handleTransition(action.to)}
          />
        </Fragment>
      ))}
    </div>
  );
}
