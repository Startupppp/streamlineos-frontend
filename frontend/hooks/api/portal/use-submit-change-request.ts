import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useIdempotentOperation } from "@/hooks/common/use-idempotent-operation";
import { portalApiClient } from "@/lib/portal-api-client";
import { directoryAndOwnershipQueryKeys } from "@/lib/query-keys/directory-and-ownership";
import type {
  ChangeRequestInput,
} from "@/features/portal/lib/change-request-schema";
import type { SubmitChangeRequestResponse } from "@/features/portal/lib/portal-types";

export function useSubmitChangeRequest(projectId: number) {
  const queryClient = useQueryClient();
  const operation = useIdempotentOperation();

  return useMutation({
    mutationKey: ["portal", "projects", projectId, "change-requests"],
    mutationFn: (input: ChangeRequestInput) =>
      portalApiClient.post<SubmitChangeRequestResponse>(
        `/portal/v1/projects/${projectId}/change-requests`,
        input,
        operation.configFor(input),
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: directoryAndOwnershipQueryKeys.portal.projectOverview(projectId),
      });
      operation.settle();
    },
  });
}
