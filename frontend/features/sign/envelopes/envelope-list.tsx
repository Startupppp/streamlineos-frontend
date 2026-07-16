"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ExternalLinkIcon, PlusIcon } from "@animateicons/react/lucide";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ErrorState } from "@/components/shared/error-state";
import { IllustrationImage } from "@/components/illustrations/illustration-image";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { useSignEnvelopes } from "@/hooks/api/sign/envelopes";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import { EnvelopeStatusBadge } from "../components/envelope-status-badge";
import { CreateEnvelopeDialog } from "../components/create-envelope-dialog";
import type { SignEnvelope } from "@/types/sign";
import { TABLE_TITLE_CELL } from "@/lib/text-overflow";
import { cn } from "@/lib/utils";
import { TruncatedText } from "@/components/ui/truncated-text";

function EnvelopeOpenButton({ id, onNavigate }: { id: number; onNavigate: (id: number) => void }) {
  const { iconRef, hoverHandlers } = useAnimatedIcon();

  function handleClick(e: React.MouseEvent) {
    e.stopPropagation();
    onNavigate(id);
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      className="size-8"
      aria-label="Open envelope"
      onClick={handleClick}
      {...hoverHandlers}
    >
      <ExternalLinkIcon ref={iconRef} className="size-4" />
    </Button>
  );
}

function NewEnvelopeButton({ onClick }: { onClick: () => void }) {
  const { iconRef, hoverHandlers } = useAnimatedIcon();
  return (
    <Button onClick={onClick} {...hoverHandlers}>
      <PlusIcon ref={iconRef} className="size-4" />
      New envelope
    </Button>
  );
}

const STATUS_FILTERS = [
  { value: "all", label: "All" },
  { value: "draft", label: "Draft" },
  { value: "sent", label: "Sent" },
  { value: "partially_completed", label: "Partially signed" },
  { value: "completed", label: "Completed" },
  { value: "voided", label: "Voided" },
  { value: "expired", label: "Expired" },
] as const;

export function EnvelopeList() {
  const router = useRouter();
  const [status, setStatus] = useState<string>("all");
  const [createOpen, setCreateOpen] = useState(false);
  const { data: envelopes, isLoading, isError, refetch } = useSignEnvelopes(
    status === "all" ? undefined : { status },
  );

  function handleCreateOpen() {
    setCreateOpen(true);
  }

  function handleRetry() {
    void refetch();
  }

  function handleRowClick(envelope: SignEnvelope) {
    router.push(`/sign/envelopes/${envelope.id}`);
  }

  function handleRowNavigate(id: number) {
    router.push(`/sign/envelopes/${id}`);
  }

  const emptyState = (
    <div className="flex flex-1 h-full flex-col items-center justify-center gap-4 text-center">
      <IllustrationImage name="empty-upload" className="h-40 w-40" />
      <div>
        <p className="font-medium text-foreground">No envelopes yet</p>
        <p className="text-sm text-muted-foreground mt-1">
          Upload a PDF and send it for signature to get started.
        </p>
      </div>
      <NewEnvelopeButton onClick={handleCreateOpen} />
    </div>
  );

  const columns: DataTableColumn<SignEnvelope>[] = [
    {
      key: "title",
      header: "Title",
      className: TABLE_TITLE_CELL,
      cell: (envelope) => (
        <TruncatedText text={envelope.title} className="font-medium" />
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (envelope) => <EnvelopeStatusBadge status={envelope.status} />,
    },
    {
      key: "sentAt",
      header: "Sent",
      cell: (envelope) => (
        <span className="text-muted-foreground">
          {envelope.sentAt ? new Date(envelope.sentAt).toLocaleDateString() : "—"}
        </span>
      ),
    },
    {
      key: "expiresAt",
      header: "Expires",
      cell: (envelope) => (
        <span className="text-muted-foreground">
          {envelope.expiresAt ? new Date(envelope.expiresAt).toLocaleDateString() : "—"}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      headerClassName: "w-10",
      cell: (envelope) => (
        <EnvelopeOpenButton id={envelope.id} onNavigate={handleRowNavigate} />
      ),
    },
  ];

  return (
    <PageWrapper
      title="Envelopes"
      subtitle="Every signing request you've sent, organized by status"
      actions={<NewEnvelopeButton onClick={handleCreateOpen} />}
    >
      <div className="flex min-h-0 flex-1 flex-col gap-4">
        <Tabs value={status} onValueChange={setStatus}>
          <TabsList>
            {STATUS_FILTERS.map((f) => (
              <TabsTrigger key={f.value} value={f.value}>
                {f.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {isError ? (
          <ErrorState title="Failed to load envelopes" onRetry={handleRetry} />
        ) : (
          <DataTable
            className="flex-1 min-h-0"
            data={envelopes ?? []}
            columns={columns}
            getRowKey={(envelope) => envelope.id}
            isLoading={isLoading}
            emptyState={emptyState}
            onRowClick={handleRowClick}
          />
        )}
      </div>

      <CreateEnvelopeDialog open={createOpen} onOpenChange={setCreateOpen} />
    </PageWrapper>
  );
}
