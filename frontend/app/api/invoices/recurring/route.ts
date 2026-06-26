import { withAuth, ok, err } from "@/lib/api/helpers";
import { listRecurring } from "@/lib/services/recurring-invoices";

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function GET() {
  return withAuth(async (session) => {
    try {
      const data = await listRecurring(session.orgId, todayIso());
      return ok(data);
    } catch (error) {
      return err(
        "Failed to load recurring invoices",
        500,
      );
    }
  });
}
