"use server";

import { db } from "@/lib/db";
import { attendance, payrolls, users } from "@/lib/db/schema";
import { auth } from "@clerk/nextjs/server";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function generatePayroll(month: string) { // YYYY-MM
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  // Fetch all users
  const allUsers = await db.select().from(users);

  for (const user of allUsers) {
      // 1. Calculate Attendance
      // For MVP, simplistic: Count distinct days present in that month
      // In real app, date range query
      
      // Mocking salary structure for now as it's not in DB yet (or stored in metadata)
      // Assuming Basic = 50000
      const basic = 50000;
      const hra = basic * 0.4;
      const allowances = 5000;
      const deductions = 2000; // PT + PF

      const gross = basic + hra + allowances;
      const net = gross - deductions;

      // Check if payroll already exists
      const existing = await db.query.payrolls.findFirst({
        where: and(eq(payrolls.userId, user.id), eq(payrolls.month, month))
      });

      if (!existing) {
        await db.insert(payrolls).values({
            userId: user.id,
            month,
            basicSalary: basic.toString(),
            hra: hra.toString(),
            allowances: allowances.toString(),
            deductions: deductions.toString(),
            grossSalary: gross.toString(),
            netSalary: net.toString(),
            status: "DRAFT",
            generatedBy: userId,
        });
      }
  }

  revalidatePath("/hr/payroll");
}

export async function getPayrolls() {
    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");

    // If admin, see all. If member, see own.
    // Syncing simplistic logic
    return await db.query.payrolls.findMany({
        where: eq(payrolls.userId, userId), // For now only showing own for safety
        orderBy: (payrolls, { desc }) => [desc(payrolls.createdAt)]
    });
}
