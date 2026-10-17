"use client";

import { useCallback, useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { LoadingButton } from "@/components/ui/loading-button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useCan } from "@/hooks/api/access";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  TABS_CONTENT_PAGE_BODY_CLASS,
} from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { FileText, StickyNote } from "lucide-react";
import { ErrorState } from "@/components/shared/error-state";
import { EmptyState } from "@/components/ui/empty-state";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import {
  useHrCase,
  useStartInvestigation,
  useUpdateCase,
} from "@/hooks/api/hr/cases";
import { CaseStatusBadge, CaseSeverityBadge, CaseCategoryLabel } from "./case-badges";
import { NoteThread, DocumentsList } from "./case-note-thread";
import { formatDistanceToNow } from "date-fns";

interface Props {
  caseId: number;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

const CASE_DETAIL_TABS = ["details", "notes", "documents"] as const;

export function CaseDetailSheet({ caseId, open, onOpenChange }: Props) {
  const { data: hrCase, isLoading, isError, error, refetch } = useHrCase(caseId);
  const startInvestigation = useStartInvestigation(caseId);
  const updateCase = useUpdateCase(caseId);
  // Both transitions hit hr:cases:manage endpoints (hr-cases.controller.ts).
  const canManage = useCan("hr:cases:manage");
  const [activeTab, setActiveTab] = useState<"details" | "notes" | "documents">("details");

  const handleRetry = useCallback(() => {
    void refetch();
  }, [refetch]);

  function handleStartInvestigation() {
    startInvestigation.mutate(undefined, {
      onError: (err) => toast.error(getErrorMessage(err)),
    });
  }

  function handleMarkResolved() {
    updateCase.mutate({ status: "resolved" }, {
      onError: (err) => toast.error(getErrorMessage(err)),
    });
  }

  function handleTabChange(v: string) {
    const tab = CASE_DETAIL_TABS.find((candidate) => candidate === v);
    if (tab) setActiveTab(tab);
  }

  if (!open) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex flex-col p-0 gap-0 sm:max-w-xl w-full">
        <SheetHeader className="shrink-0 px-5 pt-5 pb-4 border-b">
          {isLoading ? (
            <SheetTitle>Loading...</SheetTitle>
          ) : !hrCase ? (
            <SheetTitle>Case</SheetTitle>
          ) : (
            <>
              <div className="flex items-center gap-2 flex-wrap">
                <SheetTitle className="text-base font-semibold font-mono">
                  {hrCase.caseNumber}
                </SheetTitle>
                <CaseStatusBadge status={hrCase.status} />
                <CaseSeverityBadge severity={hrCase.severity} />
                {hrCase.anonymous && (
                  <Badge variant="outline" className="text-xs text-muted-foreground">Anonymous</Badge>
                )}
              </div>
              <SheetDescription className="text-sm text-foreground mt-1 font-medium">
                {hrCase.summary}
              </SheetDescription>
              <p className="text-xs text-muted-foreground">
                <CaseCategoryLabel category={hrCase.category} />
                {" · "}
                {formatDistanceToNow(new Date(hrCase.createdAt), { addSuffix: true })}
              </p>
            </>
          )}
        </SheetHeader>

        {isError ? (
          <div className="flex flex-1 min-h-0 flex-col px-5 py-4">
            <ErrorState
              className="flex-1"
              title="Couldn't load case"
              description={getErrorMessage(error)}
              onRetry={handleRetry}
            />
          </div>
        ) : null}

        {!isLoading && !isError && !hrCase ? (
          <div className="flex flex-1 min-h-0 flex-col px-5 py-4">
            <EmptyState
              className="flex-1"
              illustrationPreset="ticket"
              title="Case not found"
              description="This case no longer exists or you no longer have access to it."
            />
          </div>
        ) : null}

        {hrCase && (
          <Tabs
            value={activeTab}
            onValueChange={handleTabChange}
            className="flex flex-1 min-h-0 flex-col"
          >
            <TabsList className="mx-5 mt-3">
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="notes">
                <StickyNote className="h-3 w-3" />
                Notes
              </TabsTrigger>
              <TabsTrigger value="documents">
                <FileText className="h-3 w-3" />
                Documents
              </TabsTrigger>
            </TabsList>

            <ScrollArea className="flex-1 min-h-0">
              <div className="px-5 py-4">
                <TabsContent value="details" className={cn(TABS_CONTENT_PAGE_BODY_CLASS, "space-y-4")}>
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                      Details
                    </p>
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{hrCase.details}</p>
                  </div>

                  {hrCase.outcome && (
                    <>
                      <Separator />
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                          Outcome
                        </p>
                        <p className="text-sm leading-relaxed whitespace-pre-wrap">{hrCase.outcome}</p>
                      </div>
                    </>
                  )}

                  <Separator />

                  <div className="flex flex-wrap gap-3">
                    {canManage && hrCase.status === "open" && (
                      <LoadingButton
                        size="sm"
                        variant="outline"
                        isPending={startInvestigation.isPending}
                        onClick={handleStartInvestigation}
                      >
                        Start Investigation
                      </LoadingButton>
                    )}
                    {canManage && hrCase.status === "under_investigation" && (
                      <ConfirmDialog
                        trigger={
                          <LoadingButton
                            size="sm"
                            variant="outline"
                            isPending={updateCase.isPending}
                          >
                            Mark Resolved
                          </LoadingButton>
                        }
                        title={`Resolve ${hrCase.caseNumber}?`}
                        description="The case closes as resolved and leaves the open queue."
                        confirmLabel="Mark resolved"
                        isPending={updateCase.isPending}
                        onConfirm={handleMarkResolved}
                      />
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="notes" className={TABS_CONTENT_PAGE_BODY_CLASS}>
                  <NoteThread caseId={caseId} />
                </TabsContent>
                <TabsContent value="documents" className={TABS_CONTENT_PAGE_BODY_CLASS}>
                  <DocumentsList caseId={caseId} />
                </TabsContent>
              </div>
            </ScrollArea>
          </Tabs>
        )}
      </SheetContent>
    </Sheet>
  );
}
