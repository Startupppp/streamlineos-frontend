import { requirePermission } from "@/lib/rbac/require-permission";
import { PersonalApiTokensPage } from "@/features/settings/api-tokens/personal-api-tokens-page";

export default async function PersonalApiTokensRoute() {
  await requirePermission("settings:api-tokens:read");
  return <PersonalApiTokensPage />;
}
