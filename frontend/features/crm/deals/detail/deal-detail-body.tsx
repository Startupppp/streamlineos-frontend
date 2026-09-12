"use client";

import { motion } from "framer-motion";
import { ChevronRight, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useMotionVariants } from "@/lib/motion-variants";
import { RecordDetail, asRecordValue } from "@/components/renderer";
import { dealRecordFields } from "@/lib/renderer/crm/deal-layout";
import { useDealLayout } from "@/features/crm/deals/use-deal-layout";
import { useOrgDisplay } from "@/hooks/api/org-display";
import type { Deal } from "@/types/crm";
import type { CrmPipelineStage } from "@/types/crm";
import type { DealMeeting } from "@/hooks/api/crm";
import type { DealSubmission } from "@/features/crm/deals/deal-form";
import { DealEditForm } from "./deal-edit-form";
import { DealSidebarCards } from "./deal-sidebar-cards";
import { DealForecastScoreCard } from "./deal-forecast-score-card";
import { DealLinkedRecordsCard } from "./deal-linked-records-card";
import { DealStageHistory } from "./deal-stage-history";
import { DealQuotesSection } from "@/features/crm/deals/deal-quotes-section";

interface DealDetailBodyProps {
  deal: Deal;
  dealId: number;
  stages: CrmPipelineStage[];
  currentStageIndex: number;
  currentStageColor?: string | null;
  isEditing: boolean;
  isUpdating: boolean;
  isCloning: boolean;
  meetings: DealMeeting[] | undefined;
  meetingsLoading: boolean;
  meetingsError: boolean;
  onStagePipelineClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
  onEditSubmit: (submission: DealSubmission) => void;
  onCancelEdit: () => void;
  onClone: () => void;
  onRetryMeetings: () => void;
  onQuickActionClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
  onAddMeeting: () => void;
  onDeleteMeeting: (meetingId: number) => void;
}

export function DealDetailBody({
  deal,
  dealId,
  stages,
  currentStageIndex,
  currentStageColor,
  isEditing,
  isUpdating,
  isCloning,
  meetings,
  meetingsLoading,
  meetingsError,
  onStagePipelineClick,
  onEditSubmit,
  onCancelEdit,
  onClone,
  onRetryMeetings,
  onQuickActionClick,
  onAddMeeting,
  onDeleteMeeting,
}: DealDetailBodyProps) {
  const { staggerContainer, fadeUp } = useMotionVariants();
  const layout = useDealLayout();
  const money = useOrgDisplay();

  const keyDates = [
    { label: "Created", value: deal.createdAt },
    { label: "Updated", value: deal.updatedAt },
    { label: "Expected Close", value: deal.expectedCloseDate },
    { label: "Actual Close", value: deal.actualCloseDate },
  ];

  return (
    <motion.div
      className="space-y-4"
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
    >
      <motion.div
        variants={fadeUp}
        className="flex flex-wrap items-center gap-1 p-2 rounded-lg bg-muted/30 border border-border"
      >
        {stages.map((stage, i) => {
          const isActive = stage.key === deal.stage;
          const isPast = i < currentStageIndex;
          return (
            <button
              key={stage.key}
              type="button"
              data-stage={stage.key}
              onClick={onStagePipelineClick}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap",
                isActive
                  ? "bg-primary/10 text-foreground ring-1 ring-primary/30"
                  : isPast
                    ? "bg-muted/50 text-muted-foreground"
                    : "text-muted-foreground/50 hover:text-muted-foreground hover:bg-muted/30",
              )}
              style={
                isActive && currentStageColor
                  ? {
                      backgroundColor: `${currentStageColor}15`,
                      color: currentStageColor,
                    }
                  : undefined
              }
            >
              {stage.label}
              {i < stages.length - 1 && (
                <ChevronRight className="h-3 w-3 ml-1 text-muted-foreground/30" />
              )}
            </button>
          );
        })}
      </motion.div>

      <div className="grid gap-4 lg:grid-cols-5">
        <motion.div variants={fadeUp} className="lg:col-span-3 space-y-4">
          {isEditing ? (
            <DealEditForm
              deal={deal}
              isPending={isUpdating}
              onSubmit={onEditSubmit}
              onCancel={onCancelEdit}
            />
          ) : (
            <>
              <RecordDetail
                layout={layout}
                record={asRecordValue(dealRecordFields(deal))}
                money={money}
                showTitle={false}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={onClone}
                disabled={isCloning}
                className="w-full"
              >
                <Copy className="h-3.5 w-3.5 mr-1.5" />
                Clone Deal
              </Button>
            </>
          )}
        </motion.div>

        <motion.div variants={fadeUp} className="lg:col-span-2 space-y-4">
          <DealSidebarCards
            dealId={dealId}
            dealName={deal.name}
            assignedTo={deal.assignedTo}
            lead={deal.lead}
            client={deal.client}
            keyDates={keyDates}
            meetings={meetings}
            meetingsLoading={meetingsLoading}
            meetingsError={meetingsError}
            onRetryMeetings={onRetryMeetings}
            onQuickActionClick={onQuickActionClick}
            onAddMeeting={onAddMeeting}
            onDeleteMeeting={onDeleteMeeting}
            healthScore={deal.healthScore}
            nextStep={deal.nextStep}
            pipelineId={deal.pipelineId}
          />
          <DealForecastScoreCard dealId={dealId} />
          <DealLinkedRecordsCard
            partyId={deal.partyId}
            subjectId={deal.subjectId}
          />
          <DealStageHistory dealId={dealId} card />
          <DealQuotesSection dealId={dealId} />
        </motion.div>
      </div>
    </motion.div>
  );
}
