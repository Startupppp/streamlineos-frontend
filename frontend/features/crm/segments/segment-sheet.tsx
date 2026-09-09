"use client";

import { useCallback, useMemo } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { EntityFormSheet } from "@/components/shared";
import { useCreateSegment, useUpdateSegment } from "@/hooks/api/crm/segments";
import { getErrorMessage } from "@/lib/get-error-message";
import type { Segment, SegmentSource } from "@/types/crm/segments";
import { EMPTY_CRITERION_ROW, toCriterionRows, toSegmentCriteria } from "./segment-criteria";
import { SegmentFormFields } from "./segment-form-fields";
import { segmentFormSchema, type SegmentFormValues } from "./segment-schema";

/**
 * Creating and editing a segment, in one sheet.
 *
 * Rung 4 of the overlay ladder: six controls plus a repeating group, and the
 * match count beside them is context the person needs while they work — a dialog
 * that covered the list would take away the thing they are sizing.
 *
 * The submit path is where the form's rows become the server's tree. It cannot
 * fail here: the resolver has already refused every row the conversion would
 * reject, so `toSegmentCriteria` returning `null` at this point would mean the
 * schema and the converter disagree. That case is handled rather than asserted,
 * because a thrown error inside a submit handler is a form that silently stops
 * responding.
 */

interface SegmentSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sources: readonly SegmentSource[];
  /** The segment being edited, or `null` to create one. */
  segment: Segment | null;
}

export function SegmentSheet({ open, onOpenChange, sources, segment }: SegmentSheetProps) {
  const createSegment = useCreateSegment();
  const updateSegment = useUpdateSegment();
  const isEditing = segment !== null;

  /**
   * A stored tree that this control did not draw — nested, or containing an
   * `or` — comes back as `null`, and the form opens with no rows rather than
   * with a flattened approximation. Saving then replaces the criteria, which is
   * what the person can see they are doing; silently rewriting them would not
   * be.
   */
  const defaultValues = useMemo<SegmentFormValues>(() => {
    if (!segment)
      return {
        name: "",
        description: "",
        source: sources[0]?.key ?? "",
        criteria: [{ ...EMPTY_CRITERION_ROW }],
      };

    const catalogue = sources.find((candidate) => candidate.key === segment.sourceKey);
    const typeOf = (name: string) =>
      catalogue?.fields.find((entry) => entry.name === name)?.type;

    return {
      name: segment.name,
      description: segment.description ?? "",
      source: segment.sourceKey,
      criteria: toCriterionRows(segment.criteria, typeOf) ?? [{ ...EMPTY_CRITERION_ROW }],
    };
  }, [segment, sources]);

  const handleSubmit = useCallback(
    (values: SegmentFormValues) => {
      const criteria = toSegmentCriteria(values.criteria);
      if (!criteria) {
        toast.error("Finish every criterion before saving this segment.");
        return;
      }

      const description = values.description.trim();

      if (segment) {
        updateSegment.mutate(
          {
            segmentId: segment.segmentId,
            name: values.name,
            description: description === "" ? null : description,
            criteria,
          },
          {
            onSuccess: () => {
              toast.success("Segment updated");
              onOpenChange(false);
            },
            onError: (error) => {
              toast.error(getErrorMessage(error));
            },
          },
        );
        return;
      }

      createSegment.mutate(
        {
          name: values.name,
          source: values.source,
          criteria,
          ...(description === "" ? {} : { description }),
        },
        {
          onSuccess: () => {
            toast.success("Segment created");
            onOpenChange(false);
          },
          onError: (error) => {
            toast.error(getErrorMessage(error));
          },
        },
      );
    },
    [createSegment, updateSegment, segment, onOpenChange],
  );

  return (
    <EntityFormSheet<SegmentFormValues>
      open={open}
      onOpenChange={onOpenChange}
      title={isEditing ? "Edit segment" : "New segment"}
      description="A segment is criteria, not a list — it is re-evaluated every time somebody opens it."
      resolver={zodResolver(segmentFormSchema)}
      defaultValues={defaultValues}
      onSubmit={handleSubmit}
      isSubmitting={createSegment.isPending || updateSegment.isPending}
      submitLabel={isEditing ? "Save segment" : "Create segment"}
      resetOnOpen
    >
      {(form) => (
        <SegmentFormFields form={form} sources={sources} isEditing={isEditing} />
      )}
    </EntityFormSheet>
  );
}
