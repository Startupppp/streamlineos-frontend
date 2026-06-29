import "server-only";
import { desc, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { leads, organizations } from "@/lib/db/schema";

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
  const rows = await db
    .select({
      id: leads.id,
      name: leads.name,
      email: leads.email,
      company: leads.company,
      status: leads.status,
      source: leads.source,
      orgName: organizations.name,
      orgSlug: organizations.slug,
      createdAt: leads.createdAt,
    })
    .from(leads)
    .leftJoin(organizations, sql`${organizations.id} = ${leads.orgId}`)
    .orderBy(desc(leads.createdAt))
    .limit(limit);

  return rows.map((r) => ({
    publicCode: `LEAD-${r.id.toString().padStart(5, "0")}`,
    name: r.name,
    email: r.email,
    company: r.company,
    status: r.status ?? "NEW",
    source: r.source,
    organizationName: r.orgName,
    organizationSlug: r.orgSlug,
    createdAt: r.createdAt,
  }));
}
