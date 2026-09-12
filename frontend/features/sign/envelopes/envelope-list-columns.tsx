"use client";

import { ExternalLink, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { DataTableColumn } from "@/components/ui/data-table";
import { TruncatedText } from "@/components/ui/truncated-text";
import { TABLE_TITLE_CELL } from "@/lib/text-overflow";
import { formatShortDate } from "@/lib/date-utils";
import { propagationShield } from "@/lib/keyboard-activation";
import { EnvelopeStatusBadge } from "../components/envelope-status-badge";
import type { SignEnvelope } from "@/types/sign";

const EDITABLE_STATUSES = new Set(["draft", "ready_to_send"]);

interface EnvelopeRowActionsProps {
  envelope: SignEnvelope;
  canDelete: boolean;
  onOpen: (envelope: SignEnvelope) => void;
  onEdit: (envelope: SignEnvelope) => void;
  onDelete: (envelope: SignEnvelope) => void;
}

function EnvelopeRowActions({ envelope, canDelete, onOpen, onEdit, onDelete }: EnvelopeRowActionsProps) {
  const canEdit = EDITABLE_STATUSES.has(envelope.status);

  function handleOpenClick() {
    onOpen(envelope);
  }

  function handleEditClick() {
    onEdit(envelope);
  }

  function handleDeleteClick() {
    onDelete(envelope);
  }

  return (
    <div className="flex justify-end" {...propagationShield}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="size-8" aria-label={`Actions for ${envelope.title}`}>
            <MoreHorizontal className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={handleOpenClick}>
            <ExternalLink className="size-4" />
            Open
          </DropdownMenuItem>
          {canEdit && (
            <DropdownMenuItem onClick={handleEditClick}>
              <Pencil className="size-4" />
              Edit
            </DropdownMenuItem>
          )}
          {canEdit && canDelete && (
            <DropdownMenuItem variant="destructive" onClick={handleDeleteClick}>
              <Trash2 className="size-4" />
              Delete
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

export function envelopeColumns(handlers: Omit<EnvelopeRowActionsProps, "envelope">): DataTableColumn<SignEnvelope>[] {
  return [
    {
      key: "title",
      header: "Title",
      className: TABLE_TITLE_CELL,
      cell: (envelope) => <TruncatedText text={envelope.title} className="font-medium" />,
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
        <span className="text-muted-foreground tabular-nums">{envelope.sentAt ? formatShortDate(envelope.sentAt) : "—"}</span>
      ),
    },
    {
      key: "expiresAt",
      header: "Expires",
      cell: (envelope) => (
        <span className="text-muted-foreground tabular-nums">
          {envelope.expiresAt ? formatShortDate(envelope.expiresAt) : "—"}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      headerClassName: "w-12",
      cell: (envelope) => <EnvelopeRowActions envelope={envelope} {...handlers} />,
    },
  ];
}
