"use client";

import { use, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { ErrorState } from "@/components/shared/error-state";
import { useMotionVariants } from "@/lib/motion-variants";
import {
  useLeadDetail,
  useLeadTimeline,
  useUpdateLeadStatus,
} from "@/hooks/api/leads";
import { useCanState } from "@/hooks/api/access";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";

import { LeadInlineAiMenu } from "@/features/crm/shared/crm-inline-ai-menu";
import { LeadDetailHeader } from "@/features/crm/leads/detail/lead-detail-header";
import { LeadInfoCard } from "@/features/crm/leads/detail/lead-info-card";
import { LeadQuickActions } from "@/features/crm/leads/detail/lead-quick-actions";
import { LeadSidebar } from "@/features/crm/leads/detail/lead-sidebar";
import { LeadQualificationPanel } from "@/features/crm/leads/detail/lead-qualification-panel";
import { RecordConversation } from "@/components/record-conversation/record-conversation-slot";
import {
  type QuickAction,
  type PipelineStatus,
} from "@/features/crm/leads/detail/lead-types";

const NO_DRAFT = { subject: "", body: "" };

export default function LeadDetailPage({
  params,
}: {
  params: Promise<{ leadId: string }>;
}) {
  const { staggerContainer, fadeUp } = useMotionVariants();
  const { leadId: leadIdStr } = use(params);
  const leadId = Number(leadIdStr);

  const {
    data: lead,
    isLoading,
    isError: leadError,
    refetch: refetchLead,
  } = useLeadDetail(leadId);

  const handleRetry = useCallback(() => void refetchLead(), [refetchLead]);
  const { data: timeline, isLoading: timelineLoading } = useLeadTimeline(
    leadId,
    50,
  );

  const [isEditing, setIsEditing] = useState(false);
  const [activeAction, setActiveAction] = useState<QuickAction>(null);
  const [emailDraft, setEmailDraft] = useState(NO_DRAFT);

  const updateStatusMutation = useUpdateLeadStatus();
  const chatAccess = useCanState("chat:channels:read");

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

  const handleToggleEdit = useCallback(() => setIsEditing((prev) => !prev), []);
  const handleCancelEdit = useCallback(() => setIsEditing(false), []);

  const handleDraftEmail = useCallback((subject: string, body: string) => {
    setEmailDraft({ subject, body });
    setActiveAction("email");
  }, []);

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
      actions={
        <LeadInlineAiMenu
          leadId={leadId}
          leadName={lead.name}
          leadEmail={lead.email}
          onDraftEmail={handleDraftEmail}
        />
      }
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

        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            {chatAccess !== "denied" && (
              <TabsTrigger value="chat">Chat</TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="overview">
            <motion.div variants={fadeUp} className="grid gap-4 lg:grid-cols-5">
              <div className="lg:col-span-3 space-y-4">
                <LeadInfoCard
                  lead={lead}
                  entityId={leadId}
                  isEditing={isEditing}
                  onEditingDone={handleCancelEdit}
                />

                <LeadQuickActions
                  leadId={leadId}
                  activeAction={activeAction}
                  onSetActiveAction={setActiveAction}
                  leadName={lead.name}
                  leadEmail={lead.email ?? ""}
                  leadContext={[lead.status, lead.priority, lead.potentialValue]
                    .filter(Boolean)
                    .join(", ")}
                  emailDraftSubject={emailDraft.subject}
                  emailDraftBody={emailDraft.body}
                  onDraftEmail={handleDraftEmail}
                />
              </div>

              <div className="lg:col-span-2 space-y-4">
                <LeadSidebar
                  lead={lead}
                  timeline={timeline}
                  timelineLoading={timelineLoading}
                />
                <LeadQualificationPanel
                  leadId={leadId}
                  customData={lead.customData}
                />
              </div>
            </motion.div>
          </TabsContent>

          {chatAccess !== "denied" && (
            <TabsContent value="chat" className="flex flex-col min-h-[520px]">
              <RecordConversation
                entityType="lead"
                entityId={String(leadId)}
                emptyDescriptionWrite="This lead does not have an associated chat channel yet. Create one to start the conversation."
                emptyDescriptionReadOnly="This lead does not have an associated chat channel yet. Ask an admin to link one."
              />
            </TabsContent>
          )}
        </Tabs>
      </motion.div>
    </PageWrapper>
  );
}
