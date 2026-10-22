import type { FieldKind } from "@/lib/renderer/layout";

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
