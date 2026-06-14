

process.env.DATABASE_URL ??= process.env.DB;

import { AUTHORS, CATEGORIES, POSTS, calcReadingTime, slugify } from "./seed-blog-data";

async function main() {
  const { db, client } = await import("../lib/db");
  const { blogDb, blogClient } = await import("../lib/blog-db");
  const { blogAuthors, blogCategories, blogPosts, users, organizations, organizationMembers } =
    await import("../lib/db/schema");
  const { eq, sql } = await import("drizzle-orm");
  const { hash } = await import("bcryptjs");
  const { nanoid } = await import("nanoid");

  console.log("🌱 Seeding blog...\n");

  let org = await db.query.organizations.findFirst();
  if (!org) {
    const orgId = nanoid();
    await db.insert(organizations).values({
      id: orgId,
      name: "StreamlineOS",
      slug: "streamlineos",
    });
    org = await db.query.organizations.findFirst();
    console.log("🏢 Created organization: StreamlineOS");
  } else {
    console.log(`🏢 Using existing organization: ${org.name}`);
  }
  if (!org) throw new Error("Failed to ensure an organization exists.");

  const editorEmail = "blog.editor@streamlineos.app";
  const editorPassword = "Blog@1234";
  const passwordHash = await hash(editorPassword, 12);

  const existingEditor = await db.query.users.findFirst({
    where: sql`lower(${users.email}) = ${editorEmail}`,
  });

  let editorId: string;
  if (existingEditor) {
    editorId = existingEditor.id;
    await db
      .update(users)
      .set({
        password: passwordHash,
        role: "BLOG_EDITOR",
        isActive: true,
        emailVerified: new Date(),
        loginAttempts: 0,
        lockedUntil: null,
      })
      .where(eq(users.id, editorId));
    console.log("👤 Updated blog editor login");
  } else {
    editorId = nanoid();
    await db.insert(users).values({
      id: editorId,
      name: "Blog Editor",
      firstName: "Blog",
      lastName: "Editor",
      email: editorEmail,
      password: passwordHash,
      role: "BLOG_EDITOR",
      isActive: true,
      emailVerified: new Date(),
    });
    console.log("👤 Created blog editor login");
  }

  await db
    .insert(organizationMembers)
    .values({ userId: editorId, orgId: org.id, role: "BLOG_EDITOR" })
    .onConflictDoNothing();

  await blogDb.transaction(async (tx) => {
    console.log("\n🧹 Clearing existing blog data...");
    await tx.delete(blogPosts);
    await tx.delete(blogCategories);
    await tx.delete(blogAuthors);

    console.log("✍️  Inserting authors...");
    const insertedAuthors = await tx.insert(blogAuthors).values(AUTHORS).returning();

    console.log("🏷️  Inserting categories...");
    const insertedCategories = await tx
      .insert(blogCategories)
      .values(
        CATEGORIES.map((c) => ({
          name: c.name,
          slug: slugify(c.name),
          description: c.description,
          color: c.color,
        })),
      )
      .returning();

    const categoryByName = new Map(insertedCategories.map((c) => [c.name, c.id]));

    console.log("📝 Inserting posts...");

    const base = new Date(2026, 5, 9, 12, 0, 0).getTime();
    const rows = POSTS.map((p, i) => {
      const ts = new Date(base - i * 60 * 1000);
      return {
        title: p.title,
        slug: slugify(p.title),
        excerpt: p.excerpt,
        content: p.content,
        coverImage: p.cover,
        categoryId: categoryByName.get(p.category) ?? null,
        authorId: insertedAuthors[0]?.id ?? null,
        status: p.status,
        isFeatured: p.featured ?? false,
        readingTime: calcReadingTime(p.content),
        metaTitle: p.title,
        metaDescription: p.excerpt,
        publishedAt: p.status === "published" ? ts : null,
        tags: p.tags,
        createdAt: ts,
        updatedAt: ts,
      };
    });
    await tx.insert(blogPosts).values(rows);

    console.log(
      `\n✅ Seeded ${insertedAuthors.length} authors, ${insertedCategories.length} categories, ${rows.length} posts.`,
    );
  });

  console.log("\n──────────────────────────────────────────");
  console.log("🔐 Blog admin login:");
  console.log(`   URL:      /blogs/admin`);
  console.log(`   Email:    ${editorEmail}`);
  console.log(`   Password: ${editorPassword}`);
  console.log("──────────────────────────────────────────\n");

  await client.end({ timeout: 5 });
  await blogClient.end({ timeout: 5 });
  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Blog seed failed:", err);
  process.exit(1);
});
