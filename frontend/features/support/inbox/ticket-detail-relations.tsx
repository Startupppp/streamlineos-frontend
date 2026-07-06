"use client";

import { useState, useCallback } from "react";
import { ChevronDown, Tag as TagIcon, Link2, GitMerge, X, Plus } from "lucide-react";
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
import { useSupportTags, useTicketTags, useAttachTag, useDetachTag } from "@/hooks/api/support/tags";
import {
  useSupportTicketLinks,
  useAddTicketLink,
  useMergeTicket,
  type TicketLinkRelation,
} from "@/hooks/api/support/links";

interface TicketDetailRelationsProps {
  ticketId: number;
}

export function TicketDetailRelations({ ticketId }: TicketDetailRelationsProps) {
  const [open, setOpen] = useState(false);
  const [selectedTagId, setSelectedTagId] = useState("");
  const [linkedTicketId, setLinkedTicketId] = useState("");
  const [linkRelation, setLinkRelation] = useState<TicketLinkRelation>("related");
  const [mergeTargetId, setMergeTargetId] = useState("");

  const { data: allTags } = useSupportTags();
  const { data: ticketTags } = useTicketTags(ticketId);
  const { data: links } = useSupportTicketLinks(ticketId);
  const attachTag = useAttachTag();
  const detachTag = useDetachTag();
  const addLink = useAddTicketLink();
  const mergeTicket = useMergeTicket();

  const handleToggle = useCallback(() => setOpen((v) => !v), []);
  const handleTagSelectChange = useCallback((v: string) => setSelectedTagId(v), []);
  const handleLinkedTicketIdChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => setLinkedTicketId(e.target.value),
    [],
  );
  const handleLinkRelationChange = useCallback((v: string) => setLinkRelation(v as TicketLinkRelation), []);
  const handleMergeTargetChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => setMergeTargetId(e.target.value),
    [],
  );

  const handleAttachTag = useCallback(() => {
    if (!selectedTagId) return;
    attachTag.mutate(
      { ticketId, tagId: Number(selectedTagId) },
      {
        onSuccess: () => setSelectedTagId(""),
        onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to add tag"),
      },
    );
  }, [selectedTagId, ticketId, attachTag]);

  const handleDetachTag = useCallback(
    (tagId: number) => {
      detachTag.mutate(
        { ticketId, tagId },
        { onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to remove tag") },
      );
    },
    [ticketId, detachTag],
  );

  const handleAddLink = useCallback(() => {
    const parsed = Number(linkedTicketId);
    if (!parsed || parsed <= 0) {
      toast.error("Enter a valid ticket ID");
      return;
    }
    addLink.mutate(
      { ticketId, linkedTicketId: parsed, relation: linkRelation },
      {
        onSuccess: () => {
          setLinkedTicketId("");
          toast.success("Ticket linked");
        },
        onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to link ticket"),
      },
    );
  }, [linkedTicketId, linkRelation, ticketId, addLink]);

  const handleMerge = useCallback(() => {
    const parsed = Number(mergeTargetId);
    if (!parsed || parsed <= 0) {
      toast.error("Enter a valid ticket ID to merge into");
      return;
    }
    mergeTicket.mutate(
      { ticketId, intoTicketId: parsed },
      {
        onSuccess: () => {
          setMergeTargetId("");
          toast.success(`Merged into ticket #${parsed}`);
        },
        onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to merge ticket"),
      },
    );
  }, [mergeTargetId, ticketId, mergeTicket]);

  const attachedTagIds = new Set((ticketTags ?? []).map((t) => t.id));
  const availableTags = (allTags ?? []).filter((t) => !attachedTagIds.has(t.id));

  return (
    <div className="px-4 py-2 border-t border-border/40 shrink-0">
      <button
        type="button"
        onClick={handleToggle}
        className="flex items-center gap-1.5 w-full text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground hover:text-foreground transition-colors"
      >
        <TagIcon className="h-3.5 w-3.5 shrink-0" />
        Tags & Related Tickets
        <ChevronDown className={cn("h-3.5 w-3.5 ml-auto transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="mt-2 space-y-3 pb-1">
          <div>
            <p className="text-[11px] font-medium text-muted-foreground mb-1.5">Tags</p>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {(ticketTags ?? []).map((tag) => (
                <Badge key={tag.id} variant="outline" className="text-[10px] gap-1 pr-1">
                  {tag.name}
                  <button
                    type="button"
                    onClick={() => handleDetachTag(tag.id)}
                    aria-label={`Remove ${tag.name}`}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-2.5 w-2.5" />
                  </button>
                </Badge>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <Select value={selectedTagId} onValueChange={handleTagSelectChange} disabled={!availableTags.length}>
                <SelectTrigger className="h-7 text-xs flex-1 min-w-0">
                  <SelectValue placeholder="Add a tag" />
                </SelectTrigger>
                <SelectContent>
                  {availableTags.map((tag) => (
                    <SelectItem key={tag.id} value={String(tag.id)}>
                      {tag.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-7 w-7 shrink-0"
                disabled={!selectedTagId || attachTag.isPending}
                onClick={handleAttachTag}
                aria-label="Add tag"
              >
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          <div>
            <p className="text-[11px] font-medium text-muted-foreground mb-1.5 flex items-center gap-1">
              <Link2 className="h-3 w-3" /> Related tickets
            </p>
            {(links ?? []).length > 0 && (
              <ul className="space-y-1 mb-2">
                {(links ?? []).map((link) => (
                  <li key={link.id} className="text-[12px] flex items-center gap-1.5">
                    <Badge variant="outline" className="text-[9px] px-1 py-0">
                      {link.relation}
                    </Badge>
                    <span className="truncate">
                      #{link.linkedTicketId} {link.linkedTicket?.title ?? ""}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <div className="flex items-center gap-2">
              <Input
                value={linkedTicketId}
                onChange={handleLinkedTicketIdChange}
                placeholder="Ticket ID"
                className="h-7 text-xs w-20"
                inputMode="numeric"
              />
              <Select value={linkRelation} onValueChange={handleLinkRelationChange}>
                <SelectTrigger className="h-7 text-xs w-[110px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="related">Related</SelectItem>
                  <SelectItem value="duplicate">Duplicate</SelectItem>
                </SelectContent>
              </Select>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 text-xs shrink-0"
                disabled={addLink.isPending}
                onClick={handleAddLink}
              >
                Link
              </Button>
            </div>
          </div>

          <div>
            <p className="text-[11px] font-medium text-muted-foreground mb-1.5 flex items-center gap-1">
              <GitMerge className="h-3 w-3" /> Merge into another ticket
            </p>
            <div className="flex items-center gap-2">
              <Input
                value={mergeTargetId}
                onChange={handleMergeTargetChange}
                placeholder="Target ticket ID"
                className="h-7 text-xs w-28"
                inputMode="numeric"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 text-xs shrink-0"
                disabled={mergeTicket.isPending}
                onClick={handleMerge}
              >
                Merge
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
