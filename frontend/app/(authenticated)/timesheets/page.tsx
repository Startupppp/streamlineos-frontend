import { requirePermission } from "@/lib/rbac/require-permission";
import { MyTimeView } from "@/features/timesheets-core/my-time";

export default async function TimesheetsPage() {
  await requirePermission("timesheets:entries:view");
  return <MyTimeView />;
}
