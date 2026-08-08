import { PersonDetailPage } from "@/features/directory/people/person-detail-page";
import { requirePermission } from "@/lib/rbac/require-permission";

interface SettingsDirectoryPersonRouteProps {
  params: Promise<{ personId: string }>;
}

export default async function SettingsDirectoryPersonRoute({
  params,
}: SettingsDirectoryPersonRouteProps) {
  await requirePermission("directory:people:view");
  const { personId } = await params;
  return (
    <PersonDetailPage
      organizationPersonId={personId}
      directoryBasePath="/settings/directory"
    />
  );
}
