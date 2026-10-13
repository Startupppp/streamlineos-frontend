import { format } from "date-fns";
import type { CalendarListItem } from "@/hooks/api/calendar";

export interface SourceActionConfig {
  field: string;
  inputType: "date" | "datetime-local";
  label: string;
}

export function actionConfig(event: CalendarListItem): SourceActionConfig | null {
  if (event.sourceKey === "build" && event.entityType === "ticket")
    return { field: "dueDate", inputType: "date", label: "Build due date" };
  if (event.sourceKey === "tasks" && event.entityType === "task")
    return { field: "dueDate", inputType: "datetime-local", label: "Task due time" };
  if (["crm", "crm-deals"].includes(event.sourceKey) && event.entityType === "deal")
    return { field: "expectedCloseDate", inputType: "date", label: "Expected close date" };
  if (event.sourceKey === "hr-interviews" && event.entityType === "interview")
    return { field: "scheduledAt", inputType: "datetime-local", label: "Interview time" };
  if (["inventory", "inventory-purchase-orders"].includes(event.sourceKey) && event.entityType === "purchase-order")
    return { field: "expectedDeliveryDate", inputType: "date", label: "Expected delivery date" };
  if (["finance", "accounting", "accounting-receivables"].includes(event.sourceKey) && event.entityType === "invoice")
    return { field: "dueDate", inputType: "date", label: "Invoice due date" };
  return null;
}

export function inputValue(event: CalendarListItem, config: SourceActionConfig): string {
  if (config.inputType === "date" && event.time.kind === "date")
    return event.time.startDate;
  const start = new Date(event.start);
  return config.inputType === "date" ? format(start, "yyyy-MM-dd") : format(start, "yyyy-MM-dd'T'HH:mm");
}

export function sourceValue(value: string, config: SourceActionConfig): string {
  return config.inputType === "date" ? value : new Date(value).toISOString();
}
