"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, Loader2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Progress } from "@/components/ui/progress";
import { getErrorMessage } from "@/lib/get-error-message";
import { useCompleteSignSession, useSignPublicDocumentPreview } from "@/hooks/api/sign/public";
import type { SignPublicSession } from "@/types/sign";
import { PublicFieldOverlay } from "./public-field-overlay";
import { DeclineDialog } from "./decline-dialog";

const PdfCanvas = dynamic(() => import("../builder/pdf-canvas").then((m) => m.PdfCanvas), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-96">
      <Loader2 className="size-6 animate-spin text-muted-foreground" />
    </div>
  ),
});

export function SigningWorkspace({
  token,
  session,
  onCompleted,
}: {
  token: string;
  session: SignPublicSession;
  onCompleted: (everyoneDone: boolean) => void;
}) {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageCount, setPageCount] = useState(1);
  const [declineOpen, setDeclineOpen] = useState(false);
  const complete = useCompleteSignSession(token);

  const document = session.documents?.[0];
  const { data: preview } = useSignPublicDocumentPreview(token, document?.id);
  const fields = session.fields ?? [];

  const requiredFields = useMemo(() => fields.filter((f) => f.required), [fields]);
  const completedRequiredCount = requiredFields.filter((f) => f.completedAt).length;
  const allRequiredDone = requiredFields.length > 0 ? completedRequiredCount === requiredFields.length : true;
  const nextRequiredField = requiredFields.find((f) => !f.completedAt);

  const pageFields = fields.filter((f) => f.pageNumber === currentPage);

  async function handleFinish() {
    try {
      const result = await complete.mutateAsync();
      onCompleted(result.envelopeCompleted);
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  function handleJumpToNext() {
    if (nextRequiredField) setCurrentPage(nextRequiredField.pageNumber);
  }

  return (
    <div className="min-h-screen flex flex-col bg-muted/30">
      <div className="sticky top-0 z-10 bg-background border-b border-border p-3 space-y-2">
        <div className="flex items-center justify-between text-sm">
          <p className="font-medium truncate">{session.envelope?.title}</p>
          <p className="text-xs text-muted-foreground shrink-0">
            {completedRequiredCount}/{requiredFields.length} required fields
          </p>
        </div>
        <Progress value={requiredFields.length > 0 ? (completedRequiredCount / requiredFields.length) * 100 : 100} />
      </div>

      <div className="shrink-0 flex items-center justify-center gap-3 border-b border-border py-2 bg-background">
        <Button variant="ghost" size="icon" className="size-7" disabled={currentPage <= 1} onClick={() => setCurrentPage(currentPage - 1)}>
          <ChevronLeft className="size-4" />
        </Button>
        <span className="text-xs text-muted-foreground">
          Page {currentPage} of {pageCount}
        </span>
        <Button variant="ghost" size="icon" className="size-7" disabled={currentPage >= pageCount} onClick={() => setCurrentPage(currentPage + 1)}>
          <ChevronRight className="size-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-auto p-4 flex justify-center pb-28">
        {preview?.url && (
          <PdfCanvas
            fileUrl={preview.url}
            pageNumber={currentPage}
            onPageInfo={(info) => setPageCount(info.pageCount)}
            renderOverlay={(scale) => (
              <>
                {pageFields.map((field) => (
                  <PublicFieldOverlay key={field.id} token={token} field={field} scale={scale} isNextRequired={nextRequiredField?.id === field.id} />
                ))}
              </>
            )}
          />
        )}
      </div>

      <div className="fixed bottom-0 inset-x-0 bg-background border-t border-border p-3 flex items-center gap-2">
        {session.envelope && (
          <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={() => setDeclineOpen(true)}>
            <XCircle className="size-4" />
            Decline
          </Button>
        )}
        <div className="flex-1" />
        {allRequiredDone ? (
          <LoadingButton onClick={handleFinish} isPending={complete.isPending} loadingText="Finishing…">
            Finish signing
          </LoadingButton>
        ) : (
          <Button onClick={handleJumpToNext}>Next required field</Button>
        )}
      </div>

      <DeclineDialog token={token} open={declineOpen} onOpenChange={setDeclineOpen} />
    </div>
  );
}
