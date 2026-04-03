import { type NextRequest } from "next/server";
import { withAuth, ok, err } from "@/lib/api/helpers";
import { getBranches } from "@/server/queries/branches";
import { db } from "@/lib/db";
import { branches, users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";

const createSchema = z.object({
  name: z.string().min(1),
  code: z.string().min(1),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
  pincode: z.string().optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
  branchManagerId: z.string().optional(),
  branchHrId: z.string().optional(),
});

export async function GET() {
  return withAuth(async (session) => {
    try {
      const data = await getBranches(session.orgId);
      return ok(data);
    } catch (error) {
      return err(
        error instanceof Error ? error.message : "Failed to load branches",
        500
      );
    }
  });
}

export async function POST(req: NextRequest) {
  return withAuth(async (session) => {
    try {
      const role = session.user.role ?? "";
      if (!["HR", "CEO"].includes(role)) {
        return err("Only HR/CEO can create branches", 403);
      }

      const body = await req.json();
      const input = createSchema.parse(body);

      const [branch] = await db
        .insert(branches)
        .values({ orgId: session.orgId, ...input })
        .returning();

      if (input.branchManagerId) {
        await db
          .update(users)
          .set({ branchId: branch.id })
          .where(eq(users.id, input.branchManagerId));
      }
      if (input.branchHrId) {
        await db
          .update(users)
          .set({ branchId: branch.id })
          .where(eq(users.id, input.branchHrId));
      }

      return ok(branch, 201);
    } catch (error) {
      return err(
        error instanceof Error ? error.message : "Failed to create branch",
        500
      );
    }
  });
}
