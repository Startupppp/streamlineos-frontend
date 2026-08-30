import { PersonDetailPage } from "@/features/directory/people/person-detail-page";
import { requirePermission } from "@/lib/rbac/require-permission";

interface DirectorySettingsPersonRouteProps {
  params: Promise<{ personId: string }>;
}

export default async function DirectorySettingsPersonRoute({
  params,
}: DirectorySettingsPersonRouteProps) {
  await requirePermission("directory:people:view");
  const { personId } = await params;
  return (
    <PersonDetailPage
      organizationPersonId={personId}
      directoryBasePath="/directory/settings"
    />
  );
}
