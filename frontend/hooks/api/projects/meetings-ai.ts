"use client";

import { useMutation } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import type { MeetingExtractActionsResult } from "@/types/projects/ai";

export function useExtractMeetingActions(projectId: number, meetingId: number) {
  return useMutation({
    mutationKey: ["projects", projectId, "meetings", meetingId, "ai", "extract-actions"],
    mutationFn: () =>
      apiClient.post<MeetingExtractActionsResult>(
        `/ai/projects/${projectId}/meetings/${meetingId}/extract-actions`,
      ),
  });
}
