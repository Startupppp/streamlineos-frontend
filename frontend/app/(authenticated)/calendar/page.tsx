import type { Metadata } from "next";
import { CalendarView } from "@/features/calendar/calendar-view";
import { requireSession } from "@/lib/rbac/require-permission";

export const metadata: Metadata = { title: "Calendar" };

export default async function CalendarPage() {
  await requireSession();
  return <CalendarView />;
}
