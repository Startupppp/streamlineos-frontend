"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useGatedQuery } from "@/hooks/api/gated-query";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import type { InterviewTranscript } from "@/hooks/api/hr/recruitment/interview-transcript-schema";

export type { InterviewTranscript };

const transcriptC = lazyContract(() =>
  import("@/hooks/api/hr/recruitment/interview-transcript-schema").then(
    (m) => m.interviewTranscriptContract,
  ),
);
const erasedC = lazyContract(() =>
  import("@/hooks/api/hr/recruitment/interview-transcript-schema").then(
    (m) => m.erasedTranscriptContract,
  ),
);

const transcriptKey = (interviewId: number) =>
  ["hr", "recruitment", "interviews", interviewId, "transcript"] as const;

/**
 * Gated on `manage`, matching the route — including the read.
 *
 * Anyone who can see an interview can see its outcome and its scorecard; a
 * verbatim record of what somebody said in a room is a different thing. The
 * backend audits every read of it, which is only meaningful if the read is
 * behind the narrower key.
 *
 * `enabled` is the caller's, so a collapsed panel does not fetch a transcript
 * nobody asked to see — and therefore does not write an audit row for a read
 * that never happened.
 */
export function useInterviewTranscript(interviewId: number, enabled: boolean) {
  return useGatedQuery("hr:interviews:manage", {
    queryKey: transcriptKey(interviewId),
    queryFn: ({ signal }) =>
      apiClient.get<InterviewTranscript>(
        `/hr/recruitment/interviews/${interviewId}/transcript`,
        undefined,
        signal,
        transcriptC,
      ),
    staleTime: 60_000,
    enabled,
  });
}

export interface StoreTranscriptInput {
  text: string;
  consentAt: string;
  retentionDays?: number;
}

export function useStoreInterviewTranscript(interviewId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:interviews:manage", {
    mutationKey: ["hr", "recruitment", "interviews", interviewId, "transcript", "store"],
    mutationFn: (input: StoreTranscriptInput) =>
      apiClient.post<InterviewTranscript>(
        `/hr/recruitment/interviews/${interviewId}/transcript`,
        input,
        undefined,
        transcriptC,
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: transcriptKey(interviewId) }),
  });
}

export function useEraseInterviewTranscript(interviewId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:interviews:manage", {
    mutationKey: ["hr", "recruitment", "interviews", interviewId, "transcript", "erase"],
    mutationFn: (reason: string) =>
      apiClient.delete<{ erased: boolean }>(
        `/hr/recruitment/interviews/${interviewId}/transcript`,
        { reason },
        undefined,
        erasedC,
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: transcriptKey(interviewId) }),
  });
}
