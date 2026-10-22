import { requirePermission } from "@/lib/rbac/require-permission";
import { OvertimePage } from "@/features/hr/overtime/overtime-page";

export default async function Page() {
  await requirePermission("hr:attendance:view");
  return <OvertimePage />;
}
