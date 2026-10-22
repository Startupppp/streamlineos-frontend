import { directoryAndOwnershipQueryKeys } from "@/lib/query-keys/directory-and-ownership";

export const mailAccountsQueryOptions = {
  queryKey: directoryAndOwnershipQueryKeys.mail.accounts(),
  staleTime: 5 * 60_000,
} as const;
