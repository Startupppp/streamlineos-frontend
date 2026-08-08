import type { Metadata } from "next";
import { PeopleDirectoryPage } from "@/features/directory/people/people-directory-page";
import { requirePermission } from "@/lib/rbac/require-permission";

export const metadata: Metadata = {
  title: "Directory | StreamlineOS",
};

export default async function SettingsDirectoryRoute() {
  await requirePermission("directory:people:view");
  return <PeopleDirectoryPage basePath="/settings/directory" />;
}
