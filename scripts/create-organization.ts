/**
 * Script to create an organization in production
 * 
 * Usage:
 *   npx tsx scripts/create-organization.ts "Organization Name" "org-slug" "owner-email"
 * 
 * Or with environment variables:
 *   OWNER_EMAIL=owner@example.com npx tsx scripts/create-organization.ts "Org Name" "org-slug"
 */

import { db } from "../lib/db";
import { organizations, organizationMembers, users } from "../lib/db/schema";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";

async function createOrganization(
  name: string,
  slug: string,
  ownerEmail: string
) {
  try {
    // 1. Find the owner user
    const owner = await db.query.users.findFirst({
      where: eq(users.email, ownerEmail),
    });

    if (!owner) {
      throw new Error(`User with email ${ownerEmail} not found`);
    }

    // 2. Check if slug is taken
    const existing = await db.query.organizations.findFirst({
      where: eq(organizations.slug, slug),
    });

    if (existing) {
      throw new Error(`Organization with slug "${slug}" already exists`);
    }

    // 3. Create organization
    const orgId = nanoid();
    await db.insert(organizations).values({
      id: orgId,
      name,
      slug,
    });

    // 4. Add creator as owner
    await db.insert(organizationMembers).values({
      userId: owner.id,
      orgId,
      role: "OWNER",
    });

    return { id: orgId, name, slug };
  } catch (error) {
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.length < 2) {
    console.error("Usage: npx tsx scripts/create-organization.ts \"Organization Name\" \"org-slug\" \"owner-email\"");
    process.exit(1);
  }

  const [name, slug, ownerEmail] = args;
  const finalOwnerEmail = ownerEmail || process.env.OWNER_EMAIL;

  if (!finalOwnerEmail) {
    console.error("Owner email is required");
    process.exit(1);
  }

  console.log(`Creating organization: ${name} (${slug}) for ${finalOwnerEmail}...`);
  
  createOrganization(name, slug, finalOwnerEmail)
    .then((result) => {
      console.log("✅ Organization created successfully!");
      console.log(`   ID: ${result.id}`);
      console.log(`   Name: ${result.name}`);
      console.log(`   Slug: ${result.slug}`);
      console.log(`   Owner: ${finalOwnerEmail}`);
      process.exit(0);
    })
    .catch((error) => {
      console.error("❌ Failed to create organization:");
      console.error(error.message || error);
      process.exit(1);
    });
}

export { createOrganization };
