import { humanResourcesQueryKeys } from "@/lib/query-keys/human-resources";

export const hrAnnouncementsQueryOptions = () => ({
  queryKey: humanResourcesQueryKeys.hr.announcements(),
  staleTime: 60_000,
});
