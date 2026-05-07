import { withAuth } from "@/lib/api/helpers";
import { getAssets } from "@/server/queries/hr";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { inArray } from "drizzle-orm";
import { NextResponse } from "next/server";

function csvEscape(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  const s = String(value);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export async function GET() {
  return withAuth(async (session) => {
    const rows = await getAssets(session.orgId);
    const assigneeIds = [
      ...new Set(
        rows
          .map((a) => a.assignedTo)
          .filter((id): id is string => Boolean(id))
      ),
    ];
    const nameById = new Map<string, string>();
    if (assigneeIds.length > 0) {
      const people = await db.query.users.findMany({
        where: inArray(users.id, assigneeIds),
        columns: { id: true, name: true },
      });
      for (const p of people) {
        nameById.set(p.id, p.name?.trim() || p.id);
      }
    }

    const header = [
      "name",
      "type",
      "serialNumber",
      "status",
      "assignedToName",
      "purchaseCost",
      "purchaseDate",
      "location",
      "notes",
    ];
    const lines = [header.join(",")];
    for (const a of rows) {
      const assignedName = a.assignedTo
        ? nameById.get(a.assignedTo) ?? a.assignedTo
        : "";
      lines.push(
        [
          csvEscape(a.name),
          csvEscape(a.type),
          csvEscape(a.serialNumber ?? ""),
          csvEscape(a.status ?? ""),
          csvEscape(assignedName),
          csvEscape(a.purchaseCost ?? ""),
          csvEscape(a.purchaseDate ?? ""),
          csvEscape(a.location ?? ""),
          csvEscape(a.notes ?? ""),
        ].join(",")
      );
    }

    const body = lines.join("\r\n");
    const filename = `assets-export-${new Date().toISOString().slice(0, 10)}.csv`;

    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  });
}
