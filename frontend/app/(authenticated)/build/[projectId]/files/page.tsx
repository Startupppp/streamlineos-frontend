import { notFound } from "next/navigation";
import { enforceRouteAccess } from "@/lib/rbac/route-access/enforce-route-access";
import { FilesPage } from "@/features/build/files/files-page";

export const metadata = {
  title: "Files | Project",
};

interface Props {
  params: Promise<{ projectId: string }>;
}

export default async function ProjectFilesRoute({ params }: Props) {
  await enforceRouteAccess("/build/[projectId]/files");
  const { projectId } = await params;
  const parsed = Number(projectId);
  if (!Number.isInteger(parsed) || parsed <= 0) notFound();
  return <FilesPage projectId={parsed} />;
}
