import type { QueryClient } from "@tanstack/react-query";
import type { JobPosting } from "@/types/hr/recruitment";

export function prependCreatedJob(
  qc: QueryClient,
  queryKey: readonly unknown[],
  created: JobPosting,
): void {
  qc.setQueriesData({ queryKey }, (current: unknown) => {
    if (Array.isArray(current)) {
      if (current.some((job) => job && typeof job === "object" && "id" in job && job.id === created.id)) {
        return current;
      }
      return [created, ...current];
    }
    if (current && typeof current === "object" && "items" in current && Array.isArray(current.items)) {
      const page = current as { items: Array<{ id: number }> };
      if (page.items.some((job) => job.id === created.id)) return current;
      return { ...page, items: [created, ...page.items] };
    }
    return current;
  });
}
