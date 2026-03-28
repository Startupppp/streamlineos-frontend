import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { expenses, organizationMembers } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const member = await db.query.organizationMembers.findFirst({
      where: eq(organizationMembers.userId, session.user.id),
    });
    if (!member) {
      return NextResponse.json({ error: "No organization found" }, { status: 400 });
    }

    const isAdmin = member.role === "CEO" || member.role === "HR" || member.role === "ADMIN";
    if (!isAdmin) {
      return NextResponse.json({ error: "Only HR and CEO can import expenses" }, { status: 403 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const text = await file.text();
    const lines = text.split("\n").filter((l) => l.trim());
    if (lines.length < 2) {
      return NextResponse.json({ error: "File must contain a header row and at least one data row" }, { status: 400 });
    }

    // Parse CSV: expected headers: category, amount, description, merchant, paymentMethod, expenseDate
    const headers = lines[0].split(",").map((h) => h.trim().toLowerCase().replace(/['"]/g, ""));
    const rows = lines.slice(1);

    let imported = 0;
    for (const row of rows) {
      const values = row.split(",").map((v) => v.trim().replace(/^["']|["']$/g, ""));
      const record: Record<string, string> = {};
      headers.forEach((h, i) => {
        record[h] = values[i] || "";
      });

      const category = record.category || "Other";
      const amount = parseFloat(record.amount);
      if (isNaN(amount) || amount <= 0) continue;

      const description = record.description || "";
      const merchant = record.merchant || "";
      const paymentMethod = record.paymentmethod || record["payment_method"] || record["payment method"] || "";
      const expenseDate = record.expensedate || record["expense_date"] || record["expense date"] || record.date || new Date().toISOString().split("T")[0];

      await db.insert(expenses).values({
        orgId: member.orgId,
        userId: session.user.id,
        category,
        amount: amount.toString(),
        description,
        merchant,
        paymentMethod: paymentMethod || null,
        expenseDate,
        status: "PENDING",
      });
      imported++;
    }

    return NextResponse.json({ success: true, count: imported });
  } catch (error) {
    console.error("Expense import error:", error);
    return NextResponse.json({ error: "Failed to import expenses" }, { status: 500 });
  }
}
