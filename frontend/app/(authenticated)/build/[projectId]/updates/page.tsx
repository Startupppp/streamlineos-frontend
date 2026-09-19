import { notFound } from "next/navigation";
import { requireModulePermission } from "@/lib/rbac/require-permission";
import { UpdatesPage } from "@/features/build/updates/updates-page";

export const metadata = {
  title: "Updates | Project",
};

interface Props {
  params: Promise<{ projectId: string }>;
}

export default async function ProjectUpdatesRoute({ params }: Props) {
  await requireModulePermission("build", "build:updates:view");
  const { projectId } = await params;
  const parsed = Number(projectId);
  if (!Number.isInteger(parsed) || parsed <= 0) notFound();
  return <UpdatesPage projectId={parsed} />;
}
