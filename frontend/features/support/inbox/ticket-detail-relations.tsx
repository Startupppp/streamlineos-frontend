"use client";

import { memo, useState, useCallback } from "react";
import { ChevronDown, Tag as TagIcon, Link2, GitMerge, Split, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { TruncatedText } from "@/components/ui/truncated-text";
import { PlusIcon } from "@animateicons/react/lucide";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { SupportTicketCombobox } from "@/components/ui/support-ticket-combobox";
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
import { useSupportTags, useTicketTags, useAttachTag, useDetachTag } from "@/hooks/api/support/tags";
import {
  useSupportTicketLinks,
  useAddTicketLink,
  useMergeTicket,
  type TicketLinkRelation,
  type SupportTicketLink,
} from "@/hooks/api/support/links";
import { useSplitTicket } from "@/hooks/api/support/productivity";

interface TicketDetailRelationsProps {
  ticketId: number;
}

interface LinkedTicketRowProps {
  link: SupportTicketLink;
}

const LinkedTicketRow = memo(function LinkedTicketRow({ link }: LinkedTicketRowProps) {
  return (
    <li className="text-xs flex items-center gap-1.5">
      <Badge variant="outline" className="text-[9px] px-1 py-0">
        {link.relation}
      </Badge>
      <TruncatedText text={`#${link.linkedTicketId} ${link.linkedTicket?.title ?? ""}`} />
    </li>
  );
});

interface TicketTagBadgeProps {
  name: string;
  tagId: number;
  onDetach: (tagId: number) => void;
}

const TicketTagBadge = memo(function TicketTagBadge({
  name,
  tagId,
  onDetach,
}: TicketTagBadgeProps) {
  const handleDetach = useCallback(() => {
    onDetach(tagId);
  }, [onDetach, tagId]);

  return (
    <Badge variant="outline" className="text-micro gap-1 pr-1">
      {name}
      <button
        type="button"
        onClick={handleDetach}
        aria-label={`Remove ${name}`}
        className="text-muted-foreground hover:text-foreground"
      >
        <X className="h-2.5 w-2.5" />
      </button>
    </Badge>
  );
});

export function TicketDetailRelations({ ticketId }: TicketDetailRelationsProps) {
  const [open, setOpen] = useState(false);
  const [selectedTagId, setSelectedTagId] = useState("");
  const [linkedTicketId, setLinkedTicketId] = useState("");
  const [linkRelation, setLinkRelation] = useState<TicketLinkRelation>("related");
  const [mergeTargetId, setMergeTargetId] = useState("");
  const [splitTitle, setSplitTitle] = useState("");
  const [splitDescription, setSplitDescription] = useState("");

  const { data: allTags } = useSupportTags();
  const { data: ticketTags } = useTicketTags(ticketId);
  const { data: links } = useSupportTicketLinks(ticketId);
  const attachTag = useAttachTag();
  const detachTag = useDetachTag();
  const addLink = useAddTicketLink();
  const mergeTicket = useMergeTicket();
  const splitTicket = useSplitTicket();

  const handleToggle = useCallback(() => setOpen((v) => !v), []);
  const handleTagSelectChange = useCallback((v: string) => setSelectedTagId(v), []);
  const handleLinkedTicketIdChange = useCallback((v: string) => setLinkedTicketId(v), []);
  const handleLinkRelationChange = useCallback((v: string) => setLinkRelation(v as TicketLinkRelation), []);
  const handleMergeTargetChange = useCallback((v: string) => setMergeTargetId(v), []);
  const handleSplitTitleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => setSplitTitle(e.target.value),
    [],
  );
  const handleSplitDescriptionChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => setSplitDescription(e.target.value),
    [],
  );

  const handleAttachTag = useCallback(() => {
    if (!selectedTagId) return;
    attachTag.mutate(
      { ticketId, tagId: Number(selectedTagId) },
      {
        onSuccess: () => setSelectedTagId(""),
        onError: (err) => toast.error(getErrorMessage(err)),
      },
    );
  }, [selectedTagId, ticketId, attachTag]);

  const handleDetachTag = useCallback(
    (tagId: number) => {
      detachTag.mutate(
        { ticketId, tagId },
        { onError: (err) => toast.error(getErrorMessage(err)) },
      );
    },
    [ticketId, detachTag],
  );

  const handleAddLink = useCallback(() => {
    const parsed = Number(linkedTicketId);
    if (!parsed || parsed <= 0) {
      toast.error("Select a ticket to link");
      return;
    }
    addLink.mutate(
      { ticketId, linkedTicketId: parsed, relation: linkRelation },
      {
        onSuccess: () => {
          setLinkedTicketId("");
          toast.success("Ticket linked");
        },
        onError: (err) => toast.error(getErrorMessage(err)),
      },
    );
  }, [linkedTicketId, linkRelation, ticketId, addLink]);

  const handleMerge = useCallback(() => {
    const parsed = Number(mergeTargetId);
    if (!parsed || parsed <= 0) {
      toast.error("Select a target ticket to merge into");
      return;
    }
    mergeTicket.mutate(
      { ticketId, intoTicketId: parsed },
      {
        onSuccess: () => {
          setMergeTargetId("");
          toast.success(`Merged into ticket #${parsed}`);
        },
        onError: (err) => toast.error(getErrorMessage(err)),
      },
    );
  }, [mergeTargetId, ticketId, mergeTicket]);

  const handleSplit = useCallback(() => {
    if (splitTitle.trim().length < 5) {
      toast.error("Enter a title of at least 5 characters for the new ticket");
      return;
    }
    splitTicket.mutate(
      { ticketId, title: splitTitle.trim(), description: splitDescription.trim() || undefined },
      {
        onSuccess: (newTicket) => {
          setSplitTitle("");
          setSplitDescription("");
          toast.success(`Split into new ticket #${newTicket.id}`);
        },
        onError: (err) => toast.error(getErrorMessage(err)),
      },
    );
  }, [splitTitle, splitDescription, ticketId, splitTicket]);

  const attachedTagIds = new Set((ticketTags ?? []).map((t) => t.id));
  const availableTags = (allTags ?? []).filter((t) => !attachedTagIds.has(t.id));

  return (
    <div className="px-4 py-2 border-t border-border/40 shrink-0">
      <button
        type="button"
        onClick={handleToggle}
        className="flex items-center gap-1.5 w-full text-left text-dense font-semibold uppercase tracking-wide text-muted-foreground hover:text-foreground transition-colors"
      >
        <TagIcon className="h-3.5 w-3.5 shrink-0" />
        Tags & Related Tickets
        <ChevronDown className={cn("h-3.5 w-3.5 ml-auto transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="mt-2 space-y-3 pb-1">
          <div>
            <p className="text-dense font-semibold text-foreground/80 mb-1.5">Tags</p>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {(ticketTags ?? []).map((tag) => (
                <TicketTagBadge
                  key={tag.id}
                  tagId={tag.id}
                  name={tag.name}
                  onDetach={handleDetachTag}
                />
              ))}
            </div>
            <div className="flex items-center gap-2">
              <Select value={selectedTagId} onValueChange={handleTagSelectChange} disabled={!availableTags.length}>
                <SelectTrigger className="h-9 text-sm flex-1 min-w-0">
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
              <AnimatedIconButton
                type="button"
                variant="outline"
                size="icon"
                className="h-7 w-7 shrink-0"
                disabled={!selectedTagId || attachTag.isPending}
                onClick={handleAttachTag}
                aria-label="Add tag"
                icon={PlusIcon}
              />
            </div>
          </div>

          <div>
            <p className="text-dense font-semibold text-foreground/80 mb-1.5 flex items-center gap-1">
              <Link2 className="h-3 w-3" /> Related tickets
            </p>
            {(links ?? []).length > 0 && (
              <ul className="space-y-1 mb-2">
                {(links ?? []).map((link) => (
                  <LinkedTicketRow key={link.id} link={link} />
                ))}
              </ul>
            )}
            <div className="flex items-center gap-2">
              <SupportTicketCombobox
                value={linkedTicketId}
                onChange={handleLinkedTicketIdChange}
                excludeTicketId={ticketId}
                placeholder="Search ticket…"
                className="h-9 text-sm flex-1 min-w-0"
              />
              <Select value={linkRelation} onValueChange={handleLinkRelationChange}>
                <SelectTrigger className="h-9 text-sm w-[110px]">
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
            <p className="text-dense font-semibold text-foreground/80 mb-1.5 flex items-center gap-1">
              <GitMerge className="h-3 w-3" /> Merge into another ticket
            </p>
            <div className="flex items-center gap-2">
              <SupportTicketCombobox
                value={mergeTargetId}
                onChange={handleMergeTargetChange}
                excludeTicketId={ticketId}
                placeholder="Search target ticket…"
                className="h-9 text-sm flex-1 min-w-0"
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

          <div>
            <p className="text-dense font-semibold text-foreground/80 mb-1.5 flex items-center gap-1">
              <Split className="h-3 w-3" /> Split into a new ticket
            </p>
            <div className="space-y-1.5">
              <Input
                value={splitTitle}
                onChange={handleSplitTitleChange}
                placeholder="New ticket title"
                className="h-9 text-sm"
              />
              <Textarea
                value={splitDescription}
                onChange={handleSplitDescriptionChange}
                placeholder="Description (optional)"
                className="text-xs min-h-16"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                disabled={splitTicket.isPending}
                onClick={handleSplit}
              >
                Split Ticket
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
