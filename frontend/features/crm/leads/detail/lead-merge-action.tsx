"use client";

import { useMemo, useState } from "react";
import { Combine } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FIELD_CONTROL_CLASS, FIELD_SELECT_CONTENT_CLASS } from "@/components/ui/field-control";
import { Skeleton } from "@/components/ui/skeleton";
import { useCan } from "@/hooks/api/access";
import { useDuplicateLeads, useMergeLead } from "@/hooks/api/crm/leads";
import { getErrorMessage } from "@/lib/get-error-message";

interface LeadMergeActionProps {
  leadId: number;
  leadName: string;
}

/**
 * Merge a suspected duplicate into the lead being viewed.
 *
 * The candidates are the duplicate groups the duplicates scan already finds
 * (`GET /leads/duplicates`), read only once the dialog opens, and the merge is
 * the same `POST /leads/merge` the duplicates page uses — this lead is kept.
 */
export function LeadMergeAction({ leadId, leadName }: LeadMergeActionProps) {
  const canMerge = useCan("crm:leads:assign");
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState<string | null>(null);
  const duplicates = useDuplicateLeads({ enabled: open });
  const merge = useMergeLead();

  const candidates = useMemo(() => {
    const seen = new Map<number, { id: number; name: string; email: string | null }>();
    for (const group of duplicates.data?.groups ?? []) {
      if (!group.leads.some((lead) => lead.id === leadId)) continue;
      for (const lead of group.leads) if (lead.id !== leadId) seen.set(lead.id, lead);
    }
    return [...seen.values()];
  }, [duplicates.data, leadId]);

  const selectedId = picked ?? (candidates[0] ? String(candidates[0].id) : null);
  const selected = candidates.find((lead) => String(lead.id) === selectedId);

  function handleOpen() {
    setOpen(true);
  }
  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) setPicked(null);
  }
  function handleConfirm() {
    if (!selected) return;
    merge.mutate(
      { keepLeadId: leadId, mergeLeadId: selected.id },
      {
        onSuccess: () => {
          toast.success(`${selected.name} merged into ${leadName}`);
          handleOpenChange(false);
        },
        onError: (error) => toast.error(getErrorMessage(error)),
      },
    );
  }

  if (!canMerge) return null;

  const content = duplicates.isLoading ? (
    <Skeleton className="h-9 w-full" />
  ) : duplicates.isError ? (
    <p className="text-sm text-destructive">{getErrorMessage(duplicates.error)}</p>
  ) : candidates.length === 0 ? (
    <p className="text-sm text-muted-foreground">No suspected duplicates of this lead were found.</p>
  ) : (
    <Select value={selectedId ?? undefined} onValueChange={setPicked}>
      <SelectTrigger className={FIELD_CONTROL_CLASS} aria-label="Duplicate to merge">
        <SelectValue />
      </SelectTrigger>
      <SelectContent className={FIELD_SELECT_CONTENT_CLASS}>
        {candidates.map((lead) => (
          <SelectItem key={lead.id} value={String(lead.id)}>
            {lead.email ? `${lead.name} (${lead.email})` : lead.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  return (
    <>
      <Button type="button" variant="outline" size="sm" onClick={handleOpen}>
        <Combine className="mr-1 h-3.5 w-3.5" />
        Merge duplicate
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={handleOpenChange}
        title="Merge a duplicate into this lead?"
        description={`${leadName} is kept. The duplicate's activities, notes and tasks move here and the duplicate is removed. This cannot be undone.`}
        content={content}
        confirmLabel="Merge"
        confirmDisabled={!selected}
        destructive
        isPending={merge.isPending}
        keepOpenOnConfirm
        onConfirm={handleConfirm}
      />
    </>
  );
}
