import type { Metadata } from "next";
import { PeopleDirectoryPage } from "@/features/directory/people/people-directory-page";
import { requirePermission } from "@/lib/rbac/require-permission";

export const metadata: Metadata = {
  title: "People Records",
};

export default async function DirectorySettingsRoute() {
  await requirePermission("directory:people:view");
  return (
    <PeopleDirectoryPage
      basePath="/directory/settings"
      title="People Records"
      subtitle="Manage person records for this organisation. This count may differ from team members in Settings, since not every member has a person record."
    />
  );
}
