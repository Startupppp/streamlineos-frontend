import { type NextRequest } from "next/server";
import { withAbility, ok, err, parseBody, serverErr } from "@/lib/api/helpers";
import { getVendor } from "@/server/queries/inventory/vendors";
import { updateVendor, updateVendorSchema } from "@/lib/services/inventory/vendors";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ vendorId: string }> },
) {
  return withAbility("read", "inventory:vendors", async (session) => {
    try {
      const { vendorId: id } = await params;
      const vendorId = Number(id);
      if (!Number.isFinite(vendorId)) return err("Invalid ID", 400);

      const vendor = await getVendor(session.orgId, vendorId);
      if (!vendor) return err("Vendor not found", 404);
      return ok(vendor);
    } catch (error) {
      return serverErr("Failed to load vendor", error);
    }
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ vendorId: string }> },
) {
  return withAbility("update", "inventory:vendors", async (session) => {
    try {
      const { vendorId: id } = await params;
      const vendorId = Number(id);
      if (!Number.isFinite(vendorId)) return err("Invalid ID", 400);

      const existing = await getVendor(session.orgId, vendorId);
      if (!existing) return err("Vendor not found", 404);

      const input = await parseBody(req, updateVendorSchema);
      const updated = await updateVendor(session.orgId, vendorId, input);
      return ok(updated);
    } catch (error) {
      return serverErr("Failed to update vendor", error);
    }
  });
}
