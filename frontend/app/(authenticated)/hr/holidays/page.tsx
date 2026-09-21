import { requirePermission } from "@/lib/rbac/require-permission";
import { HolidaysPage } from "@/features/hr/holidays/holidays-page";

export default async function Page() {
  await requirePermission("self:attendance");
  return <HolidaysPage />;
}
