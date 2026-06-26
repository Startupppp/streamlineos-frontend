"server-only";

import { db } from "@/lib/db";
import { roles } from "@/lib/db/schema";
import { eq, and, asc } from "drizzle-orm";
import { cached, CACHE_KEYS, CACHE_TTL } from "@/lib/cache";

export async function getRoles(orgId: string) {
  return cached(
    CACHE_KEYS.rolesList(orgId),
    () =>
      db.query.roles.findMany({
        where: eq(roles.orgId, orgId),
        orderBy: [asc(roles.name)],
      }),
    { ttlSeconds: CACHE_TTL.LONG },
  );
}

export async function getRole(orgId: string, id: number) {
  return db.query.roles.findFirst({
    where: and(eq(roles.id, id), eq(roles.orgId, orgId)),
  });
}
