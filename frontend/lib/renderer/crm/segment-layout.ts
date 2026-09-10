import type { RecordLayout, SelectOption } from "../layout";
import type { SegmentSource, SegmentSummary } from "@/types/crm/segments";

/**
 * A saved segment, as data.
 *
 * A segment is criteria with a name, and this describes the name — not the
 * criteria. The tree itself is authored in `segment-sheet.tsx` and is the same
 * shape the assignment-rule condition editor is: a filter expression rather
 * than a record, which is why it is not a field here and why the list never
 * projected it. What is left is an ordinary record: a name, what it is a
 * segment of, who wrote it and when it last changed.
 *
 * There is deliberately no size column, and describing the record does not
 * introduce one. A count beside each row is one `COUNT` per row per render, and
 * a table that quietly issues twenty-five aggregate queries to draw itself is a
 * cost nobody sees until a tenant has a hundred segments. Opening a row
 * evaluates that one segment and reports its exact size.
 *
 * `sourceKey` ships with no options for the same reason a deal's stage does:
 * which sources are segmentable comes from `GET /crm/segments/sources` and
 * differs by what the tenant has, so `withSegmentSources` fills them from the
 * live list. Unfilled, the stored key renders — honest while the sources are in
 * flight, where an invented list would name sources this tenant does not have.
 *
 * Every field is read-only and the form declares no sections. That is not the
 * list being lazy about a form: creating a segment creates its criteria in the
 * same gesture, and a form over the name alone would be a control that saves
 * half a record.
 */
export const SEGMENT_LAYOUT: RecordLayout = {
  key: "crm:segment",
  singular: "Segment",
  plural: "Segments",
  titleField: "name",
  fields: [
    { name: "name", label: "Segment", kind: "text", readOnly: true },
    { name: "description", label: "Description", kind: "text", readOnly: true },
    { name: "sourceKey", label: "Of", kind: "badge", readOnly: true },
    { name: "createdByName", label: "Created by", kind: "text", readOnly: true },
    { name: "updatedAt", label: "Updated", kind: "date", readOnly: true },
    { name: "createdAt", label: "Created", kind: "date", readOnly: true },
  ],
  list: {
    searchPlaceholder: "Search segments…",
    columns: [
      { field: "name", primary: true, subtitle: "description" },
      { field: "sourceKey", width: "w-40 shrink-0" },
      { field: "createdByName", width: "min-w-[140px]" },
      { field: "updatedAt", width: "w-32 shrink-0" },
    ],
  },
  detail: {
    sections: [
      { title: "Segment", fields: ["name", "description", "sourceKey"] },
      { title: "History", fields: ["createdByName", "createdAt", "updatedAt"] },
    ],
  },
  form: { sections: [] },
};

/**
 * The description with this organisation's own segmentable sources in it.
 *
 * Untouched when none have loaded, so a row renders its stored key rather than
 * a label from a list that has not arrived.
 */
export function withSegmentSources(
  layout: RecordLayout,
  sources: readonly SegmentSource[],
): RecordLayout {
  if (sources.length === 0) return layout;

  const options: SelectOption[] = sources.map((source) => ({
    value: source.key,
    label: source.label,
  }));

  return {
    ...layout,
    fields: layout.fields.map((field) =>
      field.name === "sourceKey" ? { ...field, options } : field,
    ),
  };
}

/** One segment in the shape the description names. */
export function segmentRecordFields(segment: SegmentSummary): Record<string, unknown> {
  return {
    segmentId: segment.segmentId,
    name: segment.name,
    description: segment.description,
    sourceKey: segment.sourceKey,
    createdByName: segment.createdByName,
    createdAt: segment.createdAt,
    updatedAt: segment.updatedAt,
  };
}
