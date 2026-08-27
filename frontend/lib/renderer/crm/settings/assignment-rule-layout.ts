import type { FieldSpec, RecordLayout } from "../../layout";

/**
 * An assignment rule, as data.
 *
 * This is the description that needed the vocabulary to grow. A rule is one
 * shape with five arms — who a lead goes to depends on how the rule assigns —
 * and `visibleWhen` already said that. What it could not say was the rule's
 * conditions: a list of `field operator value` triples with an add button and a
 * remove button, which the hand-written sheet drew itself with `useFieldArray`
 * and its own idea of what an empty row looks like. Three other surfaces had
 * drawn the same thing, differently. `lines` is the answer to all four.
 *
 * The conditions carry `minLines: 1` because a rule with none matches every
 * lead — the API rejects it, and finding that out on submit is a form that
 * wasted somebody's time. The engine keeps the last row rather than offering a
 * remove control that produces a record the server will not take.
 */

/** What a condition may test. Mirrors the fields the backend matcher reads. */
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

/**
 * A weighted member is a person and a share, so it is two columns rather than a
 * slider and a number that have to be kept in step. The share is a `percent`,
 * which is what it is — the hand-written sheet stored 0–100 and rendered a
 * slider beside a right-aligned readout, and the readout was the part carrying
 * the meaning.
 */
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
      label: "Round-robin members",
      kind: "text",
      visibleWhen: { field: "assignmentType", equals: ["round_robin"] },
      hint: "Leads are handed out to these people in turn.",
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
      name: "windowHours",
      label: "Window (hours)",
      kind: "number",
      visibleWhen: { field: "assignmentType", equals: ["least_loaded"] },
      hint: "How far back to look when deciding who is carrying the least.",
    },
    {
      name: "territoryId",
      label: "Territory",
      kind: "reference",
      visibleWhen: { field: "assignmentType", equals: ["territory"] },
    },
  ],
  list: {
    searchPlaceholder: "Search assignment rules…",
    columns: [
      { field: "name", primary: true, sortable: true },
      { field: "assignmentType", width: "w-44 shrink-0" },
      { field: "conditions", width: "w-32 shrink-0" },
      { field: "priority", sortable: true, width: "w-24 shrink-0" },
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
          "windowHours",
          "territoryId",
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
          "windowHours",
          "territoryId",
        ],
      },
    ],
  },
};
