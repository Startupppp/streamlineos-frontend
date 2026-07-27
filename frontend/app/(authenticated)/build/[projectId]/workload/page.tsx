import { redirect } from "next/navigation";

interface PageProps {
  params: Promise<{ projectId: string }>;
}

export default async function WorkloadRedirectPage({ params }: PageProps) {
  const { projectId } = await params;
  redirect(`/build/${projectId}?view=workload`);
}
