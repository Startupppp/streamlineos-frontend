import type { FieldKind } from "@/lib/renderer/layout";

/**
 * The input type a kind is typed into.
 *
 * Its own module rather than a private function in `record-form.tsx`, because
 * a repeating group's columns need the same answer and importing it from the
 * form would put a cycle in the graph — the form renders the group. One rule,
 * one place, no cycle.
 */
export function controlType(kind: FieldKind): string {
  switch (kind) {
    case "email":
      return "email";
    case "phone":
      return "tel";
    case "url":
      return "url";
    case "number":
    case "money":
    case "percent":
      return "number";
    case "date":
      return "date";
    case "dateTime":
      return "datetime-local";
    default:
      return "text";
  }
}
