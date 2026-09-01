import { ModulesPage } from "@/features/build/modules/modules-page";

export default async function Page({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  return <ModulesPage projectId={Number(projectId)} />;
}
