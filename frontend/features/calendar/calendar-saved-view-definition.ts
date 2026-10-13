import type { CalendarSavedView, CalendarSavedViewDefinition } from "@/hooks/api/calendar-saved-view-schema";
import { calendarSavedViewDateLogic } from "./calendar-saved-view-date";
import type { CalendarSavedViewFormValues } from "./calendar-saved-view-form-schema";

export function calendarSavedViewFormValues(view: CalendarSavedView | undefined, actorMembershipId: number | null): CalendarSavedViewFormValues {
  const definition = view?.definition;
  return {
    name: view?.name ?? "",
    scope: view?.scope ?? "personal",
    dateKind: definition?.dateLogic.kind ?? "today",
    sourceKey: definition?.sourceKey ?? "all",
    ownerMembershipId: definition?.ownerMembershipId === undefined
      ? "all"
      : definition.ownerMembershipId === actorMembershipId
        ? "me"
        : String(definition.ownerMembershipId),
    projectId: definition?.projectId === undefined ? "all" : String(definition.projectId),
    location: definition?.location ?? "",
    status: definition?.status ?? "",
    actionable: definition?.actionable === undefined ? "all" : String(definition.actionable) as "true" | "false",
  };
}

export function calendarSavedViewDefinition(
  values: CalendarSavedViewFormValues,
  currentDate: Date,
  actorMembershipId: number | null,
): CalendarSavedViewDefinition {
  if (values.ownerMembershipId === "me" && actorMembershipId === null)
    throw new Error("Your membership is unavailable. Refresh before saving this owner filter.");
  const ownerMembershipId = values.ownerMembershipId === "all"
    ? undefined
    : values.ownerMembershipId === "me"
      ? actorMembershipId ?? undefined
      : Number(values.ownerMembershipId);
  return {
    dateLogic: calendarSavedViewDateLogic(values.dateKind, currentDate),
    mode: "my-day",
    ...(values.sourceKey !== "all" ? { sourceKey: values.sourceKey } : {}),
    ...(ownerMembershipId ? { ownerMembershipId } : {}),
    ...(values.projectId !== "all" ? { projectId: Number(values.projectId) } : {}),
    ...(values.location.trim() ? { location: values.location.trim() } : {}),
    ...(values.status.trim() ? { status: values.status.trim() } : {}),
    ...(values.actionable !== "all" ? { actionable: values.actionable === "true" } : {}),
  };
}
