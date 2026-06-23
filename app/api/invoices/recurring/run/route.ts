import { revalidateTag } from "next/cache";
import { withAuth, ok, err } from "@/lib/api/helpers";
import { CacheTag, orgScopedTag } from "@/lib/api/cache-tags";
import { generateDueRecurringInvoices } from "@/lib/services/recurring-invoices";

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function POST() {
  return withAuth(async (session) => {
    try {
      const result = await generateDueRecurringInvoices(
        session.orgId,
        session.user.id,
        todayIso(),
      );

      if (result.generated > 0) {
        revalidateTag(orgScopedTag(CacheTag.journal, session.orgId), "default");
        revalidateTag(orgScopedTag(CacheTag.trialBalance, session.orgId), "default");
        revalidateTag(orgScopedTag(CacheTag.profitLoss, session.orgId), "default");
      }

      return ok(result);
    } catch (error) {
      return err(
        "Failed to generate recurring invoices",
        500,
      );
    }
  });
}
