"use client";

import { useState, useCallback, type ChangeEvent } from "react";
import { ChevronDown, Boxes, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { getErrorMessage } from "@/lib/get-error-message";
import {
  useSupportTicketExternalLinks,
  useAddExternalLink,
  useRemoveExternalLink,
  type ExternalEntityType,
  type SupportTicketExternalLink,
} from "@/hooks/api/support/external-links";

const ENTITY_TYPES: { value: ExternalEntityType; label: string }[] = [
  { value: "project", label: "Project" },
  { value: "invoice", label: "Invoice" },
  { value: "calendar_event", label: "Calendar Event" },
  { value: "chat_channel", label: "Chat Channel" },
];

function entityTypeLabel(type: ExternalEntityType): string {
  return ENTITY_TYPES.find((t) => t.value === type)?.label ?? type;
}

interface ExternalLinkRowProps {
  link: SupportTicketExternalLink;
  onRemove: (linkId: number) => void;
}

function ExternalLinkRow({ link, onRemove }: ExternalLinkRowProps) {
  const handleRemove = useCallback(() => onRemove(link.id), [link.id, onRemove]);
  return (
    <li className="flex items-center gap-1.5 text-[12px]">
      <Badge variant="outline" className="text-[9px] px-1 py-0">
        {entityTypeLabel(link.entityType)}
      </Badge>
      <span className="truncate flex-1">{link.label}</span>
      <button
        type="button"
        onClick={handleRemove}
        aria-label={`Remove link to ${link.label}`}
        className="text-muted-foreground hover:text-foreground shrink-0"
      >
        <X className="h-2.5 w-2.5" />
      </button>
    </li>
  );
}

interface TicketExternalLinksSectionProps {
  ticketId: number;
}

export function TicketExternalLinksSection({ ticketId }: TicketExternalLinksSectionProps) {
  const [open, setOpen] = useState(false);
  const [entityType, setEntityType] = useState<ExternalEntityType>("project");
  const [entityId, setEntityId] = useState("");

  const { data: links } = useSupportTicketExternalLinks(ticketId);
  const addLink = useAddExternalLink();
  const removeLink = useRemoveExternalLink();

  const handleToggle = useCallback(() => setOpen((v) => !v), []);
  const handleEntityTypeChange = useCallback((v: string) => setEntityType(v as ExternalEntityType), []);
  const handleEntityIdChange = useCallback((e: ChangeEvent<HTMLInputElement>) => setEntityId(e.target.value), []);

  const handleAdd = useCallback(() => {
    const parsed = Number(entityId);
    if (!parsed || parsed <= 0) {
      toast.error("Enter a valid ID");
      return;
    }
    addLink.mutate(
      { ticketId, entityType, entityId: parsed },
      {
        onSuccess: () => {
          setEntityId("");
          toast.success("Linked");
        },
        onError: (err) => toast.error(getErrorMessage(err)),
      },
    );
  }, [entityId, entityType, ticketId, addLink]);

  const handleRemove = useCallback(
    (linkId: number) => {
      removeLink.mutate(
        { ticketId, linkId },
        { onError: (err) => toast.error(getErrorMessage(err)) },
      );
    },
    [ticketId, removeLink],
  );

  return (
    <div className="px-4 py-2 border-t border-border/40 shrink-0">
      <button
        type="button"
        onClick={handleToggle}
        className="flex items-center gap-1.5 w-full text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground hover:text-foreground transition-colors"
      >
        <Boxes className="h-3.5 w-3.5 shrink-0" />
        Linked Items
        <ChevronDown className={cn("h-3.5 w-3.5 ml-auto transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="mt-2 space-y-2 pb-1">
          {(links ?? []).length > 0 && (
            <ul className="space-y-1">
              {(links ?? []).map((link) => (
                <ExternalLinkRow key={link.id} link={link} onRemove={handleRemove} />
              ))}
            </ul>
          )}
          <div className="flex items-center gap-2">
            <Select value={entityType} onValueChange={handleEntityTypeChange}>
              <SelectTrigger className="h-7 text-xs w-[130px] shrink-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ENTITY_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              value={entityId}
              onChange={handleEntityIdChange}
              placeholder="ID"
              className="h-7 text-xs w-20"
              inputMode="numeric"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 text-xs shrink-0"
              disabled={addLink.isPending}
              onClick={handleAdd}
            >
              Link
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
