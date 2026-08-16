import { AllWorkPage } from "@/features/build/all-work/all-work-page";

export const metadata = {
  title: "All Work | Projects",
};

interface Props {
  params: Promise<{ pmWorkspaceId: string }>;
}

export default async function AllWorkRoute({ params }: Props) {
  const { pmWorkspaceId } = await params;
  return <AllWorkPage pmWorkspaceId={pmWorkspaceId} />;
}
