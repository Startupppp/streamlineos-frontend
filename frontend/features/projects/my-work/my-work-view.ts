import type { ViewType } from "@/features/projects/views/view-switcher";

export const MY_WORK_VIEWS = ["board", "list", "table"] as const satisfies readonly ViewType[];

export type MyWorkView = (typeof MY_WORK_VIEWS)[number];

export function parseMyWorkView(value: string | null): MyWorkView {
  if (value === "board" || value === "list" || value === "table") return value;
  return "list";
}
