import "server-only";

import { dehydrate, type DehydratedState } from "@tanstack/react-query";
import { createServerQueryClient } from "./server-query-client";
import { queryKeys } from "@/lib/query-keys";
import { serverGet } from "@/lib/server-fetch";
import type { ProjectWithDetails } from "@/types/projects";

/**
 * PRD-C094 — one `GET /build/:id` per navigation, not two.
 *
 * Both build project layouts already read the project on the server: they need it to
 * decide 404 / access-denied / workspace redirect before anything renders. That result
 * went nowhere afterwards, so all 29 files that call `useProject(projectId)` issued the
 * SAME request again from the browser on mount — a server round trip whose answer was
 * already in the response the browser was reading.
 *
 * `fetchQuery` rather than `prefetchQuery` because the layout is a CONSUMER of this
 * value as well as a seeder: `prefetchQuery` swallows the error, and the layout's whole
 * 403/404/redirect branch depends on seeing it. One request, two readers.
 *
 * The client key, its `staleTime` and its shape are the ones `useProject` declares
 * (`hooks/api/build/projects.ts`); `lib/prefetch/hydration-contract.test.ts` pins that
 * the snapshot is readable by the app's own scoped client, which is the way this
 * silently degrades back into a double fetch.
 */
export async function prefetchBuildProject(projectId: number): Promise<{
  project: ProjectWithDetails;
  state: DehydratedState;
}> {
  const queryClient = await createServerQueryClient();
  const project = await queryClient.fetchQuery({
    queryKey: queryKeys.projects.detail(projectId),
    queryFn: () => serverGet<ProjectWithDetails>(`/build/${projectId}`),
    staleTime: 30_000,
  });
  return { project, state: dehydrate(queryClient) };
}
