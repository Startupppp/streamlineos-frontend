"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
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
  const [pending, setPending] = useState<HrTemplateStatus | null>(null);
  const transition = useTransitionHrTemplate();
  const actions = TRANSITIONS[template.status] ?? [];

  function handleTransition(to: HrTemplateStatus) {
    setPending(to);
    transition.mutate(
      { id: template.id, to },
      {
        onSuccess: () => toast.success(`Template moved to ${to}`),
        onError: (e) => toast.error(getErrorMessage(e)),
        onSettled: () => setPending(null),
      },
    );
  }

  if (actions.length === 0) return null;

  return (
    <div className="flex items-center gap-2">
      {actions.map((action) => (
        <AlertDialog key={action.to}>
          <AlertDialogTrigger asChild>
            <Button size="sm" variant={action.variant} disabled={transition.isPending}>
              {action.label}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{action.label}</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to move this template to <strong>{action.to}</strong>?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => handleTransition(action.to)}>
                Confirm
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      ))}
    </div>
  );
}
