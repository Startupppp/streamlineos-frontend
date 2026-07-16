"use client";

import { use, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Mail } from "lucide-react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { ErrorState } from "@/components/shared";
import { staggerContainer, fadeUp } from "@/lib/motion-variants";
import { useLeadDetail, useLeadTimeline, useUpdateLead, useUpdateLeadStatus, useLogLeadActivity } from "@/hooks/api/leads";
import { useCreateTask } from "@/hooks/api/tasks";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";

import { LeadAttachmentsSection } from "@/features/crm/leads/detail/lead-attachments-section";
import { LeadDetailHeader } from "@/features/crm/leads/detail/lead-detail-header";
import { LeadInfoCard } from "@/features/crm/leads/detail/lead-info-card";
import { LeadQuickActions } from "@/features/crm/leads/detail/lead-quick-actions";
import { LeadSidebar } from "@/features/crm/leads/detail/lead-sidebar";
import { LeadQualificationPanel } from "@/features/crm/leads/detail/lead-qualification-panel";
import {
  noteSchema,
  taskSchema,
  emailSchema,
  callSchema,
  editSchema,
  type QuickAction,
  type PipelineStatus,
  type NoteForm,
  type TaskForm,
  type EmailForm,
  type CallForm,
  type EditForm,
} from "@/features/crm/leads/detail/lead-types";

