import { RequireModule } from "@/components/auth/require-module";
import { MyWorkPage } from "@/features/build/my-work/my-work-page";

interface Props {
  params: Promise<{ pmWorkspaceId: string }>;
}

export default async function MyWorkRoute({ params }: Props) {
  const { pmWorkspaceId } = await params;
  return (
    <RequireModule module="build">
      <MyWorkPage pmWorkspaceId={pmWorkspaceId} />
    </RequireModule>
  );
}
