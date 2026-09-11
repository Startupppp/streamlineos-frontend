import type { RecordLayout } from "../../layout";

/**
 * A blueprint — the rules about which stage may follow which — as data.
 *
 * Only the blueprint's own identity is described here: what it is called, which
 * pipeline it governs, whether it is on. The transitions themselves are not, and
 * will not be: a transition matrix is a state machine drawn as a grid of
 * from-stage against to-stage, and a `RecordLayout` describes a record with
 * fields, not a relation between two axes. `transition-matrix.tsx` stays.
 *
 * `pipelineId` is a `reference`, so the form asks the surface for a picker; the
 * list shows `pipelineName`, resolved by the surface from metadata it already
 * holds, because a visible identifier is a bug.
 */
export const BLUEPRINT_LAYOUT: RecordLayout = {
  key: "crm:settings:blueprint",
  singular: "Blueprint",
  plural: "Blueprints",
  titleField: "name",
  fields: [
    { name: "name", label: "Name", kind: "text", required: true },
    { name: "description", label: "Description", kind: "longText" },
    {
      name: "pipelineId",
      label: "Pipeline",
      kind: "reference",
      required: true,
      referenceTo: "pipeline",
      hint: "The pipeline whose stage moves this blueprint governs.",
    },
    { name: "pipelineName", label: "Pipeline", kind: "text", readOnly: true },
    { name: "isActive", label: "Active", kind: "boolean" },
    { name: "createdAt", label: "Added", kind: "date", readOnly: true },
  ],
  list: {
    searchPlaceholder: "Search blueprints…",
    columns: [
      { field: "name", primary: true, subtitle: "description" },
      { field: "pipelineName", width: "w-40 shrink-0" },
      { field: "isActive", width: "w-24 shrink-0" },
      { field: "createdAt", width: "w-32 shrink-0" },
    ],
  },
  detail: {
    sections: [
      { title: "Blueprint", fields: ["name", "pipelineName", "isActive"] },
      { title: "Description", fields: ["description"] },
    ],
  },
  form: {
    sections: [
      { title: "Blueprint", fields: ["name", "description", "pipelineId"] },
      { title: "Running", fields: ["isActive"] },
    ],
  },
};
