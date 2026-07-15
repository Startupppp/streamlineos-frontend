import type { ViewType } from "@/features/projects/views/view-switcher";

export const MY_TICKETS_VIEWS = ["board", "list", "table"] as const satisfies readonly ViewType[];

export type MyTicketsView = (typeof MY_TICKETS_VIEWS)[number];

export function parseMyTicketsView(value: string | null): MyTicketsView {
  if (value === "board" || value === "list" || value === "table") return value;
  return "table";
}
