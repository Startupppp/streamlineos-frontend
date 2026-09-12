"use client";

import { useEffect, useState } from "react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/shared/error-state";
import { getErrorMessage } from "@/lib/get-error-message";
import { useSignEnvelope } from "@/hooks/api/sign/envelopes";
import { useSignDocumentPreview } from "@/hooks/api/sign/documents";
import { BuilderProvider, useBuilder } from "./builder-context";
import { BuilderTopBar } from "./builder-top-bar";
import { BuilderLeftPanel } from "./builder-left-panel";
import { BuilderCanvasArea } from "./builder-canvas-area";
import { FieldSettingsPanel } from "./field-settings-panel";
import { AuditTrailSheet } from "./audit-trail-sheet";

const EDITABLE_STATUSES = new Set(["draft", "ready_to_send"]);

function BuilderRightPanel({ envelopeId }: { envelopeId: number }) {
  const { selectedFieldId } = useBuilder();
  const { data } = useSignEnvelope(envelopeId);
  const field = data?.fields.find((f) => f.id === selectedFieldId);

  return (
    <div className="w-72 shrink-0 border-l border-border p-4 overflow-y-auto">
      {field ? (
        <FieldSettingsPanel envelopeId={envelopeId} field={field} />
      ) : (
        <div className="text-sm text-muted-foreground">
          <p className="font-medium text-foreground mb-1">No field selected</p>
          <p>Click a field on the document to edit its settings, or place a new one from the Fields tab.</p>
        </div>
      )}
    </div>
  );
}

function BuilderContent({ envelopeId }: { envelopeId: number }) {
  const { data, isLoading, isError, error, refetch } = useSignEnvelope(envelopeId);

  function handleRetry() {
    void refetch();
  }
  const [auditOpen, setAuditOpen] = useState(false);
  const { selectedDocumentId, setSelectedDocumentId } = useBuilder();

  useEffect(() => {
    if (!selectedDocumentId && data?.documents && data.documents.length > 0) {
      setSelectedDocumentId(data.documents[0].id);
    }
  }, [data?.documents, selectedDocumentId, setSelectedDocumentId]);

  // Derived, not effect-set, so the preview starts in the envelope's own render.
  const previewDocumentId = selectedDocumentId ?? data?.documents?.[0]?.id;
  const { data: preview } = useSignDocumentPreview(previewDocumentId ?? undefined);

  if (isError) {
    return (
      <PageWrapper title="Envelope" noInternalScroll>
        <ErrorState
          title="Failed to load this envelope"
          description={getErrorMessage(error)}
          onRetry={handleRetry}
        />
      </PageWrapper>
    );
  }

  if (isLoading || !data) {
    return (
      <PageWrapper title="Loading envelope…" noInternalScroll>
        <div className="p-6 space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      </PageWrapper>
    );
  }

  const editable = EDITABLE_STATUSES.has(data.envelope.status);
  const selectedDocument = data.documents.find((d) => d.id === selectedDocumentId);

  return (
    <div className="flex flex-col h-full min-h-0">
      <BuilderTopBar envelope={data.envelope} recipients={data.recipients} onShowAudit={() => setAuditOpen(true)} />
      <div className="flex flex-1 min-h-0">
        <BuilderLeftPanel envelopeId={envelopeId} documents={data.documents} recipients={data.recipients} editable={editable} />
        <BuilderCanvasArea
          envelopeId={envelopeId}
          document={selectedDocument}
          documentUrl={preview?.url}
          recipients={data.recipients}
          fields={data.fields}
          editable={editable}
        />
        <BuilderRightPanel envelopeId={envelopeId} />
      </div>
      <AuditTrailSheet envelopeId={envelopeId} open={auditOpen} onOpenChange={setAuditOpen} />
    </div>
  );
}

export function EnvelopeBuilder({ envelopeId }: { envelopeId: number }) {
  return (
    <BuilderProvider>
      <BuilderContent envelopeId={envelopeId} />
    </BuilderProvider>
  );
}
