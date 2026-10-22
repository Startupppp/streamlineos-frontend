import { humanResourcesQueryKeys } from "@/lib/query-keys/human-resources";

export const recognitionQueryOptions = () => ({
  queryKey: humanResourcesQueryKeys.hr.hrRecognition,
  staleTime: 60_000,
});
