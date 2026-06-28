import "server-only";
import { serverApiClient } from "@/lib/api/server-client";

export type CrossOrgLead = {
  publicCode: string;
  name: string;
  email: string | null;
  company: string | null;
  status: string;
  source: string | null;
  organizationName: string | null;
  organizationSlug: string | null;
  createdAt: Date | null;
};

export async function listLeadsAcrossOrgs(limit = 200): Promise<CrossOrgLead[]> {
  return serverApiClient.get<CrossOrgLead[]>(
    "/platform/leads",
    limit !== 200 ? { limit } : undefined,
  );
}
