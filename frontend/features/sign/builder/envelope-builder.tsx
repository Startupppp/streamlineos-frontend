"use client";

import { useState } from "react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { cn } from "@/lib/utils";
import { usePageState } from "@/hooks/api/use-page-state";
import { useSignEnvelope } from "@/hooks/api/sign/envelopes";
import { useSignDocumentPreview } from "@/hooks/api/sign/documents";
import { BuilderProvider, useBuilder } from "./builder-context";
import { BuilderTopBar } from "./builder-top-bar";
import { BuilderLeftPanel } from "./builder-left-panel";
import { BuilderCanvasArea } from "./builder-canvas-area";
import { FieldSettingsPanel } from "./field-settings-panel";
import { AuditTrailSheet } from "./audit-trail-sheet";
import { EnvelopeBuilderSkeleton } from "./envelope-builder-skeleton";

const EDITABLE_STATUSES = new Set(["draft", "ready_to_send"]);

const BUILDER_PANES = [
  { value: "setup", label: "Setup" },
  { value: "document", label: "Document" },
  { value: "field", label: "Field" },
] as const;

type BuilderPane = (typeof BUILDER_PANES)[number]["value"];

function BuilderPaneButton({
  value,
  label,
  selected,
  onSelect,
}: {
  value: BuilderPane;
  label: string;
  selected: boolean;
  onSelect: (pane: BuilderPane) => void;
}) {
  function handleSelect() {
    onSelect(value);
  }

  return (
    <button
      type="button"
      role="tab"
      aria-selected={selected}
      onClick={handleSelect}
      className={cn(
        "h-9 min-w-0 flex-1 rounded-md px-2 text-sm font-medium",
        selected
          ? "bg-foreground text-background"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      {label}
    </button>
  );
}

function BuilderPaneSwitch({
  pane,
  onSelect,
}: {
  pane: BuilderPane;
  onSelect: (pane: BuilderPane) => void;
}) {
  return (
    <div
      className="flex shrink-0 gap-1 border-b border-border p-2 lg:hidden"
      role="tablist"
      aria-label="Builder sections"
    >
      {BUILDER_PANES.map((item) => (
        <BuilderPaneButton
          key={item.value}
          value={item.value}
          label={item.label}
          selected={pane === item.value}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}

function BuilderRightPanel({
  envelopeId,
  className,
}: {
  envelopeId: number;
  className?: string;
}) {
  const { selectedFieldId } = useBuilder();
  const { data } = useSignEnvelope(envelopeId);
  const field = data?.fields.find((f) => f.id === selectedFieldId);

  return (
    <div
      className={cn(
        "min-h-0 w-full flex-1 overflow-y-auto border-border p-4 lg:w-72 lg:flex-none lg:shrink-0 lg:border-l",
        className,
      )}
    >
      {field ? (
        <FieldSettingsPanel envelopeId={envelopeId} field={field} />
      ) : (
        <div className="text-sm text-muted-foreground">
          <p className="font-medium text-foreground mb-1">No field selected</p>
          <p>
            Click a field on the document to edit its settings, or place a new
            one from the Fields tab.
          </p>
        </div>
      )}
    </div>
  );
}

function BuilderContent({ envelopeId }: { envelopeId: number }) {
  const { data, isLoading, isError, error, refetch } =
    useSignEnvelope(envelopeId);
  const pageState = usePageState({
    permission: "sign:envelope:view",
    isLoading: (isLoading || data === undefined) && !isError,
    isError,
    error,
  });

  function handleRetry() {
    void refetch();
  }
  const [auditOpen, setAuditOpen] = useState(false);

  function handleShowAudit() {
    setAuditOpen(true);
  }

  const { selectedDocumentId } = useBuilder();
  const activeDocumentId = selectedDocumentId ?? data?.documents?.[0]?.id;
  const { data: preview } = useSignDocumentPreview(activeDocumentId);

  if (pageState.kind !== "ready" || !data)
    return (
      <PageWrapper
        title="Envelope"
        noInternalScroll
        state={pageState}
        onRetry={handleRetry}
        loading={<EnvelopeBuilderSkeleton />}
        contentClassName="flex min-h-0 flex-1 flex-col"
      >
        {null}
      </PageWrapper>
    );

  const editable = EDITABLE_STATUSES.has(data.envelope.status);
  const selectedDocument = data.documents.find(
    (d) => d.id === activeDocumentId,
  );

  return (
    <BuilderWorkspace
      envelopeId={envelopeId}
      data={data}
      previewUrl={preview?.url}
      selectedDocument={selectedDocument}
      editable={editable}
      auditOpen={auditOpen}
      onAuditOpenChange={setAuditOpen}
      onShowAudit={handleShowAudit}
    />
  );
}

function BuilderWorkspace({
  envelopeId,
  data,
  previewUrl,
  selectedDocument,
  editable,
  auditOpen,
  onAuditOpenChange,
  onShowAudit,
}: {
  envelopeId: number;
  data: NonNullable<ReturnType<typeof useSignEnvelope>["data"]>;
  previewUrl: string | undefined;
  selectedDocument:
    | NonNullable<
        ReturnType<typeof useSignEnvelope>["data"]
      >["documents"][number]
    | undefined;
  editable: boolean;
  auditOpen: boolean;
  onAuditOpenChange: (open: boolean) => void;
  onShowAudit: () => void;
}) {
  const [pane, setPane] = useState<BuilderPane>("document");

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden">
      <BuilderTopBar
        fields={data.fields}
        envelope={data.envelope}
        onShowAudit={onShowAudit}
        documents={data.documents}
        recipients={data.recipients}
      />
      <BuilderPaneSwitch pane={pane} onSelect={setPane} />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col lg:flex-row">
        <BuilderLeftPanel
          editable={editable}
          envelopeId={envelopeId}
          documents={data.documents}
          recipients={data.recipients}
          className={pane === "setup" ? undefined : "max-lg:hidden"}
        />
        <BuilderCanvasArea
          editable={editable}
          fields={data.fields}
          envelopeId={envelopeId}
          documentUrl={previewUrl}
          document={selectedDocument}
          recipients={data.recipients}
          className={pane === "document" ? undefined : "max-lg:hidden"}
        />
        <BuilderRightPanel
          envelopeId={envelopeId}
          className={pane === "field" ? undefined : "max-lg:hidden"}
        />
      </div>
      <AuditTrailSheet
        open={auditOpen}
        envelopeId={envelopeId}
        onOpenChange={onAuditOpenChange}
      />
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
