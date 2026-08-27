"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, ExternalLink, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ErrorState } from "@/components/shared/error-state";
import { EmptyState } from "@/components/ui/empty-state";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { getErrorMessage } from "@/lib/get-error-message";
import { useQueryParamOpen } from "@/hooks/common/use-query-param-open";
import { useDeleteSignEnvelope, useSignEnvelopes } from "@/hooks/api/sign/envelopes";
import { EnvelopeStatusBadge } from "../components/envelope-status-badge";
import { CreateEnvelopeDialog } from "../components/create-envelope-dialog";
import { EditEnvelopeSheet } from "../components/edit-envelope-sheet";
import type { SignEnvelope } from "@/types/sign";
import { TABLE_TITLE_CELL } from "@/lib/text-overflow";
import { TruncatedText } from "@/components/ui/truncated-text";
import { useCan } from "@/hooks/api/access";

const STATUS_FILTERS = [
  { value: "all", label: "All" },
  { value: "draft", label: "Draft" },
  { value: "sent", label: "Sent" },
  { value: "partially_completed", label: "Partially signed" },
  { value: "completed", label: "Completed" },
  { value: "voided", label: "Voided" },
  { value: "expired", label: "Expired" },
] as const;

const EDITABLE_STATUSES = new Set(["draft", "ready_to_send"]);

export function EnvelopeList() {
  const router = useRouter();
  const canCreateEnvelope = useCan("sign:envelope:create");
  const [status, setStatus] = useState<string>("all");
  const { open: createOpen, onOpenChange: setCreateOpen, setOpen: openCreate } = useQueryParamOpen("create");
  const [editEnvelope, setEditEnvelope] = useState<SignEnvelope | null>(null);
  const [deleteEnvelope, setDeleteEnvelope] = useState<SignEnvelope | null>(null);
  const { data: envelopes, isLoading, isError, refetch } = useSignEnvelopes(
    status === "all" ? undefined : { status },
  );
  const deleteMutation = useDeleteSignEnvelope();

  function handleCreateOpen() {
    openCreate();
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

  function makeEditHandler(envelope: SignEnvelope) {
    return function handleEditClick() {
      setEditEnvelope(envelope);
    };
  }

  function makeDeleteHandler(envelope: SignEnvelope) {
    return function handleDeleteClick() {
      setDeleteEnvelope(envelope);
    };
  }

  function handleEditOpenChange(open: boolean) {
    if (!open) setEditEnvelope(null);
  }

  function handleDeleteOpenChange(open: boolean) {
    if (!open) setDeleteEnvelope(null);
  }

  async function handleConfirmDelete() {
    if (!deleteEnvelope) return;
    try {
      await deleteMutation.mutateAsync(deleteEnvelope.id);
      toast.success("Envelope deleted");
      setDeleteEnvelope(null);
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  const activeFilter = STATUS_FILTERS.find((f) => f.value === status && status !== "all");

  const emptyState = activeFilter ? (
    <EmptyState
      illustrationPreset="search"
      title={`No ${activeFilter.label.toLowerCase()} envelopes`}
      description="Try a different status filter or clear it to see all."
      action={{ label: "Clear filter", onClick: () => setStatus("all") }}
      className="border-0 bg-transparent min-h-[40vh]"
    />
  ) : (
    <EmptyState
      illustrationPreset="upload"
      title="No envelopes yet"
      description="Upload a PDF and send it for signature to get started."
      action={canCreateEnvelope ? { label: "New envelope", onClick: handleCreateOpen } : undefined}
      className="border-0 bg-transparent min-h-[40vh]"
    />
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
      headerClassName: "w-12",
      cell: (envelope) => {
        const canEdit = EDITABLE_STATUSES.has(envelope.status);
        return (
          <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8"
                  aria-label={`Actions for ${envelope.title}`}
                >
                  <MoreHorizontal className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={makeOpenHandler(envelope.id)}>
                  <ExternalLink className="size-4" />
                  Open
                </DropdownMenuItem>
                {canEdit && (
                  <DropdownMenuItem onClick={makeEditHandler(envelope)}>
                    <Pencil className="size-4" />
                    Edit
                  </DropdownMenuItem>
                )}
                {canEdit && canCreateEnvelope && (
                  <DropdownMenuItem
                    variant="destructive"
                    onClick={makeDeleteHandler(envelope)}
                  >
                    <Trash2 className="size-4" />
                    Delete
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      },
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
      {editEnvelope && (
        <EditEnvelopeSheet
          envelope={editEnvelope}
          open
          onOpenChange={handleEditOpenChange}
        />
      )}
      <ConfirmDialog
        open={!!deleteEnvelope}
        onOpenChange={handleDeleteOpenChange}
        title="Delete envelope?"
        description={`This will permanently delete “${deleteEnvelope?.title ?? "this envelope"}”. This can’t be undone.`}
        confirmLabel="Delete"
        destructive
        isPending={deleteMutation.isPending}
        onConfirm={handleConfirmDelete}
      />
    </PageWrapper>
  );
}
