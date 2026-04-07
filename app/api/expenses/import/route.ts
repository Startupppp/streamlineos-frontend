import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { expenses, organizationMembers } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { logger } from "@/lib/logger";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_ROWS = 10_000;

const ALLOWED_CATEGORIES = new Set([
  "Travel", "Food", "Office Supplies", "Software", "Hardware",
  "Marketing", "Entertainment", "Utilities", "Rent", "Insurance",
  "Salary", "Miscellaneous", "Other",
]);

/** Strip leading formula injection characters from CSV cell values */
function sanitizeCell(value: string): string {
  return value.replace(/^[=+\-@\t\r]+/, "").trim();
}

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

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "File too large (max 5MB)" }, { status: 400 });
    }

    const text = await file.text();
    const lines = text.split("\n").filter((l) => l.trim());
    if (lines.length < 2) {
      return NextResponse.json({ error: "File must contain a header row and at least one data row" }, { status: 400 });
    }

    // Parse CSV headers
    const headers = lines[0].split(",").map((h) => h.trim().toLowerCase().replace(/['"]/g, ""));
    const rows = lines.slice(1, MAX_ROWS + 1);

    const batchValues: Array<{
      orgId: string;
      userId: string;
      category: string;
      amount: string;
      description: string;
      merchant: string;
      paymentMethod: string | null;
      expenseDate: string;
      status: "PENDING";
    }> = [];

    let skipped = 0;
    for (const row of rows) {
      const values = row.split(",").map((v) => v.trim().replace(/^["']|["']$/g, ""));
      const record: Record<string, string> = {};
      headers.forEach((h, i) => {
        record[h] = values[i] || "";
      });

      const rawCategory = sanitizeCell(record.category || "Other");
      const category = ALLOWED_CATEGORIES.has(rawCategory) ? rawCategory : "Other";
      const amount = parseFloat(record.amount);
      if (isNaN(amount) || amount <= 0 || amount > 100_000_000) {
        skipped++;
        continue;
      }

      const description = sanitizeCell(record.description || "");
      const merchant = sanitizeCell(record.merchant || "");
      const paymentMethod = sanitizeCell(
        record.paymentmethod || record["payment_method"] || record["payment method"] || ""
      );
      const expenseDate =
        record.expensedate || record["expense_date"] || record["expense date"] || record.date || "";

      // Validate date format (YYYY-MM-DD)
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      const validDate = dateRegex.test(expenseDate) ? expenseDate : new Date().toISOString().split("T")[0];

      batchValues.push({
        orgId: member.orgId,
        userId: session.user.id,
        category,
        amount: amount.toString(),
        description: description.slice(0, 500),
        merchant: merchant.slice(0, 200),
        paymentMethod: paymentMethod || null,
        expenseDate: validDate,
        status: "PENDING",
      });
    }

    if (batchValues.length > 0) {
      // Insert in batches of 500 to avoid query size limits
      for (let i = 0; i < batchValues.length; i += 500) {
        const batch = batchValues.slice(i, i + 500);
        await db.insert(expenses).values(batch);
      }
    }

    return NextResponse.json({
      success: true,
      count: batchValues.length,
      skipped,
      ...(rows.length >= MAX_ROWS ? { warning: `Only first ${MAX_ROWS} rows were processed` } : {}),
    });
  } catch (error) {
    logger.error("Expense import error", { error: error instanceof Error ? error.message : "Unknown" });
    return NextResponse.json({ error: "Failed to import expenses" }, { status: 500 });
  }
}
