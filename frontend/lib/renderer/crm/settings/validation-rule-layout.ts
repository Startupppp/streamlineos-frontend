import type { RecordLayout } from "../../layout";

/**
 * A validation rule, as data — the list of one, at least.
 *
 * The rule *type* is where the hand-written table kept a fifteen-entry
 * `RULE_TYPE_COLORS` map naming a status surface, ink and rule class per type.
 * Described here, each type declares which of the five tones it belongs to and
 * the engine paints it, so the dark pairing comes from the token rather than
 * from fifteen strings somebody has to keep in step.
 *
 * `pipelineName` is read-only and resolved by the surface from the metadata it
 * already has: the record carries a `pipelineId`, and a visible identifier is a
 * bug. Nothing writes it, so nothing can send it.
 *
 * The *form* for this record type is deliberately not generated. Which config
 * fields a rule has depends on the value of `ruleType` — a regex has a pattern,
 * a `numeric_min` has a number, a `stage_required` has a pipeline and a stage —
 * and `FieldSpec` has no way to say "show this field only when that one holds
 * this value". Rendering all eight config fields at once would be a worse form
 * than the one it replaced, so the hand-written sheet stays.
 */
export const VALIDATION_RULE_LAYOUT: RecordLayout = {
  key: "crm:settings:validation-rule",
  singular: "Validation rule",
  plural: "Validation rules",
  titleField: "field",
  fields: [
    { name: "field", label: "Field", kind: "text", required: true },
    {
      name: "ruleType",
      label: "Rule",
      kind: "badge",
      required: true,
      options: [
        { value: "required", label: "Required", tone: "danger" },
        { value: "unique", label: "Unique", tone: "success" },
        { value: "email", label: "Email", tone: "info" },
        { value: "phone", label: "Phone", tone: "info" },
        { value: "url", label: "URL", tone: "info" },
        { value: "regex", label: "Pattern", tone: "info" },
        { value: "numeric_min", label: "At least", tone: "warning" },
        { value: "numeric_max", label: "At most", tone: "warning" },
        { value: "currency_min", label: "Amount at least", tone: "warning" },
        { value: "currency_max", label: "Amount at most", tone: "warning" },
        { value: "date_not_past", label: "Not in the past", tone: "info" },
        { value: "date_not_future", label: "Not in the future", tone: "info" },
        { value: "conditional_required", label: "Required when", tone: "warning" },
        { value: "stage_required", label: "Required at stage", tone: "warning" },
        { value: "source_required", label: "Required for source", tone: "warning" },
      ],
    },
    { name: "pipelineName", label: "Pipeline", kind: "text", readOnly: true },
    { name: "stageKey", label: "Stage", kind: "text" },
    { name: "sourceKey", label: "Source", kind: "text" },
    {
      name: "errorMessage",
      label: "Message",
      kind: "text",
      hint: "What the person filling the form is told when the rule bites.",
    },
    { name: "isActive", label: "Active", kind: "boolean" },
    { name: "sortOrder", label: "Order", kind: "number", readOnly: true },
  ],
  list: {
    searchPlaceholder: "Search rules…",
    columns: [
      { field: "field", primary: true, subtitle: "errorMessage" },
      { field: "ruleType", width: "w-44 shrink-0" },
      { field: "pipelineName", width: "w-36 shrink-0" },
      { field: "stageKey", width: "w-32 shrink-0" },
      { field: "sourceKey", width: "w-32 shrink-0" },
      { field: "isActive", width: "w-24 shrink-0" },
    ],
  },
  detail: {
    sections: [
      { title: "Rule", fields: ["field", "ruleType", "errorMessage", "isActive"] },
      { title: "Scope", fields: ["pipelineName", "stageKey", "sourceKey", "sortOrder"] },
    ],
  },
  form: {
    sections: [
      { title: "Rule", fields: ["field", "ruleType", "errorMessage"] },
      { title: "Scope", fields: ["stageKey", "sourceKey"] },
      { title: "Running", fields: ["isActive"] },
    ],
  },
};
