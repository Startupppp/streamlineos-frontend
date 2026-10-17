"use client";

import { useCallback } from "react";
import { useProcessWfhRequest } from "@/hooks/api/hr";
import { useInvalidateAttendanceDay } from "@/hooks/api/hr/attendance-day-invalidation";
import type { ProcessWfhRequestInput } from "@/types/hr";

export interface WfhDecisionCallbacks {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

export function useDecideWfhRequest() {
  const processWfhRequest = useProcessWfhRequest();
  const invalidateAttendanceDay = useInvalidateAttendanceDay();

  const decide = useCallback(
    (input: ProcessWfhRequestInput, callbacks?: WfhDecisionCallbacks) => {
      processWfhRequest.mutate(input, {
        onSuccess: () => {
          invalidateAttendanceDay();
          callbacks?.onSuccess?.();
        },
        onError: (error) => callbacks?.onError?.(error),
      });
    },
    [processWfhRequest, invalidateAttendanceDay],
  );

  return { decide, isPending: processWfhRequest.isPending };
}
