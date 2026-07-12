"use client";

import { useCallback } from "react";
import { type UseFormReturn } from "react-hook-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useGenerateEmail } from "@/hooks/api/ai";
import { useEmailTemplates } from "@/hooks/api/crm-settings";
import { ACTION_BUTTONS, ActionToggleButton, DraftPanel } from "./lead-quick-action-buttons";
import { NotePanel, TaskPanel, EmailPanel, CallPanel } from "./lead-quick-action-forms";
import { type QuickAction, type NoteForm, type TaskForm, type EmailForm, type CallForm } from "./lead-types";

interface LeadQuickActionsProps {
  activeAction: QuickAction;
  onSetActiveAction: (action: QuickAction) => void;
  noteForm: UseFormReturn<NoteForm>;
  taskForm: UseFormReturn<TaskForm>;
  emailForm: UseFormReturn<EmailForm>;
  callForm: UseFormReturn<CallForm>;
  onNoteSubmit: (data: NoteForm) => void;
  onTaskSubmit: (data: TaskForm) => void;
  onEmailSubmit: (data: EmailForm) => void;
  onCallSubmit: (data: CallForm) => void;
  isNotePending: boolean;
  isTaskPending: boolean;
  isEmailPending: boolean;
  isCallPending: boolean;
  leadName?: string;
  leadEmail?: string;
  leadContext?: string;
  onDraftEmail?: (subject: string, body: string) => void;
}

export function LeadQuickActions({
  activeAction, onSetActiveAction,
  noteForm, taskForm, emailForm, callForm,
  onNoteSubmit, onTaskSubmit, onEmailSubmit, onCallSubmit,
  isNotePending, isTaskPending, isEmailPending, isCallPending,
  leadName, leadContext, onDraftEmail,
}: LeadQuickActionsProps) {
  const handleCancelAction = useCallback(() => onSetActiveAction(null), [onSetActiveAction]);
  const generateEmailMutation = useGenerateEmail();
  const { data: emailTemplates } = useEmailTemplates({ limit: 50 });

  const handleApplyTemplate = useCallback((templateId: string) => {
    const template = emailTemplates?.find((t) => String(t.id) === templateId);
    if (!template) return;
    emailForm.setValue("subject", template.subject.replace(/\{\{lead_name\}\}/gi, leadName ?? ""));
    emailForm.setValue("body", template.body.replace(/\{\{lead_name\}\}/gi, leadName ?? ""));
  }, [emailTemplates, leadName, emailForm]);

  const handleGenerateDraft = useCallback(() => {
    if (!leadName) return;
    generateEmailMutation.mutate(
      { leadName, context: leadContext, tone: "formal" },
      { onSuccess: (result) => onDraftEmail?.(result.subject, result.body) },
    );
  }, [leadName, leadContext, onDraftEmail, generateEmailMutation]);

  return (
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
          <NotePanel form={noteForm} onSubmit={onNoteSubmit} isPending={isNotePending} onCancel={handleCancelAction} />
        )}
        {activeAction === "task" && (
          <TaskPanel form={taskForm} onSubmit={onTaskSubmit} isPending={isTaskPending} onCancel={handleCancelAction} />
        )}
        {activeAction === "email" && (
          <EmailPanel
            form={emailForm}
            onSubmit={onEmailSubmit}
            isPending={isEmailPending}
            onCancel={handleCancelAction}
            emailTemplates={emailTemplates}
            onApplyTemplate={handleApplyTemplate}
          />
        )}
        {activeAction === "call" && (
          <CallPanel form={callForm} onSubmit={onCallSubmit} isPending={isCallPending} onCancel={handleCancelAction} />
        )}
      </CardContent>
    </Card>
  );
}
