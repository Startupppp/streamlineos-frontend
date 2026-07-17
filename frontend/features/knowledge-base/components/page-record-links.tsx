"use client";

import { memo, useCallback, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCan } from "@/hooks/api/access";
import { TruncatedText } from "@/components/ui/truncated-text";
import {
  useKbPageRecordLinks,
  useAddKbPageRecordLink,
  useRemoveKbPageRecordLink,
  type KbPageRecordLink,
} from "@/hooks/api/kb/record-links";
import { KbXIcon } from "@/features/knowledge-base/lib/kb-icons";
import {
  KbRecordTargetCombobox,
  type KbRecordTargetType,
} from "./kb-record-target-combobox";

const TARGET_TYPE_LABELS: Record<KbRecordTargetType, string> = {
  crm_lead: "CRM Lead",
  crm_deal: "CRM Deal",
  crm_contact: "CRM Contact",
  project: "Project",
  project_ticket: "Project Ticket",
  support_ticket: "Support Ticket",
  hr_employee: "HR Employee",
};

const FIELD_CLASS = "h-8 w-full text-[13px] bg-card border-input shadow-xs";
const ACTION_BTN_CLASS =
  "h-8 w-full text-[13px] bg-card border border-input shadow-xs hover:bg-muted/50";

const TARGET_TYPE_OPTIONS = Object.entries(TARGET_TYPE_LABELS).map(([value, label]) => ({
  value: value as KbRecordTargetType,
  label,
}));

interface RecordLinkRowProps {
  link: KbPageRecordLink;
  pageId: number;
  canUpdate: boolean;
  isRemoving: boolean;
  onRemove: (linkId: number, pageId: number) => void;
}

const RecordLinkRow = memo(function RecordLinkRow({
  link,
  pageId,
  canUpdate,
  isRemoving,
  onRemove,
}: RecordLinkRowProps) {
  const handleRemove = useCallback(() => {
    onRemove(link.id, pageId);
  }, [link.id, onRemove, pageId]);

  return (
    <div className="flex items-center gap-2 py-1">
      <Badge variant="secondary" className="text-[10px] h-4 px-1.5 shrink-0">
        {TARGET_TYPE_LABELS[link.targetType as KbRecordTargetType] ?? link.targetType}
      </Badge>
      <TruncatedText text={link.label ?? link.targetId ?? "—"} className="text-[12px] text-foreground flex-1" />
      {canUpdate && (
        <Button
          variant="ghost"
          size="icon"
          className="h-5 w-5 shrink-0 text-muted-foreground hover:text-destructive"
          onClick={handleRemove}
          disabled={isRemoving}
          aria-label="Remove link"
        >
          <KbXIcon className="h-3 w-3" />
        </Button>
      )}
    </div>
  );
});

interface PageRecordLinksProps {
  pageId: number;
}

export function PageRecordLinks({ pageId }: PageRecordLinksProps) {
  const canUpdate = useCan("kb:pages:update");
  const [targetType, setTargetType] = useState<KbRecordTargetType | "">("");
  const [targetId, setTargetId] = useState("");
  const [label, setLabel] = useState("");

  const { data: links = [] } = useKbPageRecordLinks(pageId);
  const addLink = useAddKbPageRecordLink();
  const removeLink = useRemoveKbPageRecordLink();

  const handleTargetTypeChange = useCallback((value: string) => {
    setTargetType(value as KbRecordTargetType);
    setTargetId("");
  }, []);

  const handleTargetIdChange = useCallback((value: string, selectedLabel?: string) => {
    setTargetId(value);
    if (selectedLabel) {
      setLabel((current) => (current.trim() === "" ? selectedLabel : current));
    }
  }, []);

  const handleLabelChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setLabel(e.target.value);
  }, []);

  const handleAdd = useCallback(() => {
    if (!targetType || !targetId.trim() || !label.trim()) return;
    addLink.mutate(
      { pageId, targetType, targetId: targetId.trim(), label: label.trim() },
      {
        onSuccess: () => {
          toast.success("Record linked");
          setTargetType("");
          setTargetId("");
          setLabel("");
        },
        onError: () => toast.error("Failed to link record"),
      },
    );
  }, [addLink, label, pageId, targetId, targetType]);

  const handleRemoveLink = useCallback(
    (linkId: number, pid: number) => {
      removeLink.mutate({ linkId, pageId: pid }, { onError: () => toast.error("Failed to remove link") });
    },
    [removeLink],
  );

  return (
    <div className="space-y-2">
      <p className="text-[13px] font-medium text-foreground">Linked records</p>
      {links.length > 0 && (
        <div className="space-y-0.5">
          {links.map((link) => (
            <RecordLinkRow
              key={link.id}
              link={link}
              pageId={pageId}
              canUpdate={canUpdate}
              isRemoving={removeLink.isPending}
              onRemove={handleRemoveLink}
            />
          ))}
        </div>
      )}
      {canUpdate && (
        <div className="space-y-2 pt-1">
          <Select value={targetType} onValueChange={handleTargetTypeChange}>
            <SelectTrigger className={FIELD_CLASS}>
              <SelectValue placeholder="Record type" />
            </SelectTrigger>
            <SelectContent>
              {TARGET_TYPE_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value} className="text-[13px]">
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            placeholder="Label (e.g. Related lead)"
            value={label}
            onChange={handleLabelChange}
            className={FIELD_CLASS}
          />
          <KbRecordTargetCombobox
            targetType={targetType}
            value={targetId}
            onChange={handleTargetIdChange}
            placeholder="Search record…"
            disabled={!targetType}
            className={FIELD_CLASS}
          />
          <Button
            variant="outline"
            className={ACTION_BTN_CLASS}
            onClick={handleAdd}
            disabled={!targetType || !targetId.trim() || !label.trim() || addLink.isPending}
          >
            Link record
          </Button>
        </div>
      )}
    </div>
  );
}
