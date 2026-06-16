import { type NextRequest } from "next/server";
import { withAuth, ok, err } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET(req: NextRequest) {
  return withAuth(async () => {
    const email = new URL(req.url).searchParams.get("email");
    if (!email) return err("Email is required", 400);

    const existing = await db.query.users.findFirst({
      where: eq(users.email, email.toLowerCase().trim()),
      columns: { id: true },
    });

    return ok({ exists: !!existing });
  });
}
