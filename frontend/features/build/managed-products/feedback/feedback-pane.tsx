"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useFeedbucketSubmission, useUnmarkDuplicate } from "@/hooks/api/feedbucket/use-feedbucket-submissions";
import { useCan } from "@/hooks/api/access";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { ClassifySubmissionSheet } from "./classify-submission-sheet";
import { MarkDuplicateDialog } from "./mark-duplicate-dialog";
import { LinkToOpportunityDialog } from "./link-to-opportunity-dialog";

interface FeedbackPaneProps {
  submissionId: number;
  managedProductId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOpenDetail?: () => void;
}

function ConsentRow({ label, value }: { label: string; value: string | null | undefined }) {
  if (value == null) return null;
  return (
    <div className="flex items-start gap-2 text-sm">
      <span className="text-muted-foreground w-32 shrink-0">{label}</span>
      <span className="text-foreground break-all">{value}</span>
    </div>
  );
}

export function FeedbackPane({ submissionId, managedProductId, open, onOpenChange, onOpenDetail }: FeedbackPaneProps) {
  const canUpdate = useCan("feedbucket:submissions:update");
  const canManage = useCan("feedbucket:submissions:manage");
  const [classifyOpen, setClassifyOpen] = useState(false);
  const [duplicateOpen, setDuplicateOpen] = useState(false);
  const [linkOppOpen, setLinkOppOpen] = useState(false);

  const { data: submission, isLoading } = useFeedbucketSubmission(submissionId);
  const unmarkDuplicate = useUnmarkDuplicate();

  const handleUnmarkDuplicate = useCallback(() => {
    unmarkDuplicate.mutate(
      { submissionId },
      {
        onSuccess: () => { toast.success("Duplicate mark removed"); },
        onError: (err) => { toast.error(getErrorMessage(err)); },
      },
    );
  }, [submissionId, unmarkDuplicate]);

  const handleOpenClassify = useCallback(() => setClassifyOpen(true), []);
  const handleOpenDuplicate = useCallback(() => setDuplicateOpen(true), []);
  const handleOpenLinkOpp = useCallback(() => setLinkOppOpen(true), []);

  const consentDenied = submission?.consentStatus === "denied";

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="p-0 flex flex-col gap-0 sm:max-w-lg overflow-y-auto">
          <SheetHeader className="p-6 pb-3">
            <SheetTitle>Feedback</SheetTitle>
          </SheetHeader>
          {isLoading ? (
            <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground p-6">
              Loading…
            </div>
          ) : submission ? (
            <div className="flex flex-col gap-6 p-6 pt-2">
              <div>
                <p className="text-sm text-foreground whitespace-pre-wrap">{submission.message}</p>
              </div>
              <div className="flex flex-col gap-2">
                <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Provenance</h3>
                <ConsentRow label="Channel" value={submission.sourceChannel} />
                <ConsentRow label="Page URL" value={submission.pageUrl} />
                {!consentDenied && <ConsentRow label="Reporter" value={submission.reporterName ?? submission.reporterEmail} />}
                <ConsentRow label="Consent" value={submission.consentStatus} />
                {submission.consentRecordedAt && (
                  <ConsentRow label="Recorded at" value={new Date(submission.consentRecordedAt).toLocaleDateString()} />
                )}
              </div>
              <div className="flex flex-col gap-2">
                <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Classification</h3>
                <div className="flex flex-wrap gap-2">
                  {submission.theme && <Badge variant="secondary">{submission.theme}</Badge>}
                  {submission.segment && <Badge variant="outline">{submission.segment}</Badge>}
                  {submission.sentiment && <Badge variant="outline">{submission.sentiment}</Badge>}
                </div>
                {canUpdate && (
                  <Button type="button" variant="outline" size="sm" onClick={handleOpenClassify}>
                    Edit classification
                  </Button>
                )}
              </div>
              {(submission.duplicateOfId || submission.duplicateCount > 0) && (
                <div className="flex flex-col gap-2">
                  <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Duplicates</h3>
                  {submission.duplicateOfId && (
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-muted-foreground">Duplicate of</span>
                      <span className="font-mono">#{submission.duplicateOfId}</span>
                      {canUpdate && (
                        <Button type="button" variant="ghost" size="sm" onClick={handleUnmarkDuplicate}>
                          Unmark
                        </Button>
                      )}
                    </div>
                  )}
                  {submission.duplicateCount > 0 && (
                    <p className="text-sm text-muted-foreground">{submission.duplicateCount === 1 ? "1 duplicate references this" : `${submission.duplicateCount} duplicates reference this`}</p>
                  )}
                </div>
              )}
              {submission.opportunityIds && submission.opportunityIds.length > 0 && (
                <div className="flex flex-col gap-2">
                  <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Linked opportunities</h3>
                  {submission.opportunityIds.map((oppId) => (
                    <Link
                      key={oppId}
                      href={`/build/managed-products/${managedProductId}/insights?view=discovery&opportunity=${oppId}`}
                      className="text-sm text-primary hover:underline font-mono"
                    >
                      #{oppId}
                    </Link>
                  ))}
                </div>
              )}
              <div className="flex flex-wrap gap-2 pt-2">
                {canUpdate && !submission.duplicateOfId && (
                  <Button type="button" variant="outline" size="sm" onClick={handleOpenDuplicate}>
                    Mark duplicate
                  </Button>
                )}
                {canManage && (
                  <Button type="button" variant="outline" size="sm" onClick={handleOpenLinkOpp}>
                    Link to opportunity
                  </Button>
                )}
                {onOpenDetail && (
                  <Button type="button" variant="ghost" size="sm" onClick={onOpenDetail}>
                    Open full details
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground p-6">
              Submission not found.
            </div>
          )}
        </SheetContent>
      </Sheet>
      {submission && classifyOpen && (
        <ClassifySubmissionSheet
          submissionId={submissionId}
          currentTheme={submission.theme}
          currentSegment={submission.segment}
          currentSentiment={submission.sentiment}
          currentConsentStatus={submission.consentStatus}
          open={classifyOpen}
          onOpenChange={setClassifyOpen}
        />
      )}
      {duplicateOpen && (
        <MarkDuplicateDialog
          managedProductId={managedProductId}
          submissionId={submissionId}
          open={duplicateOpen}
          onOpenChange={setDuplicateOpen}
        />
      )}
      {linkOppOpen && (
        <LinkToOpportunityDialog
          managedProductId={managedProductId}
          submissionId={submissionId}
          open={linkOppOpen}
          onOpenChange={setLinkOppOpen}
        />
      )}
    </>
  );
}
