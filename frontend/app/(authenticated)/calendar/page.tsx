import type { Metadata } from "next";
import { CalendarWorkspace } from "@/features/calendar/calendar-workspace";
import { requireSession } from "@/lib/rbac/require-permission";

export const metadata: Metadata = { title: "Calendar" };

export default async function CalendarPage() {
  await requireSession();
  return <CalendarWorkspace />;
}
