import type { RecordLayout } from "../../layout";


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
