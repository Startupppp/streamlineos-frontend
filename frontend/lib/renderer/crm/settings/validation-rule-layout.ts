import type { RecordLayout } from "../../layout";

/**
 * A validation rule, as data — the list and the form both.
 *
 * This description is the reason `visibleWhen` exists. A validation rule is one
 * record with fifteen arms: a `regex` rule carries a pattern, a `numeric_min`
 * carries a number, a `conditional_required` carries a field and a value it must
 * hold, and the rest carry none of them. Before the vocabulary could say "only
 * when", the choice was a hand-written sheet with five branches in it or a
 * generated form that showed all four config fields to everybody — and a form
 * offering a regex box on a "required" rule is worse than the sheet it replaces.
 *
 * The condition is domain rather than presentation, which is what makes the rest
 * follow: a pattern is not *hidden* on a numeric rule, it is not part of that
 * record. So it is not validated — `configPattern` is `required` and a numeric
 * rule still submits — and it is not sent, so the API is never stored a leftover
 * pattern that nobody can see and the next reader has to explain.
 *
 * `entityType` is `createOnly`. Which entity a rule governs is decided once: the
 * update endpoint accepts the key and the old sheet rendered the control
 * disabled, which is a control that looks broken rather than one that is not
 * offered.
 *
 * The rule *type* is where the hand-written table kept a fifteen-entry
 * `RULE_TYPE_COLORS` map naming a status surface, ink and rule class per type.
 * Described here, each type declares which of the five tones it belongs to and
 * the engine paints it, so the dark pairing comes from the token rather than
 * from fifteen strings somebody has to keep in step.
 *
 * `pipelineId` is a `reference` whose name lives in `pipelineName`, so the list
 * shows the pipeline a rule is scoped to rather than its identifier, and the
 * form asks the surface for a picker. `pipeline` has no page in the product, so
 * the engine renders the name as text rather than as a link to nowhere.
 */

const CONFIG_NUMERIC = ["numeric_min", "numeric_max", "currency_min", "currency_max"] as const;

export const VALIDATION_RULE_LAYOUT: RecordLayout = {
  key: "crm:settings:validation-rule",
  singular: "Validation rule",
  plural: "Validation rules",
  titleField: "field",
  fields: [
    {
      name: "entityType",
      label: "Governs",
      kind: "select",
      required: true,
      createOnly: true,
      options: [
        { value: "lead", label: "Leads" },
        { value: "deal", label: "Deals" },
        { value: "contact", label: "Contacts" },
        { value: "company", label: "Companies" },
        { value: "quote", label: "Quotes" },
      ],
    },
    {
      name: "field",
      label: "Field",
      kind: "text",
      required: true,
      hint: "The field on the record this rule checks.",
    },
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
    {
      name: "configPattern",
      label: "Pattern",
      kind: "text",
      required: true,
      hint: "A regular expression the value has to match, such as ^[A-Z]{3}$.",
      visibleWhen: { field: "ruleType", equals: ["regex"] },
    },
    {
      name: "configValue",
      label: "Limit",
      kind: "number",
      required: true,
      hint: "The number the value is measured against.",
      visibleWhen: { field: "ruleType", equals: CONFIG_NUMERIC },
    },
    {
      name: "configConditionField",
      label: "Only when field",
      kind: "text",
      required: true,
      visibleWhen: { field: "ruleType", equals: ["conditional_required"] },
    },
    {
      name: "configConditionValue",
      label: "Holds value",
      kind: "text",
      required: true,
      visibleWhen: { field: "ruleType", equals: ["conditional_required"] },
    },
    {
      name: "pipelineId",
      label: "Pipeline",
      kind: "reference",
      referenceTo: "pipeline",
      referenceLabel: "pipelineName",
      hint: "Leave empty to apply the rule on every pipeline.",
    },
    { name: "pipelineName", label: "Pipeline", kind: "text", readOnly: true },
    {
      name: "stageKey",
      label: "Stage",
      kind: "text",
      hint: "Leave empty to apply the rule at every stage of the chosen pipeline.",
    },
    {
      name: "sourceKey",
      label: "Source",
      kind: "text",
      hint: "Leave empty to apply the rule whatever the record's source.",
    },
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
      { field: "pipelineId", width: "w-36 shrink-0" },
      { field: "stageKey", width: "w-32 shrink-0" },
      { field: "sourceKey", width: "w-32 shrink-0" },
      { field: "isActive", width: "w-24 shrink-0" },
    ],
  },
  detail: {
    sections: [
      { title: "Rule", fields: ["entityType", "field", "ruleType", "errorMessage", "isActive"] },
      {
        title: "Configuration",
        fields: ["configPattern", "configValue", "configConditionField", "configConditionValue"],
      },
      { title: "Scope", fields: ["pipelineId", "stageKey", "sourceKey", "sortOrder"] },
    ],
  },
  form: {
    sections: [
      { title: "What it checks", fields: ["entityType", "field", "ruleType"] },
      {
        title: "Configuration",
        fields: ["configPattern", "configValue", "configConditionField", "configConditionValue"],
      },
      { title: "Where it applies", fields: ["pipelineId", "stageKey", "sourceKey"] },
      { title: "When it bites", fields: ["errorMessage", "isActive"] },
    ],
  },
};
