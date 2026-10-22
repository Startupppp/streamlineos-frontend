import { notFound } from "next/navigation";
import { ProjectDetailClient } from "@/features/inventory/components/materials/project-detail-client";

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const id = Number(projectId);
  if (!Number.isInteger(id) || id <= 0) notFound();
  return <ProjectDetailClient projectId={id} />;
}
