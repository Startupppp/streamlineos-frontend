import { requirePermission } from "@/lib/rbac/require-permission";
import { PersonDetailPage } from "@/features/directory/people/person-detail-page";

interface DirectoryPersonRouteProps {
  params: Promise<{ personId: string }>;
}

export default async function DirectoryPersonRoute({ params }: DirectoryPersonRouteProps) {
  await requirePermission("directory:people:view");
  const { personId } = await params;
  return <PersonDetailPage organizationPersonId={personId} />;
}
