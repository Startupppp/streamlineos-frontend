import { redirect } from "next/navigation";

interface PageProps {
  params: Promise<{ projectId: string }>;
}

export default async function WorkloadRedirectPage({ params }: PageProps) {
  const { projectId } = await params;
  redirect(`/projects/${projectId}?view=workload`);
}
