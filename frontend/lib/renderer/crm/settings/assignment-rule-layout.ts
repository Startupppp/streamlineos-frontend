import type { FieldSpec, RecordLayout } from "../../layout";


const CONDITION_FIELD_OPTIONS = [
  { value: "source", label: "Source" },
  { value: "priority", label: "Priority" },
  { value: "city", label: "City" },
  { value: "company", label: "Company" },
  { value: "potentialValue", label: "Potential value" },
] as const;

const CONDITION_OPERATOR_OPTIONS = [
  { value: "eq", label: "Equals" },
  { value: "contains", label: "Contains" },
  { value: "gt", label: "Greater than" },
  { value: "lt", label: "Less than" },
  { value: "in", label: "In (comma separated)" },
] as const;

export const ASSIGNMENT_TYPE_OPTIONS = [
  { value: "assign_user", label: "Assign to user" },
  { value: "round_robin", label: "Round robin" },
  { value: "weighted_round_robin", label: "Weighted round robin" },
  { value: "least_loaded", label: "Least loaded" },
  { value: "territory", label: "Territory" },
] as const;

const CONDITION_LINE: readonly FieldSpec[] = [
  {
    name: "field",
    label: "Field",
    kind: "select",
    required: true,
    options: CONDITION_FIELD_OPTIONS,
  },
  {
    name: "operator",
    label: "Operator",
    kind: "select",
    required: true,
    options: CONDITION_OPERATOR_OPTIONS,
  },
  { name: "value", label: "Value", kind: "text", required: true },
];

const WEIGHTED_MEMBER_LINE: readonly FieldSpec[] = [
  { name: "userId", label: "Member", kind: "reference", required: true, referenceTo: "user" },
  { name: "weight", label: "Weight", kind: "percent", required: true },
];

export const ASSIGNMENT_RULE_LAYOUT: RecordLayout = {
  key: "crm:settings:assignment-rule",
  singular: "Assignment rule",
  plural: "Assignment rules",
  titleField: "name",
  fields: [
    { name: "name", label: "Name", kind: "text", required: true },
    {
      name: "assignmentType",
      label: "Type",
      kind: "select",
      required: true,
      options: ASSIGNMENT_TYPE_OPTIONS,
    },
    {
      name: "priority",
      label: "Priority",
      kind: "number",
      readOnly: true,
      hint: "Rules are tried highest first. Drag a rule to change where it sits.",
    },
    {
      name: "isActive",
      label: "Active",
      kind: "boolean",
      options: [
        { value: "true", label: "Active", tone: "success" },
        { value: "false", label: "Paused", tone: "neutral" },
      ],
    },
    {
      name: "conditions",
      label: "Conditions",
      lineLabel: "Condition",
      kind: "lines",
      required: true,
      minLines: 1,
      lineFields: CONDITION_LINE,
      hint: "A lead has to match every condition for the rule to fire.",
    },
    {
      name: "assignToUserId",
      label: "Assign to",
      kind: "reference",
      referenceTo: "user",
      visibleWhen: { field: "assignmentType", equals: ["assign_user"] },
    },
    {
      name: "roundRobinUserIds",
      label: "Members",
      kind: "text",
      visibleWhen: {
        field: "assignmentType",
        equals: ["round_robin", "least_loaded"],
      },
      hint: "Leads are handed out across these people.",
    },
    {
      name: "weightedMembers",
      label: "Member weights",
      lineLabel: "Member",
      kind: "lines",
      lineFields: WEIGHTED_MEMBER_LINE,
      visibleWhen: { field: "assignmentType", equals: ["weighted_round_robin"] },
      hint: "A member with twice the weight receives roughly twice the leads.",
    },
    {
      name: "fallbackUserId",
      label: "Fallback owner",
      kind: "reference",
      referenceTo: "user",
      visibleWhen: { field: "assignmentType", equals: ["territory"] },
      hint: "Who takes the lead when its city matches no territory.",
    },
  ],
  list: {
    searchPlaceholder: "Search assignment rules…",
    columns: [
      { field: "name", primary: true },
      { field: "assignmentType", width: "w-44 shrink-0" },
      { field: "conditions", width: "w-32 shrink-0" },
      { field: "priority", width: "w-24 shrink-0" },
      { field: "isActive", width: "w-24 shrink-0" },
    ],
  },
  detail: {
    sections: [
      { title: "Rule", fields: ["name", "assignmentType", "priority", "isActive"] },
      { title: "Conditions", fields: ["conditions"] },
      {
        title: "Who it assigns to",
        fields: [
          "assignToUserId",
          "roundRobinUserIds",
          "weightedMembers",
          "fallbackUserId",
        ],
      },
    ],
  },
  form: {
    sections: [
      { title: "Rule", fields: ["name", "assignmentType", "isActive"] },
      { title: "Conditions", fields: ["conditions"] },
      {
        title: "Who it assigns to",
        fields: [
          "assignToUserId",
          "roundRobinUserIds",
          "weightedMembers",
          "fallbackUserId",
        ],
      },
    ],
  },
};
