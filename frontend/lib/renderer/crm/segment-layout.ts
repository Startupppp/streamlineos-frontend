import type { RecordLayout, SelectOption } from "../layout";
import type { SegmentSource, SegmentSummary } from "@/types/crm/segments";

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
