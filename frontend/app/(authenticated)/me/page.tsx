import { EssHomePage } from "@/features/me/home/ess-home-page";
import { requireSession } from "@/lib/rbac/require-permission";

export default async function MyDayPage() {
  await requireSession();
  return <EssHomePage />;
}
