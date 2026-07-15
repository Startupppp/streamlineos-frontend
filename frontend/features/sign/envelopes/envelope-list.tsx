"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, ExternalLink } from "lucide-react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ErrorState } from "@/components/shared/error-state";
import { IllustrationImage } from "@/components/illustrations/illustration-image";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { useSignEnvelopes } from "@/hooks/api/sign/envelopes";
import { EnvelopeStatusBadge } from "../components/envelope-status-badge";
import { CreateEnvelopeDialog } from "../components/create-envelope-dialog";
import type { SignEnvelope } from "@/types/sign";
import { TABLE_TITLE_CELL, TEXT_ONE_LINE } from "@/lib/text-overflow";
import { cn } from "@/lib/utils";

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

  function makeOpenHandler(id: number) {
    return function handleOpenClick() {
      router.push(`/sign/envelopes/${id}`);
    };
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
      <Button onClick={handleCreateOpen}>
        <Plus className="size-4" />
        New envelope
      </Button>
    </div>
  );

  const columns: DataTableColumn<SignEnvelope>[] = [
    {
      key: "title",
      header: "Title",
      className: TABLE_TITLE_CELL,
      cell: (envelope) => (
        <span className={cn("font-medium", TEXT_ONE_LINE)} title={envelope.title}>
          {envelope.title}
        </span>
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
        <div onClick={(e) => e.stopPropagation()}>
          <Button
            variant="ghost"
            size="icon"
            className="size-8"
            aria-label="Open envelope"
            onClick={makeOpenHandler(envelope.id)}
          >
            <ExternalLink className="size-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <PageWrapper
      title="Envelopes"
      subtitle="Every signing request you've sent, organized by status"
      actions={
        <Button onClick={handleCreateOpen}>
          <Plus className="size-4" />
          New envelope
        </Button>
      }
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
