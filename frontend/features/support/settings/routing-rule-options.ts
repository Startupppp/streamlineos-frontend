import type {
  AssignmentMode,
  TicketPriority,
} from "@/hooks/api/support/macros";

export const NO_ASSIGNEE = "__none__";
export const NO_PRIORITY = "__none__";

export const ROUTING_FIELDS = [
  { value: "title", label: "Title" },
  { value: "category", label: "Category" },
  { value: "description", label: "Description" },
  { value: "priority", label: "Priority" },
  { value: "isVip", label: "VIP Client" },
];

export const ROUTING_OPERATORS = [
  { value: "eq", label: "Equals" },
  { value: "neq", label: "Not equals" },
  { value: "contains", label: "Contains" },
];

export const ROUTING_PRIORITIES: TicketPriority[] = [
  "LOW",
  "MEDIUM",
  "HIGH",
  "URGENT",
];

export const ASSIGNMENT_MODES: {
  value: AssignmentMode;
  label: string;
  description: string;
}[] = [
  {
    value: "static",
    label: "Static",
    description: "Always assign to one specific agent",
  },
  {
    value: "round_robin",
    label: "Round Robin",
    description: "Rotate evenly across candidate agents",
  },
  {
    value: "load_balanced",
    label: "Load Balanced",
    description: "Assign to the candidate with the fewest open tickets",
  },
  {
    value: "skill_based",
    label: "Skill Based",
    description: "Assign to a qualified, load-balanced candidate",
  },
  {
    value: "availability_based",
    label: "Availability Based",
    description: "Assign to an available, load-balanced candidate",
  },
];
