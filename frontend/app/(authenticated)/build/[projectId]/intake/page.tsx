import { IntakePage } from "@/features/build/intake/intake-page";

export default async function Page({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  return <IntakePage projectId={Number(projectId)} />;
}
