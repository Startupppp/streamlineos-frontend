import "server-only";

import { dehydrate, QueryClient } from "@tanstack/react-query";
import { createServerQueryClient } from "./server-query-client";
import { serverGet } from "@/lib/server-fetch";
import { resolvePrefetchGate } from "@/lib/prefetch/prefetch-gate";
import { calendarSourcesQueryOptions, calendarAdminPolicyQueryOptions } from "@/hooks/api/calendar-read-options";
import { calendarSourcesContract } from "@/hooks/api/calendar-schema";
import { calendarAdminPolicyContract } from "@/hooks/api/calendar-admin-schema";
import type { z } from "zod";

type CalendarSourcesResponse = z.infer<typeof calendarSourcesContract>;
type CalendarAdminPolicy = z.infer<typeof calendarAdminPolicyContract>;

export async function prefetchCalendarSources() {
  try {
    const [queryClient, gate] = await Promise.all([
      createServerQueryClient(),
      resolvePrefetchGate(),
    ]);
    if (!gate.can("calendar:read")) return dehydrate(new QueryClient());

    await queryClient.prefetchQuery({
      ...calendarSourcesQueryOptions,
      queryFn: () => serverGet<CalendarSourcesResponse>("/calendar/sources", calendarSourcesContract),
    });

    return dehydrate(queryClient);
  } catch {
    return dehydrate(new QueryClient());
  }
}

export async function prefetchCalendarAdminPolicy() {
  try {
    const [queryClient, gate] = await Promise.all([
      createServerQueryClient(),
      resolvePrefetchGate(),
    ]);
    if (!gate.can("calendar:admin:manage")) return dehydrate(new QueryClient());

    await queryClient.prefetchQuery({
      ...calendarAdminPolicyQueryOptions,
      queryFn: () => serverGet<CalendarAdminPolicy>("/calendar/admin/governance", calendarAdminPolicyContract),
    });

    return dehydrate(queryClient);
  } catch {
    return dehydrate(new QueryClient());
  }
}
