"server-only";

import { db } from "@/lib/db";
import { assets } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import type { Asset } from "@/types/hr";

export async function getAssets(orgId: string): Promise<Asset[]> {
  return db.query.assets.findMany({
    where: eq(assets.orgId, orgId),
    orderBy: [desc(assets.createdAt)],
  }) as unknown as Promise<Asset[]>;
}
