import "server-only";
import { serverApiClient } from "@/lib/api/server-client";

export type OwnerLayoutData = {
  unreadCount: number;
  ownerName: string;
  ownerEmail: string;
};

export async function getOwnerLayoutData(userId: string): Promise<OwnerLayoutData> {
  return serverApiClient.get<OwnerLayoutData>("/platform/layout");
}
