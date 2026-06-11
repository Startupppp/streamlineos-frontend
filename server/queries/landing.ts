"server-only";

import { eq, and } from "drizzle-orm";
import { db } from "@/lib/db";
import { landingPages } from "@/lib/db/schema/marketing";

export interface LandingPageMetadataDTO {
  title: string | null;
  description: string | null;
}

export interface LandingPageDTO {
  id: number;
  orgId: string;
  title: string | null;
  content: string | null;
  description: string | null;
  settings: typeof landingPages.$inferSelect["settings"];
}

export async function getLandingPageMetadataBySlug(
  slug: string,
): Promise<LandingPageMetadataDTO | null> {
  const [page] = await db
    .select({ title: landingPages.title, description: landingPages.description })
    .from(landingPages)
    .where(and(eq(landingPages.slug, slug), eq(landingPages.isPublished, true)));
  return page ?? null;
}

export async function getLandingPageBySlug(
  slug: string,
): Promise<LandingPageDTO | null> {
  const [page] = await db
    .select({
      id: landingPages.id,
      orgId: landingPages.orgId,
      title: landingPages.title,
      content: landingPages.content,
      description: landingPages.description,
      settings: landingPages.settings,
    })
    .from(landingPages)
    .where(and(eq(landingPages.slug, slug), eq(landingPages.isPublished, true)));
  return page ?? null;
}
