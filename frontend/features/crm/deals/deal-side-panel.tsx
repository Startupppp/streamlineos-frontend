"use client";

import { useCallback } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  useDealDetail,
  useUpdateDeal,
} from "@/hooks/api/crm";
import { ActivityTimeline as UnifiedTimeline } from "@/components/timeline/activity-timeline";
import { DealStageHistory } from "./detail/deal-stage-history";
import { DealEditForm } from "./detail/deal-edit-form";
import { toUpdateInput, type DealSubmission } from "./deal-form";
import { TruncatedText } from "@/components/ui/truncated-text";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { ExternalLink } from "lucide-react";
import Link from "next/link";
import { useCrmStages } from "@/hooks/api/crm/metadata";
import { CrmStageBadge } from "@/features/crm/shared/metadata";
import { formatMoneyCompact } from "@/lib/format-utils";
import { useOrgDisplay } from "@/hooks/api/org-display";

interface DealSidePanelProps {
  dealId: number | null;
  onClose: () => void;
}

export function DealSidePanel({ dealId, onClose }: DealSidePanelProps) {
  const money = useOrgDisplay();
  const isOpen = dealId !== null;

  const { data: deal, isLoading: dealLoading } = useDealDetail(dealId ?? 0);
  const updateDeal = useUpdateDeal();
  const { data: dealStages = [] } = useCrmStages("deal");

  const stage = deal ? dealStages.find((s) => s.key === deal.stage) ?? null : null;

  const handleSave = useCallback(
    (submission: DealSubmission) => {
      if (!dealId) return;
      updateDeal.mutate(toUpdateInput(submission, dealId), {
        onSuccess: () => toast.success("Deal updated"),
        onError: (err) => toast.error(getErrorMessage(err)),
      });
    },
    [dealId, updateDeal],
  );

  const handleOpenChange = useCallback(
    (o: boolean) => {
      if (!o) onClose();
    },
    [onClose],
  );

  return (
    <Sheet open={isOpen} onOpenChange={handleOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-3xl p-0 flex flex-col"
      >
        {dealLoading ? (
          <div className="px-6 py-5 space-y-3">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-40 w-full" />
          </div>
        ) : deal ? (
          <>
            <SheetHeader className="px-6 pt-5 pb-4 border-b shrink-0">
              <div className="flex items-center justify-between">
                <div className="space-y-1 min-w-0">
                  <SheetTitle className="text-base">
                    <TruncatedText text={deal.name} />
                  </SheetTitle>
                  <div className="flex items-center gap-2">
                    {stage && <CrmStageBadge stage={stage} size="card" />}
                    <span className="text-sm font-semibold text-primary">
                      {formatMoneyCompact(deal.value, money)}
                    </span>
                  </div>
                </div>
                <Button variant="ghost" size="sm" asChild className="shrink-0">
                  <Link href={`/crm/deals/${deal.id}`} onClick={onClose}>
                    <ExternalLink className="h-4 w-4 mr-1" />
                    Full Page
                  </Link>
                </Button>
              </div>
            </SheetHeader>

            <div className="flex flex-1 min-h-0 divide-x">
              <ScrollArea className="flex-1 min-w-0">
                <div className="p-6">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">
                    Deal Details
                  </h3>
                  <DealEditForm
                    deal={deal}
                    onSubmit={handleSave}
                    onCancel={onClose}
                    isPending={updateDeal.isPending}
                  />
                </div>
              </ScrollArea>

              <Separator orientation="vertical" />

              <div className="w-72 shrink-0 flex flex-col min-h-0">
                <div className="px-4 pt-4 pb-3 border-b shrink-0">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Activity
                  </h3>
                </div>
                <ScrollArea className="flex-1">
                  <div className="flex flex-col gap-6 p-4">
                    <UnifiedTimeline
                      anchor={{ kind: "deal", dealId: String(deal.id) }}
                      emptyDescription="Calls, emails, meetings, notes and tasks on this deal will appear here as they happen."
                    />

                    <div className="flex flex-col gap-2">
                      <h4 className="text-dense font-medium uppercase tracking-wider text-muted-foreground">
                        Stage history
                      </h4>
                      <DealStageHistory dealId={deal.id} />
                    </div>
                  </div>
                </ScrollArea>
              </div>
            </div>
          </>
        ) : (
          <div className="p-6 text-sm text-muted-foreground">
            Deal not found.
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
