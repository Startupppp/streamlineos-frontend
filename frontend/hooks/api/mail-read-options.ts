import { directoryAndOwnershipQueryKeys } from "@/lib/query-keys/directory-and-ownership";
import type { MailMessagesParams } from "@/types/mail";

export const mailAccountsQueryOptions = {
  queryKey: directoryAndOwnershipQueryKeys.mail.accounts(),
  staleTime: 5 * 60_000,
} as const;

export const mailMessagesQueryOptions = (params: MailMessagesParams) => ({
  queryKey: directoryAndOwnershipQueryKeys.mail.messages(params),
  staleTime: 30_000,
});
