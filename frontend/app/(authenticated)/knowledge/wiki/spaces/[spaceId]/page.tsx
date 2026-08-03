import { requireSession } from "@/lib/rbac/require-permission";
import { RequireModule } from "@/components/auth/require-module";
import SpaceDetailPage from "@/features/knowledge-base/components/space-detail-page";

interface Props {
  params: Promise<{ spaceId: string }>;
}

export default async function KnowledgeBaseSpaceDetailPage({ params }: Props) {
  const { spaceId } = await params;
  await requireSession();
  return (
    <RequireModule module="kb">
      <SpaceDetailPage spaceId={Number(spaceId)} />
    </RequireModule>
  );
}