export default function LeadDetailPage({
  params,
}: {
  params: Promise<{ leadId: string }>;
}) {
  const { leadId: leadIdStr } = use(params);
  const leadId = Number(leadIdStr);

  const { data: lead, isLoading, isError: leadError, refetch: refetchLead } = useLeadDetail(leadId);

  const handleRetry = useCallback(() => void refetchLead(), [refetchLead]);
  const { data: timeline, isLoading: timelineLoading } = useLeadTimeline(
    leadId,
    50,
  );

  const [isEditing, setIsEditing] = useState(false);
  const [activeAction, setActiveAction] = useState<QuickAction>(null);

  const updateLeadMutation = useUpdateLead();
  const updateStatusMutation = useUpdateLeadStatus();
  const logActivityMutation = useLogLeadActivity();
  const createTaskMutation = useCreateTask();

  const editForm = useForm<EditForm>({
    resolver: zodResolver(editSchema),
    values: lead
      ? {
          name: lead.name,
          email: lead.email ?? "",
          phone: lead.phone ?? "",
          company: lead.company ?? "",
          city: lead.city ?? "",
          priority: lead.priority ?? "WARM",
          potentialValue: lead.potentialValue ?? "",
          investmentInterest: lead.investmentInterest ?? "",
          notes: lead.notes ?? "",
        }
      : undefined,
  });

  const noteForm = useForm<NoteForm>({ resolver: zodResolver(noteSchema) });
  const taskForm = useForm<TaskForm>({ resolver: zodResolver(taskSchema) });
  const emailForm = useForm<EmailForm>({
    resolver: zodResolver(emailSchema),
    defaultValues: { to: lead?.email ?? "" },
  });
  const callForm = useForm<CallForm>({ resolver: zodResolver(callSchema) });

  const handleStatusChange = useCallback(
    (status: PipelineStatus) => {
      const promise = updateStatusMutation.mutateAsync({
        leadId,
        status,
        expectedStatus: lead?.status,
      });
      toast.promise(promise, {
        loading: "Updating status...",
        success: "Status updated",
        error: (err: Error) => getErrorMessage(err),
      });
    },
    [leadId, updateStatusMutation, lead],
  );

  const onEditSubmit = useCallback(
    (data: EditForm) => {
      updateLeadMutation.mutate(
        { id: leadId, ...data },
        {
          onSuccess: () => {
            toast.success("Lead updated");
            setIsEditing(false);
          },
          onError: (err) => toast.error(getErrorMessage(err)),
        },
      );
    },
    [leadId, updateLeadMutation],
  );

  const onNoteSubmit = useCallback(
    (data: NoteForm) => {
      logActivityMutation.mutate(
        {
          leadId,
          type: "note",
          date: new Date().toISOString(),
          notes: data.body,
        },
        {
          onSuccess: () => {
            toast.success("Note added");
            setActiveAction(null);
            noteForm.reset();
          },
          onError: (err) => toast.error(getErrorMessage(err)),
        },
      );
    },
    [leadId, logActivityMutation, noteForm],
  );

  const onTaskSubmit = useCallback(
    (data: TaskForm) => {
      const dueDate = data.dueDate
        ? new Date(`${data.dueDate}T09:00:00`).toISOString()
        : undefined;

      createTaskMutation.mutate(
        {
          title: data.title,
          type: "CUSTOM",
          entityType: "LEAD",
          entityId: leadId,
          dueDate,
        },
        {
          onSuccess: () => {
            toast.success("Task created");
            setActiveAction(null);
            taskForm.reset();
          },
          onError: (err) => toast.error(getErrorMessage(err)),
        },
      );
    },
    [leadId, createTaskMutation, taskForm],
  );

  const onEmailSubmit = useCallback(
    (data: EmailForm) => {
      logActivityMutation.mutate(
        {
          leadId,
          type: "email",
          date: new Date().toISOString(),
          subject: data.subject,
          notes: `To: ${data.to}\n\n${data.body}`,
        },
        {
          onSuccess: () => {
            toast.success("Email sent");
            setActiveAction(null);
          },
          onError: (err) => toast.error(getErrorMessage(err)),
        },
      );
    },
    [leadId, logActivityMutation],
  );

  const handleToggleEdit = useCallback(() => setIsEditing((prev) => !prev), []);
  const handleCancelEdit = useCallback(() => setIsEditing(false), []);

  const handleDraftEmail = useCallback(
    (subject: string, body: string) => {
      emailForm.setValue("subject", subject);
      emailForm.setValue("body", body);
      emailForm.setValue("to", lead?.email ?? "");
      setActiveAction("email");
    },
    [emailForm, lead?.email],
  );

  const onCallSubmit = useCallback(
    (data: CallForm) => {
      logActivityMutation.mutate(
        {
          leadId,
          type: "call",
          date: new Date().toISOString(),
          subject: data.subject || undefined,
          duration: data.duration ? Number(data.duration) : undefined,
          outcome: data.outcome || undefined,
          notes: data.notes || undefined,
        },
        {
          onSuccess: () => {
            toast.success("Call logged");
            setActiveAction(null);
            callForm.reset();
          },
          onError: (err) => toast.error(getErrorMessage(err)),
        },
      );
    },
    [leadId, logActivityMutation, callForm],
  );

  if (isLoading) {
    return (
      <PageWrapper title="Lead" backHref="/crm/leads">
        <div className="space-y-4">
          <Skeleton className="h-[72px] w-full rounded-lg" />
          <div className="grid gap-4 lg:grid-cols-5">
            <div className="lg:col-span-3 space-y-4">
              <Skeleton className="h-48 w-full rounded-lg" />
              <Skeleton className="h-32 w-full rounded-lg" />
            </div>
            <div className="lg:col-span-2 space-y-4">
              <Skeleton className="h-32 w-full rounded-lg" />
              <Skeleton className="h-24 w-full rounded-lg" />
            </div>
          </div>
        </div>
      </PageWrapper>
    );
  }

  if (leadError) {
    return (
      <PageWrapper title="Lead" backHref="/crm/leads">
        <ErrorState
          title="Failed to load lead"
          description="There was an error loading this lead. Please try again."
          onRetry={handleRetry}
          className="flex-1"
        />
      </PageWrapper>
    );
  }

  if (!lead) {
    return (
      <PageWrapper title="Lead" backHref="/crm/leads">
        <ErrorState
          title="Lead not found"
          description="This lead may have been deleted or you may not have access to it."
          className="flex-1"
        />
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title={lead.name}
      backHref="/crm/leads"
    >
      <motion.div
        className="space-y-4"
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
      >
        <motion.div variants={fadeUp}>
          <LeadDetailHeader
            lead={lead}
            isEditing={isEditing}
            onToggleEdit={handleToggleEdit}
            onStatusChange={handleStatusChange}
            isStatusPending={updateStatusMutation.isPending}
          />
        </motion.div>

        <motion.div variants={fadeUp} className="grid gap-4 lg:grid-cols-5">
          <div className="lg:col-span-3 space-y-4">
            <LeadInfoCard
              lead={lead}
              entityId={leadId}
              isEditing={isEditing}
              editForm={editForm}
              isUpdatePending={updateLeadMutation.isPending}
              onEditSubmit={onEditSubmit}
              onCancelEdit={handleCancelEdit}
            />

            <LeadQuickActions
              activeAction={activeAction}
              onSetActiveAction={setActiveAction}
              noteForm={noteForm}
              taskForm={taskForm}
              emailForm={emailForm}
              callForm={callForm}
              onNoteSubmit={onNoteSubmit}
              onTaskSubmit={onTaskSubmit}
              onEmailSubmit={onEmailSubmit}
              onCallSubmit={onCallSubmit}
              isNotePending={logActivityMutation.isPending}
              isTaskPending={createTaskMutation.isPending}
              isEmailPending={logActivityMutation.isPending}
              isCallPending={logActivityMutation.isPending}
              leadName={lead.name}
              leadEmail={lead.email ?? ""}
              leadContext={[lead.status, lead.priority, lead.potentialValue]
                .filter(Boolean)
                .join(", ")}
              onDraftEmail={handleDraftEmail}
            />
          </div>

          <div className="lg:col-span-2 space-y-4">
            <LeadSidebar
              lead={lead}
              timeline={timeline}
              timelineLoading={timelineLoading}
            />
            <Card className="bg-amber-50/80 dark:bg-amber-500/10 border-amber-200/60 dark:border-amber-500/30 shadow-sm">
              <CardContent className="flex items-start gap-3 p-4">
                <Mail className="h-4 w-4 text-amber-500 dark:text-amber-400 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-amber-800 dark:text-amber-300">Connect your email</p>
                  <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-0.5">
                    Connect your email to view email threads with this lead.
                  </p>
                  <Link
                    href="/settings/connected-accounts"
                    className="text-[11px] font-medium text-amber-700 dark:text-amber-300 underline underline-offset-2 hover:text-amber-900 dark:hover:text-amber-200 mt-1 inline-block"
                  >
                    Go to Settings →
                  </Link>
                </div>
              </CardContent>
            </Card>
            <Card className="shadow-sm">
              <CardContent className="p-4">
                <LeadAttachmentsSection leadId={leadId} />
              </CardContent>
            </Card>
            <LeadQualificationPanel
              leadId={leadId}
              qualificationJson={lead.qualificationNotes ?? null}
            />
          </div>
        </motion.div>
      </motion.div>
    </PageWrapper>
  );
}
