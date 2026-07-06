import { ProgramDetailPage } from "@/features/projects/portfolios/program-detail-page";

interface Props {
  params: Promise<{ programId: string }>;
}

export default async function ProgramDetailRoute({ params }: Props) {
  const { programId } = await params;
  return <ProgramDetailPage programId={parseInt(programId, 10)} />;
}
