"use client";

import { useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useGenerateEmail } from "@/hooks/api/ai";
import { EmailComposeDialog } from "@/features/crm/shared/email-compose-dialog";
import { ACTION_BUTTONS, ActionToggleButton, DraftPanel } from "./lead-quick-action-buttons";
import { LeadNotePanel, LeadTaskPanel, LeadCallPanel } from "./lead-quick-action-forms";
import { type QuickAction } from "./lead-types";

interface LeadQuickActionsProps {
  leadId: number;
  activeAction: QuickAction;
  onSetActiveAction: (action: QuickAction) => void;
  leadName?: string;
  leadEmail?: string;
  leadContext?: string;
  emailDraftSubject: string;
  emailDraftBody: string;
  onDraftEmail?: (subject: string, body: string) => void;
}

/**
 * The lead's quick actions.
 *
 * Note, task and call compose through `RecordForm` over their own record type.
 * Email opens `EmailComposeDialog`, which is the product's email composer
 * everywhere else — a fifth form here would be a second way to send the same
 * message, which is the thing the shared composer exists to prevent.
 */
export function LeadQuickActions({
  leadId,
  activeAction,
  onSetActiveAction,
  leadName,
  leadEmail,
  leadContext,
  emailDraftSubject,
  emailDraftBody,
  onDraftEmail,
}: LeadQuickActionsProps) {
  const handleCancelAction = useCallback(() => onSetActiveAction(null), [onSetActiveAction]);
  const generateEmailMutation = useGenerateEmail();

  const handleGenerateDraft = useCallback(() => {
    if (!leadName) return;
    generateEmailMutation.mutate(
      { leadName, context: leadContext, tone: "formal" },
      { onSuccess: (result) => onDraftEmail?.(result.subject, result.body) },
    );
  }, [leadName, leadContext, onDraftEmail, generateEmailMutation]);

  const handleEmailOpenChange = useCallback(
    (open: boolean) => {
      if (!open) onSetActiveAction(null);
    },
    [onSetActiveAction],
  );

  return (
    <>
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {ACTION_BUTTONS.map((action) => (
              <ActionToggleButton
                key={action.key}
                action={action}
                isActive={activeAction === action.key}
                onSetActiveAction={onSetActiveAction}
              />
            ))}
          </div>

          {activeAction === "draft" && (
            <DraftPanel
              leadName={leadName}
              isPending={generateEmailMutation.isPending}
              onGenerate={handleGenerateDraft}
              onCancel={handleCancelAction}
            />
          )}
          {activeAction === "note" && (
            <LeadNotePanel leadId={leadId} onDone={handleCancelAction} />
          )}
          {activeAction === "task" && (
            <LeadTaskPanel leadId={leadId} onDone={handleCancelAction} />
          )}
          {activeAction === "call" && (
            <LeadCallPanel leadId={leadId} onDone={handleCancelAction} />
          )}
        </CardContent>
      </Card>

      <EmailComposeDialog
        open={activeAction === "email"}
        onOpenChange={handleEmailOpenChange}
        toEmail={leadEmail}
        defaultSubject={emailDraftSubject}
        defaultBody={emailDraftBody}
        entityType="LEAD"
        entityId={leadId}
      />
    </>
  );
}
