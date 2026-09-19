import { notFound } from "next/navigation";
import { requireModulePermission } from "@/lib/rbac/require-permission";
import { FilesPage } from "@/features/build/files/files-page";

export const metadata = {
  title: "Files | Project",
};

interface Props {
  params: Promise<{ projectId: string }>;
}

export default async function ProjectFilesRoute({ params }: Props) {
  await requireModulePermission("build", "build:files:view");
  const { projectId } = await params;
  const parsed = Number(projectId);
  if (!Number.isInteger(parsed) || parsed <= 0) notFound();
  return <FilesPage projectId={parsed} />;
}
