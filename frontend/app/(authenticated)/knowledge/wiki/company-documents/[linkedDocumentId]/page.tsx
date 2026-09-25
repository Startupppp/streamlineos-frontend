import { notFound } from "next/navigation";
import { requireSession } from "@/lib/rbac/require-permission";
import { RequireModule } from "@/components/auth/require-module";
import CompanyDocumentDetailPage from "@/features/wiki/components/company-document-detail-page";

interface Props {
  params: Promise<{ linkedDocumentId: string }>;
}

export default async function KnowledgeBaseCompanyDocumentRoute({ params }: Props) {
  const { linkedDocumentId } = await params;
  await requireSession();
  const id = Number(linkedDocumentId);
  if (!Number.isInteger(id) || id <= 0) notFound();
  return (
    <RequireModule module="kb">
      <CompanyDocumentDetailPage linkedDocumentId={id} />
    </RequireModule>
  );
}
