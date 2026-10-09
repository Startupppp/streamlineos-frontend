"use client";

import { useState } from "react";
import { useRegisterDirtyState } from "@/components/shared/dirty-state-context";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { roadmapItemSchema, parseRiceField, type RoadmapItemFormValues } from "./roadmap-schema";
import { Form } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetFooter,
  SheetBody,
} from "@/components/ui/sheet";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { isApiError, getApiErrorCode } from "@/lib/api-client";
import { knowledgeAndSurveysQueryKeys } from "@/lib/query-keys/knowledge-and-surveys";
import {
  useCreateRoadmapItem,
  useUpdateRoadmapItem,
} from "@/hooks/api/build/roadmap";
import type { ScorableRoadmapItem } from "./roadmap-item-card";
import { TicketConflictDialog } from "@/features/build/ticket-details/ticket-conflict-dialog";
import type { TicketConflictFieldDiff } from "@/features/build/ticket-details/ticket-conflict-diff";
import { RoadmapItemFormFields } from "./roadmap-item-form-fields";

const CONFLICT_EMPTY = "Not set";

function displayConflictValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return CONFLICT_EMPTY;
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value);
}

function buildRoadmapConflictDiffs(
  values: RoadmapItemFormValues,
  riceValues: { reach: number | null; impact: number | null; confidence: number | null; effort: number | null },
  baseline: ScorableRoadmapItem,
): TicketConflictFieldDiff[] {
  const pairs: Array<{ key: string; label: string; server: unknown; pending: unknown }> = [
    { key: "title", label: "Title", server: baseline.title, pending: values.title.trim() },
    { key: "description", label: "Description", server: baseline.description ?? null, pending: values.description.trim() || null },
    { key: "outcome", label: "Outcome", server: baseline.outcome ?? null, pending: values.outcome.trim() || null },
    { key: "status", label: "Status", server: baseline.status, pending: values.status },
    { key: "category", label: "Category", server: baseline.category ?? null, pending: values.category.trim() || null },
    { key: "targetQuarter", label: "Target quarter", server: baseline.targetQuarter ?? null, pending: values.targetQuarter.trim() || null },
    { key: "isPublic", label: "Public", server: baseline.isPublic, pending: values.isPublic },
    { key: "reach", label: "Reach", server: baseline.reach, pending: riceValues.reach },
    { key: "impact", label: "Impact", server: baseline.impact, pending: riceValues.impact },
    { key: "confidence", label: "Confidence", server: baseline.confidence, pending: riceValues.confidence },
    { key: "effort", label: "Effort", server: baseline.effort, pending: riceValues.effort },
  ];
  return pairs
    .filter(({ server, pending }) => String(server ?? "") !== String(pending ?? ""))
    .map(({ key, label, server, pending }) => ({
      key,
      label,
      serverValue: displayConflictValue(server),
      pendingValue: displayConflictValue(pending),
    }));
}

interface RoadmapItemSheetProps {
  item?: ScorableRoadmapItem;
  onClose: () => void;
}

function riceDefault(value: number | null | undefined): string {
  return value === null || value === undefined ? "" : String(value);
}

