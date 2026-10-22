import { buildWorkQueryKeys } from "@/lib/query-keys/build-work";

export function commandCenterLayoutQueryOptions() {
  return {
    queryKey: buildWorkQueryKeys.commandCenter.layout(),
    staleTime: 60_000,
  };
}
