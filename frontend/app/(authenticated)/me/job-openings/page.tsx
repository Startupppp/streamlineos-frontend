import { requirePermission } from "@/lib/rbac/require-permission";
import { MyJobOpeningsPage } from "@/features/employee-self-service";

export default async function MyJobOpeningsRoute() {
  await requirePermission("self:job-openings");
  return <MyJobOpeningsPage />;
}
