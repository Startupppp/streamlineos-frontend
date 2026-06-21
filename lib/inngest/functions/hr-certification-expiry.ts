import { inngest } from "../client";
import { db } from "@/lib/db";
import { certifications, users } from "@/lib/db/schema";
import { eq, and, gte, lte } from "drizzle-orm";
import { addDays, format } from "date-fns";

export const hrCertificationExpiry = inngest.createFunction(
  { id: "hr-certification-expiry", name: "HR Certification Expiry Check", triggers: { cron: "0 8 * * *" } },
  async ({ step }) => {
    return step.run("check-expiring-certifications", async () => {
      const now = new Date();
      const todayStr = format(now, "yyyy-MM-dd");
      const thirtyDaysStr = format(addDays(now, 30), "yyyy-MM-dd");

      const expiring = await db
        .select({
          id: certifications.id,
          orgId: certifications.orgId,
          userId: certifications.userId,
          name: certifications.name,
          issuingOrganization: certifications.issuingOrganization,
          expiryDate: certifications.expiryDate,
        })
        .from(certifications)
        .where(
          and(
            gte(certifications.expiryDate, todayStr),
            lte(certifications.expiryDate, thirtyDaysStr),
            eq(certifications.reminderSent, false),
          ),
        )
        .limit(500);

      if (expiring.length === 0) return { fired: 0 };

      const userIds = [...new Set(expiring.map((c) => c.userId))];
      const employeeRows = await db.query.users.findMany({
        where: (u, { inArray }) => inArray(u.id, userIds),
        columns: { id: true, name: true },
      });
      const nameMap = new Map(employeeRows.map((u) => [u.id, u.name ?? ""]));

      const { runAutomationsForEvent } = await import("@/lib/services/automation/engine");

      let fired = 0;
      for (const cert of expiring) {
        const expiryDateStr = cert.expiryDate ?? "";
        const daysUntilExpiry = expiryDateStr
          ? Math.ceil((new Date(expiryDateStr).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
          : 0;

        await runAutomationsForEvent(cert.orgId, "certification.expiring", {
          certificationId: cert.id,
          userId: cert.userId,
          employeeName: nameMap.get(cert.userId) ?? "",
          certificationName: cert.name,
          issuingOrganization: cert.issuingOrganization ?? null,
          expiryDate: expiryDateStr,
          daysUntilExpiry,
        });

        await db
          .update(certifications)
          .set({ reminderSent: true })
          .where(eq(certifications.id, cert.id));

        fired++;
      }

      return { fired };
    });
  },
);
