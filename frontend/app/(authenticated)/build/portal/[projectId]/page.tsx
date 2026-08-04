import { redirect } from "next/navigation";

interface PageProps {
  params: Promise<{ projectId: string }>;
}

export default async function LegacyBuildPortalProjectRedirect({
  params,
}: PageProps) {
  const { projectId } = await params;
  redirect(`/portal/${projectId}`);
}
