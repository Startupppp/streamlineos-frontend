import { type NextRequest } from "next/server";
import { revalidateTag } from "next/cache";
import { withAbility, ok, err, parseBody, parseQuery } from "@/lib/api/helpers";
import { getInvoices } from "@/server/queries/invoice";
import { CacheTag, orgScopedTag } from "@/lib/api/cache-tags";
import {
  createInvoice,
  createInvoiceSchema,
  listInvoicesSchema,
} from "@/lib/services/invoices";

export async function GET(req: NextRequest) {
  return withAbility("read", "accounting", async (session) => {
    try {
      const { status, clientId, page, limit } = parseQuery(req, listInvoicesSchema);
      const data = await getInvoices(session.orgId, { status, clientId, page, limit });
      return ok(data);
    } catch (error) {
      return err(
        error instanceof Error ? error.message : "Failed to load invoices",
        500,
      );
    }
  });
}

export async function POST(req: NextRequest) {
  return withAbility("create", "accounting", async (session) => {
    try {
      const input = await parseBody(req, createInvoiceSchema);
      const { invoice, posted } = await createInvoice(session.orgId, session.user.id, input);

      if (posted) {
        revalidateTag(orgScopedTag(CacheTag.journal, session.orgId), "default");
        revalidateTag(orgScopedTag(CacheTag.trialBalance, session.orgId), "default");
        revalidateTag(orgScopedTag(CacheTag.profitLoss, session.orgId), "default");
      }

      return ok(invoice, 201);
    } catch (error) {
      return err(
        error instanceof Error ? error.message : "Failed to create invoice",
        500,
      );
    }
  });
}
