"use client";

import { useCallback } from "react";
import { useFieldArray, type UseFormReturn } from "react-hook-form";
import { PlusIcon } from "@animateicons/react/lucide";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FIELD_SELECT_CONTENT_CLASS } from "@/components/ui/field-control";
import type { SegmentSource } from "@/types/crm/segments";
import { EMPTY_CRITERION_ROW } from "./segment-criteria";
import { SegmentCriterionRow } from "./segment-criterion-row";
import { SegmentMatchCount } from "./segment-match-count";
import { MAX_SEGMENT_CRITERIA, type SegmentFormValues } from "./segment-schema";

/**
 * The segment form: what to call it, what it selects from, and what makes a row
 * a member.
 *
 * The source select is disabled once a segment exists. Every criterion names a
 * field of one source, so re-pointing a saved segment would leave criteria
 * referencing fields the new source does not have — the server refuses it, and
 * the control says so up front rather than letting somebody build an edit that
 * cannot be saved. Building a segment over different data is a create.
 */

interface SegmentFormFieldsProps {
  form: UseFormReturn<SegmentFormValues>;
  sources: readonly SegmentSource[];
  /** Editing an existing segment, so the source is settled. */
  isEditing: boolean;
}

export function SegmentFormFields({ form, sources, isEditing }: SegmentFormFieldsProps) {
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "criteria",
  });

  const source = form.watch("source");
  const rows = form.watch("criteria");
  const activeSource = sources.find((candidate) => candidate.key === source);
  const sourceFields = activeSource?.fields ?? [];

  const handleAdd = useCallback(() => {
    append({ ...EMPTY_CRITERION_ROW });
  }, [append]);

  const handleRemove = useCallback(
    (index: number) => {
      remove(index);
    },
    [remove],
  );

  return (
    <div className="flex flex-col gap-4">
      <FormField
        control={form.control}
        name="name"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Name</FormLabel>
            <FormControl>
              <Input {...field} placeholder="Lapsed enterprise accounts" />
            </FormControl>
            <FormDescription>
              How this set is referred to in a brief. Names are unique per organisation.
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="description"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Description</FormLabel>
            <FormControl>
              <Textarea {...field} rows={2} placeholder="Why this group is worth addressing." />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="source"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Segment of</FormLabel>
            <Select
              value={field.value}
              onValueChange={field.onChange}
              disabled={isEditing || sources.length === 0}
            >
              <FormControl>
                <SelectTrigger aria-label="Segment source" className="w-full">
                  <SelectValue placeholder="Pick what to segment" />
                </SelectTrigger>
              </FormControl>
              <SelectContent className={FIELD_SELECT_CONTENT_CLASS}>
                {sources.map((option) => (
                  <SelectItem key={option.key} value={option.key}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {isEditing ? (
              <FormDescription>
                Fixed once a segment exists — every criterion names a field of this source.
              </FormDescription>
            ) : null}
            <FormMessage />
          </FormItem>
        )}
      />

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <FormLabel>Criteria</FormLabel>
          <AnimatedIconButton
            icon={PlusIcon}
            iconSize={16}
            iconClassName="mr-1.5"
            type="button"
            variant="outline"
            size="sm"
            disabled={source === "" || fields.length >= MAX_SEGMENT_CRITERIA}
            onClick={handleAdd}
          >
            Add criterion
          </AnimatedIconButton>
        </div>

        {fields.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Every criterion narrows the set. A segment with none of them is the whole list.
          </p>
        ) : null}

        {fields.map((row, index) => (
          <SegmentCriterionRow
            key={row.id}
            form={form}
            index={index}
            fields={sourceFields}
            onRemove={handleRemove}
          />
        ))}

        <FormField
          control={form.control}
          name="criteria"
          render={() => (
            <FormItem>
              <FormMessage />
            </FormItem>
          )}
        />

        <SegmentMatchCount source={source} rows={rows} />
      </div>
    </div>
  );
}
