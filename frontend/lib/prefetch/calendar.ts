import "server-only";

import { dehydrate } from "@tanstack/react-query";
import { createServerQueryClient } from "./server-query-client";
import { platformHierarchyQueryKeys } from "@/lib/query-keys/platform-hierarchy";
import { serverGet } from "@/lib/server-fetch";
import type { CalendarSource } from "@/hooks/api/calendar";

export async function prefetchCalendarSources() {
  const queryClient = await createServerQueryClient();
  await queryClient.prefetchQuery({
    queryKey: platformHierarchyQueryKeys.calendar.sources(),
    queryFn: () => serverGet<CalendarSource[]>("/calendar/sources"),
    staleTime: 5 * 60 * 1000,
  });
  return dehydrate(queryClient);
}
