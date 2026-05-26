import { type NextRequest } from "next/server";
import { withAuth, ok, err } from "@/lib/api/helpers";
import { getBranches } from "@/server/queries/branches";
import { db } from "@/lib/db";
import { branches, users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { isOptionalPhoneValid } from "@/lib/phone";

const optionalTrimmed = z
  .string()
  .transform((v) => v.trim())
  .optional()
  .transform((v) => (v && v.length > 0 ? v : undefined));

const createSchema = z.object({
  name: z.string().trim().min(2, "Branch name is required"),
  code: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9-]{2,20}$/, "Invalid branch code format"),
  city: optionalTrimmed,
  state: optionalTrimmed,
  country: optionalTrimmed,
  pincode: optionalTrimmed.refine((v) => !v || /^[A-Za-z0-9 -]{3,12}$/.test(v), {
    message: "Invalid pincode",
  }),
  address: optionalTrimmed,
  phone: optionalTrimmed.refine((v) => isOptionalPhoneValid(v), {
    message: "Invalid phone number",
  }),
  email: optionalTrimmed.refine((v) => !v || z.string().email().safeParse(v).success, {
    message: "Invalid email",
  }),
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
