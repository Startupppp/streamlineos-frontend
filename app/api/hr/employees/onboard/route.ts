import { withAdmin, ok, err } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { users, organizationMembers, salaryStructures } from "@/lib/db/schema";
import { formatDateOnly } from "@/lib/date-utils";
import { hash } from "bcryptjs";
import { randomUUID } from "crypto";
import type { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  return withAdmin(async (session) => {
    const body = await req.json() as {
      firstName: string;
      lastName: string;
      email: string;
      phone?: string;
      whatsappSameAsPhone?: boolean;
      whatsappNumber?: string;
      gender?: "MALE" | "FEMALE" | "OTHER";
      password?: string;
      designation: string;
      departmentId?: number;
      role?: string;
      employeeId?: string;
      joiningDate?: string;
      dateOfBirth?: string;
      skills?: string;
      experienceYears?: number;
      taxId?: string;
      monthlySalary?: number;
      bankDetails?: {
        accountNumber?: string;
        bankName?: string;
        branch?: string;
        ifsc?: string;
        accountHolder?: string;
        pfUanNumber?: string;
      };
    };

    if (!body.firstName || !body.lastName || !body.email || !body.designation) {
      return err("firstName, lastName, email, and designation are required.", 400);
    }

    const existing = await db.query.users.findFirst({
      where: (u, { eq }) => eq(u.email, body.email.toLowerCase()),
    });
    if (existing) {
      return err("A user with this email already exists.", 409);
    }

    const passwordHash = await hash(body.password || "Welcome@123", 12);
    const userId = randomUUID();

    const [newUser] = await db
      .insert(users)
      .values({
        id: userId,
        email: body.email.toLowerCase(),
        name: `${body.firstName} ${body.lastName}`,
        firstName: body.firstName,
        lastName: body.lastName,
        phone: body.phone,
        whatsappNumber: body.whatsappSameAsPhone ? body.phone : body.whatsappNumber,
        gender: body.gender,
        password: passwordHash,
        designation: body.designation,
        departmentId: body.departmentId,
        role: body.role || "ENGINEERING",
        employeeId: body.employeeId,
        joiningDate: body.joiningDate ? formatDateOnly(new Date(body.joiningDate)) : undefined,
        dateOfBirth: body.dateOfBirth ? formatDateOnly(new Date(body.dateOfBirth)) : undefined,
        skills: body.skills ? body.skills.split(",").map((s) => s.trim()) : undefined,
        experienceYears: body.experienceYears?.toString(),
        taxId: body.taxId,
        monthlySalary: body.monthlySalary?.toString(),
        bankDetails: body.bankDetails as typeof users.$inferInsert["bankDetails"],
        isActive: true,
        hasDashboardAccess: true,
        isPasswordChangeRequired: true,
      })
      .returning();

    await db.insert(organizationMembers).values({
      orgId: session.orgId,
      userId: newUser.id,
      role: "member",
    });

    if (body.monthlySalary && body.monthlySalary > 0) {
      const basicSalary = body.monthlySalary * 0.5;
      await db.insert(salaryStructures).values({
        orgId: session.orgId,
        userId: newUser.id,
        basicSalary: basicSalary.toString(),
        hraPercentage: "40",
        allowances: (body.monthlySalary * 0.2).toString(),
        deductions: "0",
        effectiveFrom: body.joiningDate
          ? formatDateOnly(new Date(body.joiningDate))
          : formatDateOnly(new Date()),
        isActive: true,
      });
    }

    return ok({ success: true });
  });
}
