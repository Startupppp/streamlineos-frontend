"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ErrorReference } from "@/components/shared/error-reference";
import { SourceBadge } from "@/components/shared/source-badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { LoadingButton } from "@/components/ui/loading-button";
import { SemanticBadge } from "@/components/ui/semantic-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useCan } from "@/hooks/api/access";
import {
  useDocumentKbLink,
  usePublishDocumentToKb,
  useWithdrawDocumentFromKb,
  type DocumentKbLinkState,
} from "@/hooks/api/hr/document-kb-link";
import { getErrorMessage } from "@/lib/get-error-message";
import { companyDocumentHref } from "@/lib/knowledge-routes";

interface DocumentKbLinkPanelProps {
  documentId: number;
  documentName: string;
}

function audienceSummary(audiences: DocumentKbLinkState["documentAudiences"]): string {
  if (audiences.length === 0) return "nobody outside HR";
  if (audiences.some((audience) => audience.kind === "ALL_EMPLOYEES")) return "all employees";
  return audiences.map((audience) => audience.label ?? "a unit").join(", ");
}

/**
 * Where a document stands in the knowledge base, and the two actions that follow from it. Adding is offered only
 * when the document can be shared right now, and only to someone who may publish; the reasons it cannot are the
 * server's own list, the same one the server refuses on. Withdrawing takes effect on the readers' next request.
 */
export function DocumentKbLinkPanel({ documentId, documentName }: DocumentKbLinkPanelProps) {
  const canPublish = useCan("hr:documents:publish");
  const state = useDocumentKbLink(documentId);
  const publish = usePublishDocumentToKb();
  const withdraw = useWithdrawDocumentFromKb();
  const [confirming, setConfirming] = useState<"add" | "remove" | null>(null);
  const [failure, setFailure] = useState<unknown>(null);

  const handleAskAdd = useCallback(() => setConfirming("add"), []);
  const handleAskRemove = useCallback(() => setConfirming("remove"), []);
  const handleConfirmChange = useCallback((open: boolean) => { if (!open) setConfirming(null); }, []);

  const handleConfirmAdd = useCallback(async () => {
    setFailure(null);
    try {
      await publish.mutateAsync({ documentId });
      toast.success(`"${documentName}" is now in the Knowledge Base.`);
      setConfirming(null);
    } catch (error) {
      setFailure(error);
      setConfirming(null);
      toast.error(getErrorMessage(error));
    }
  }, [documentId, documentName, publish]);

  const handleConfirmRemove = useCallback(async () => {
    setFailure(null);
    try {
      await withdraw.mutateAsync(documentId);
      toast.success(`"${documentName}" was removed from the Knowledge Base.`);
      setConfirming(null);
    } catch (error) {
      setFailure(error);
      setConfirming(null);
      toast.error(getErrorMessage(error));
    }
  }, [documentId, documentName, withdraw]);

  if (state.isError)
    return (
      <Alert variant="destructive">
        <AlertTitle>Could not load the Knowledge Base status</AlertTitle>
        <AlertDescription>
          <p>{getErrorMessage(state.error)}</p>
          <ErrorReference error={state.error} className="mt-2 justify-start" />
        </AlertDescription>
      </Alert>
    );
  if (!state.data) return <Skeleton className="h-20 w-full" />;

  const { link, publishable, blockers, documentAudiences } = state.data;
  const live = link?.status === "active";

  return (
    <section aria-label="Knowledge Base" className="flex flex-col gap-3 rounded-md border border-border p-3">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-sm font-medium text-foreground">Knowledge Base</h3>
        <SourceBadge kind="hr-document" />
        {live ? <SemanticBadge tone="success" size="xs" label="Shared" /> : <SemanticBadge tone="neutral" size="xs" label="Not shared" />}
        {link?.newerVersionAvailable ? <SemanticBadge tone="info" size="xs" label="Newer version available" /> : null}
      </div>

      {live ? (
        <p className="text-sm text-muted-foreground">
          Visible to {audienceSummary(link.audiences)} in the Knowledge Base.{" "}
          <Link href={companyDocumentHref(link.id)} className="underline">See it there</Link>.
        </p>
      ) : link?.status === "unpublished" || link?.status === "source_removed" ? (
        <p className="text-sm text-muted-foreground">
          {link.unpublishReason === "source_no_longer_publishable"
            ? "This document was shared before, and taken down when it stopped being shareable."
            : "This document was shared before and has been withdrawn."}
        </p>
      ) : (
        <p className="text-sm text-muted-foreground">Employees cannot see this document in the Knowledge Base.</p>
      )}

      {!live && !publishable ? (
        <Alert>
          <AlertTitle>It cannot be shared yet</AlertTitle>
          <AlertDescription>
            <ul className="list-disc pl-4">
              {blockers.map((blocker) => (
                <li key={blocker.code}>{blocker.message}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      ) : null}
      {!live && publishable && documentAudiences.length === 0 ? (
        <Alert>
          <AlertTitle>Nobody would see it yet</AlertTitle>
          <AlertDescription>Choose who it is for above and save first, or it will be shared with HR only.</AlertDescription>
        </Alert>
      ) : null}
      {failure !== null ? (
        <Alert variant="destructive">
          <AlertTitle>Not done</AlertTitle>
          <AlertDescription>
            <p>{getErrorMessage(failure)}</p>
            <ErrorReference error={failure} className="mt-2 justify-start" />
          </AlertDescription>
        </Alert>
      ) : null}

      {canPublish ? (
        <div className="flex gap-2">
          {live ? (
            <LoadingButton type="button" variant="outline" isPending={withdraw.isPending} onClick={handleAskRemove}>
              Remove from Knowledge Base
            </LoadingButton>
          ) : (
            <LoadingButton type="button" isPending={publish.isPending} disabled={!publishable} onClick={handleAskAdd}>
              Add to Knowledge Base
            </LoadingButton>
          )}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">Adding or removing a document needs the permission to publish documents.</p>
      )}

      <ConfirmDialog
        open={confirming === "add"}
        onOpenChange={handleConfirmChange}
        title={`Add "${documentName}" to the Knowledge Base?`}
        description={`It will be visible to ${audienceSummary(documentAudiences)} as a company document.`}
        confirmLabel="Add to Knowledge Base"
        isPending={publish.isPending}
        keepOpenOnConfirm
        onConfirm={handleConfirmAdd}
      />
      <ConfirmDialog
        open={confirming === "remove"}
        onOpenChange={handleConfirmChange}
        title={`Remove "${documentName}" from the Knowledge Base?`}
        description="Employees stop seeing it on their next request. The HR document itself is not touched."
        confirmLabel="Remove"
        destructive
        isPending={withdraw.isPending}
        keepOpenOnConfirm
        onConfirm={handleConfirmRemove}
      />
    </section>
  );
}
