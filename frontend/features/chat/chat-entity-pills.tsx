"use client";

import { memo, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Lock } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TruncatedText } from "@/components/ui/truncated-text";
import type { EntityCard, EntityRef } from "@/types/chat";
import { isApiError } from "@/lib/api-envelope";
import { getErrorMessage } from "@/lib/get-error-message";
import { useEntityAction } from "./entity-actions-context";
import {
  useLinkedRecordPreview,
  useSubmitEntityAction,
  type EntityReferenceInput,
} from "@/hooks/api/chat-entities";
import { getStatusBadgeClass } from "@/components/shared/ticket-status-badge";
import { useSourceOverride } from "@/hooks/common/use-source-override";
import { LINKED_RECORD_META } from "./linked-record-meta";

const TICKET_STATUSES = ["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"] as const;

const TICKET_STATUS_DISPLAY: Record<string, string> = {
  TODO: "Todo",
  IN_PROGRESS: "In Progress",
  IN_REVIEW: "In Review",
  DONE: "Done",
};

const PILL_CLASS =
  "inline-flex max-w-full items-center gap-1.5 rounded-lg border border-border bg-muted/50 px-2.5 py-1.5 my-1 text-dense";

interface PillDisplay {
  title: string | null;
  subtitle: string | null;
  href: string | null;
  status: string | null;
}

function describeEntity(entity: EntityRef, preview: EntityCard | undefined): PillDisplay {
  const card = entity.card ?? preview;
  if (entity.type !== "ticket")
    return {
      title: card?.title ?? null,
      subtitle: card?.subtitle ?? null,
      href: card?.href ?? null,
      status: card?.status ?? null,
    };
  const legacyKey =
    entity.projectKey && entity.ticketNumber ? `${entity.projectKey}-${entity.ticketNumber}` : null;
  const legacyHref = entity.projectId
    ? `/build/${entity.projectId}/issues?ticket=${entity.id}`
    : null;
  return {
    title: card?.title ?? entity.title ?? null,
    subtitle: card?.subtitle ?? legacyKey,
    href: card?.href ?? legacyHref,
    status: card?.status ?? entity.status ?? null,
  };
}

function statusChangeError(error: unknown): string {
  const code = isApiError(error) ? error.code : undefined;
  if (code === "CHAT_ACTION_FORBIDDEN") return "You don't have permission to change this ticket's status.";
  if (code === "PROJECTS_TICKET_NOT_FOUND") return "This ticket no longer exists.";
  if (code === "CHAT_ACTION_TICKET_STATUS_FAILED") return "This status change isn't allowed.";
  return getErrorMessage(error);
}

interface StatusMenuItemProps {
  status: (typeof TICKET_STATUSES)[number];
  isCurrent: boolean;
  onPick: (status: string) => void;
}

const StatusMenuItem = memo(function StatusMenuItem({ status, isCurrent, onPick }: StatusMenuItemProps) {
  const handleSelect = useCallback(() => onPick(status), [onPick, status]);
  return (
    <DropdownMenuItem onSelect={handleSelect} className={cn(isCurrent && "font-semibold")}>
      {TICKET_STATUS_DISPLAY[status]}
    </DropdownMenuItem>
  );
});

interface TicketStatusControlProps {
  reference: EntityReferenceInput;
  channelId: number;
  status: string;
}

function TicketStatusControl({ reference, channelId, status }: TicketStatusControlProps) {
  const canUpdate = Boolean(useEntityAction(reference, "status"));
  const submitEntityAction = useSubmitEntityAction();
  const [current, setCurrent] = useSourceOverride(status, status);
  const isPending = Boolean(submitEntityAction.isPending);
  const { mutateAsync } = submitEntityAction;

  const handleStatusChange = useCallback(
    async (next: string) => {
      const previous = current;
      setCurrent(next);
      try {
        await mutateAsync({ channelId, reference, actionId: "status", input: { status: next } });
      } catch (error) {
        setCurrent(previous);
        toast.error(statusChangeError(error));
      }
    },
    [current, setCurrent, mutateAsync, channelId, reference],
  );

  const label = TICKET_STATUS_DISPLAY[current] ?? current;
  const badgeClass = cn(
    "inline-flex items-center rounded px-1.5 py-px text-micro font-medium",
    getStatusBadgeClass(current),
  );

  if (!canUpdate) return <span className={badgeClass}>{label}</span>;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          disabled={isPending}
          className={cn(badgeClass, "cursor-pointer hover:opacity-80 transition-opacity duration-150 ease-out motion-reduce:transition-none")}
          aria-label="Change ticket status"
        >
          {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : label}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-36">
        {TICKET_STATUSES.map((option) => (
          <StatusMenuItem
            key={option}
            status={option}
            isCurrent={option === current}
            onPick={handleStatusChange}
          />
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

interface LinkedRecordPillProps {
  entity: EntityRef;
  channelId: number;
}

export function LinkedRecordPill({ entity, channelId }: LinkedRecordPillProps) {
  const router = useRouter();
  const preview = useLinkedRecordPreview(entity);
  const display = describeEntity(entity, preview);
  const meta = LINKED_RECORD_META[entity.type];
  const href = display.href;
  const reference = useMemo(() => ({ type: entity.type, id: entity.id }), [entity.type, entity.id]);

  const handleOpen = useCallback(() => {
    if (href) router.push(href);
  }, [router, href]);

  if (entity.card === null)
    return (
      <span className={cn(PILL_CLASS, "bg-muted/30 text-muted-foreground")}>
        <Lock className="h-3 w-3 shrink-0" aria-hidden />
        Restricted record
      </span>
    );

  const Icon = meta.icon;
  const label = display.title ?? meta.label;
  const body = (
    <>
      <Icon className="h-3 w-3 shrink-0 text-muted-foreground" aria-hidden />
      {display.subtitle && entity.type === "ticket" && (
        <span className="font-mono text-muted-foreground shrink-0">{display.subtitle}</span>
      )}
      <TruncatedText text={label} className="min-w-0 max-w-[200px] text-foreground/80" />
    </>
  );

  return (
    <span className={PILL_CLASS}>
      {href ? (
        <button
          type="button"
          onClick={handleOpen}
          aria-label={`Open ${meta.label.toLowerCase()} ${label}`}
          className="flex min-w-0 items-center gap-1.5 hover:text-foreground hover:underline"
        >
          {body}
        </button>
      ) : (
        <span className="flex min-w-0 items-center gap-1.5 text-muted-foreground">{body}</span>
      )}
      {entity.type === "ticket" && display.status && (
        <TicketStatusControl reference={reference} channelId={channelId} status={display.status} />
      )}
    </span>
  );
}
