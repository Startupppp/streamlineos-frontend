import { useMutation, useQueryClient } from "@tanstack/react-query";
import { portalApiClient } from "@/lib/portal-api-client";
import type {
  ChangeRequestInput,
} from "@/features/portal/lib/change-request-schema";
import type { SubmitChangeRequestResponse } from "@/features/portal/lib/portal-types";

export function useSubmitChangeRequest(projectId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ["portal", "projects", projectId, "change-requests"],
    mutationFn: (input: ChangeRequestInput) =>
      portalApiClient.post<SubmitChangeRequestResponse>(
        `/portal/v1/projects/${projectId}/change-requests`,
        input,
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["portal", "projects", projectId, "overview"],
      });
    },
  });
}
