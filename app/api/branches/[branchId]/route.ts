import { type NextRequest } from "next/server";
import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { getBranch } from "@/server/queries/branches";
import { db } from "@/lib/db";
import { branches } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";

const optionalTrimmed = z
  .string()
  .transform((v) => v.trim())
  .optional()
  .transform((v) => (v && v.length > 0 ? v : undefined));

const hasLetter = (v: string) => /[a-zA-Z]/.test(v);
const noConsecutiveSpaces = (v: string) => !/\s{2}/.test(v);

const updateSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Branch name is required")
    .max(100, "Branch name must be at most 100 characters")
    .refine(hasLetter, "Branch name must contain at least one letter")
    .refine(noConsecutiveSpaces, "Branch name must not contain consecutive spaces")
    .optional(),
  code: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9]{2,20}$/, "Branch code must be 2–20 alphanumeric characters")
    .optional(),
  city: optionalTrimmed
    .refine((v) => !v || hasLetter(v), "City must contain at least one letter")
    .refine((v) => !v || v.length <= 100, "City must be at most 100 characters"),
  state: optionalTrimmed
    .refine((v) => !v || hasLetter(v), "State must contain at least one letter")
    .refine((v) => !v || v.length <= 100, "State must be at most 100 characters"),
  country: optionalTrimmed,
  pincode: optionalTrimmed.refine((v) => !v || /^[A-Za-z0-9]{4,10}$/.test(v), {
    message: "Pin code must be 4–10 alphanumeric characters",
  }),
  address: optionalTrimmed.refine((v) => !v || v.length <= 500, {
    message: "Address must be at most 500 characters",
  }),
  phone: optionalTrimmed.refine(
    (v) => {
      if (!v) return true;
      if (/[a-zA-Z]/.test(v)) return false;
      const digits = v.replace(/[+\s-]/g, "");
      return digits.length >= 7 && digits.length <= 15;
    },
    { message: "Phone number must have 7–15 digits and no letters" }
  ),
  email: optionalTrimmed.refine((v) => !v || z.string().email().safeParse(v).success, {
    message: "Enter a valid email address",
  }),
  branchManagerId: z.string().optional(),
  branchHrId: z.string().optional(),
  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ branchId: string }> }
) {
  return withAuth(async (session) => {
    try {
      const { branchId: id } = await params;
      const branchId = Number(id);
      if (!Number.isFinite(branchId)) return err("Invalid ID", 400);

      const branch = await getBranch(session.orgId, branchId);
      if (!branch) return err("Branch not found", 404);
      return ok(branch);
    } catch (error) {
      return err(
        error instanceof Error ? error.message : "Failed to load branch",
        500
      );
    }
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ branchId: string }> }
) {
  return withAuth(async (session) => {
    try {
      const role = session.user.role ?? "";
      if (!["HR", "CEO"].includes(role)) {
        return err("Forbidden", 403);
      }

      const { branchId: id } = await params;
      const branchId = Number(id);
      if (!Number.isFinite(branchId)) return err("Invalid ID", 400);

      const data = await parseBody(req, updateSchema);

      const [updated] = await db
        .update(branches)
        .set({ ...data, updatedAt: new Date() })
        .where(
          and(eq(branches.id, branchId), eq(branches.orgId, session.orgId))
        )
        .returning();

      if (!updated) return err("Branch not found", 404);
      return ok(updated);
    } catch (error) {
      return err(
        error instanceof Error ? error.message : "Failed to update branch",
        500
      );
    }
  });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ branchId: string }> }
) {
  return withAuth(async (session) => {
    try {
      const role = session.user.role ?? "";
      if (!["HR", "CEO"].includes(role)) {
        return err("Forbidden", 403);
      }

      const { branchId: id } = await params;
      const branchId = Number(id);
      if (!Number.isFinite(branchId)) return err("Invalid ID", 400);

      const [deleted] = await db
        .delete(branches)
        .where(
          and(eq(branches.id, branchId), eq(branches.orgId, session.orgId))
        )
        .returning();

      if (!deleted) return err("Branch not found", 404);
      return ok({ success: true });
    } catch (error) {
      return err(
        error instanceof Error ? error.message : "Failed to delete branch",
        500
      );
    }
  });
}
