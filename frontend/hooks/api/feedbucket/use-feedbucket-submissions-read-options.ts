import { growthAndSignQueryKeys } from "@/lib/query-keys/growth-and-sign";

export function feedbucketSubmissionQueryOptions(submissionId: number) {
  return {
    queryKey: growthAndSignQueryKeys.feedbucket.submission(submissionId),
    staleTime: 30_000,
  } as const;
}
