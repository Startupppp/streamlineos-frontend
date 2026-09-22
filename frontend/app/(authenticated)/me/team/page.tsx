import { ManagerHomePage } from "@/features/me/team/manager-home-page";
import { requireSession } from "@/lib/rbac/require-permission";

export default async function MyTeamPage() {
  await requireSession();
  return <ManagerHomePage />;
}
