import "server-only";
import { serverApiClient } from "@/lib/api/server-client";

export type PlatformMessageStatus = "NEW" | "READ" | "REPLIED" | "ARCHIVED";

export type PlatformMessage = {
  id: number;
  publicCode: string;
  name: string;
  email: string;
  company: string | null;
  phone: string | null;
  message: string;
  topic: string;
  status: PlatformMessageStatus;
  createdAt: string | Date;
  replyBody: string | null;
  repliedAt: string | Date | null;
};

export type InboxFilter = {
  status?: PlatformMessageStatus | "ALL";
  topic?: string;
  search?: string;
};

export async function listMessages(filter: InboxFilter = {}): Promise<PlatformMessage[]> {
  const params: Record<string, string> = {};
  if (filter.status && filter.status !== "ALL") params.status = filter.status;
  if (filter.topic && filter.topic !== "ALL") params.topic = filter.topic;
  if (filter.search) params.search = filter.search;
  return serverApiClient.get<PlatformMessage[]>(
    "/platform/messages",
    Object.keys(params).length ? params : undefined,
  );
}

export async function getMessageByPublicCode(code: string): Promise<PlatformMessage | null> {
  try {
    return await serverApiClient.get<PlatformMessage>(`/platform/messages/${code}`);
  } catch {
    return null;
  }
}