export function RoadmapItemSheet({ item, onClose }: RoadmapItemSheetProps) {
  const queryClient = useQueryClient();
  const isEdit = !!item;
  const create = useCreateRoadmapItem();
  const update = useUpdateRoadmapItem();
  const isPending = create.isPending || update.isPending;
  const [conflictFields, setConflictFields] = useState<TicketConflictFieldDiff[] | null>(null);

  const form = useForm<RoadmapItemFormValues, unknown, RoadmapItemFormValues>({
    resolver: zodResolver(roadmapItemSchema),
    defaultValues: {
      title: item?.title ?? "",
      description: item?.description ?? "",
      outcome: item?.outcome ?? "",
      status: (["planned", "in_progress", "completed", "cancelled"] as const).find((v) => v === item?.status) ?? "planned",
      category: item?.category ?? "",
      targetQuarter: item?.targetQuarter ?? "",
      isPublic: item?.isPublic ?? true,
      reach: riceDefault(item?.reach),
      impact: riceDefault(item?.impact),
      confidence: riceDefault(item?.confidence),
      effort: riceDefault(item?.effort),
    },
  });
  useRegisterDirtyState(form.formState.isDirty);

  function handleSave(values: RoadmapItemFormValues) {
    const rice = {
      reach: parseRiceField(values.reach),
      impact: parseRiceField(values.impact),
      confidence: parseRiceField(values.confidence),
      effort: parseRiceField(values.effort),
    };
    const payload = {
      title: values.title.trim(),
      description: values.description.trim() || undefined,
      outcome: values.outcome.trim() || undefined,
      status: values.status,
      category: values.category.trim() || undefined,
      targetQuarter: values.targetQuarter.trim() || undefined,
      isPublic: values.isPublic,
    };
    if (isEdit) {
      update.mutate(
        {
          roadmapItemId: item.id,
          version: item.version,
          title: payload.title,
          description: payload.description ?? null,
          outcome: payload.outcome ?? null,
          status: payload.status,
          category: payload.category ?? null,
          targetQuarter: payload.targetQuarter ?? null,
          isPublic: payload.isPublic,
          ...rice,
        },
        {
          onSuccess: () => { toast.success("Roadmap item updated"); onClose(); },
          onError: (e) => {
            if (isApiError(e) && getApiErrorCode(e) === "PROJECTS_TICKET_CONFLICT") {
              void queryClient.invalidateQueries({ queryKey: knowledgeAndSurveysQueryKeys.roadmap.items() });
              const diffs = item ? buildRoadmapConflictDiffs(values, rice, item) : [];
              if (diffs.length > 0) {
                setConflictFields(diffs);
              } else {
                toast.warning("This roadmap item was modified by another user. Your changes were not saved.");
              }
              return;
            }
            toast.error(getErrorMessage(e));
          },
        },
      );
    } else {
      create.mutate(
        {
          title: payload.title,
          description: payload.description,
          outcome: payload.outcome,
          status: payload.status,
          category: payload.category,
          targetQuarter: payload.targetQuarter,
          isPublic: payload.isPublic,
          reach: rice.reach ?? undefined,
          impact: rice.impact ?? undefined,
          confidence: rice.confidence ?? undefined,
          effort: rice.effort ?? undefined,
        },
        {
          onSuccess: () => { toast.success("Roadmap item created"); onClose(); },
          onError: (e) => toast.error(getErrorMessage(e)),
        },
      );
    }
  }

  return (
    <>
    <Sheet open onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-lg p-0 flex flex-col gap-0">
        <SheetHeader className="shrink-0 px-6 py-4 border-b text-left gap-1">
          <SheetTitle>{isEdit ? "Edit Roadmap Item" : "New Roadmap Item"}</SheetTitle>
          <SheetDescription>
            {isEdit
              ? "Update the item details, delivery status, visibility, and priority score."
              : "Add an item to the roadmap with a clear outcome and delivery horizon."}
          </SheetDescription>
        </SheetHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSave)} className="flex flex-col flex-1 min-h-0">
            <SheetBody className="px-6 py-5 space-y-4">
              <RoadmapItemFormFields control={form.control} isEdit={isEdit} item={item} />
            </SheetBody>
            <SheetFooter className="shrink-0 px-6 py-4 border-t flex-row gap-2 justify-end">
              <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
              <LoadingButton type="submit" className="flex-1" isPending={isPending} loadingText="Saving…">
                {isEdit ? "Save Changes" : "Create Item"}
              </LoadingButton>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
    <TicketConflictDialog
      open={conflictFields !== null}
      fields={conflictFields ?? []}
      onKeepMine={() => setConflictFields(null)}
      onDiscard={() => setConflictFields(null)}
    />
    </>
  );
}
