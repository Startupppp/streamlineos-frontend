import { humanResourcesQueryKeys } from "@/lib/query-keys/human-resources";

export function localDateKey(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export const hrHubQueryOptions = (today: string) => ({
  queryKey: humanResourcesQueryKeys.hr.hub(today),
  staleTime: 30_000,
});
