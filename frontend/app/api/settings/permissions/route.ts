import { withAuth, ok } from "@/lib/api/helpers";
import { PERMISSIONS } from "@/lib/rbac/permissions";

export async function GET() {
  return withAuth(async () => {
    return ok(PERMISSIONS);
  });
}
