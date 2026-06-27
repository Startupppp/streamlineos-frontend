import { type NextRequest } from "next/server";
import { withAbility, ok, err, parseBody, parseQuery, serverErr } from "@/lib/api/helpers";
import { getVendors } from "@/server/queries/inventory/vendors";
import {
  createVendor,
  createVendorSchema,
  listVendorsSchema,
} from "@/lib/services/inventory/vendors";

export async function GET(req: NextRequest) {
  return withAbility("read", "inventory:vendors", async (session) => {
    try {
      const { isActive, page, limit } = parseQuery(req, listVendorsSchema);
      const data = await getVendors(session.orgId, { isActive, page, limit });
      return ok(data);
    } catch (error) {
      return serverErr("Failed to load vendors", error);
    }
  });
}

export async function POST(req: NextRequest) {
  return withAbility("create", "inventory:vendors", async (session) => {
    try {
      const input = await parseBody(req, createVendorSchema);
      const vendor = await createVendor(session.orgId, session.user.id, input);
      return ok(vendor, 201);
    } catch (error) {
      return serverErr("Failed to create vendor", error);
    }
  });
}
