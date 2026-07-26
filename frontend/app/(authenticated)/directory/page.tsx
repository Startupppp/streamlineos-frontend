import { requirePermission } from "@/lib/rbac/require-permission";
import { PeopleDirectoryPage } from "@/features/directory/people/people-directory-page";

export default async function DirectoryRoute() {
  await requirePermission("directory:people:view");
  return <PeopleDirectoryPage />;
}
