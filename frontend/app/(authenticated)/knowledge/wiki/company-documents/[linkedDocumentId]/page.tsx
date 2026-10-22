import { Suspense } from "react";
import { notFound } from "next/navigation";
import { HydrationBoundary } from "@tanstack/react-query";
import { requireSession } from "@/lib/rbac/require-permission";
import { RequireModule } from "@/components/auth/require-module";
import CompanyDocumentDetailPage from "@/features/wiki/components/company-document-detail-page";
import { prefetchKbCompanyDocumentDetail } from "@/lib/prefetch/knowledge";
import CompanyDocumentLoading from "./loading";

interface Props {
  params: Promise<{ linkedDocumentId: string }>;
}

async function CompanyDocumentDetailHydrated({ params }: Props) {
  const { linkedDocumentId } = await params;
  await requireSession();
  const id = Number(linkedDocumentId);
  if (!Number.isInteger(id) || id <= 0) notFound();
  const state = await prefetchKbCompanyDocumentDetail(id);
  return (
    <HydrationBoundary state={state}>
      <RequireModule module="kb">
        <CompanyDocumentDetailPage linkedDocumentId={id} />
      </RequireModule>
    </HydrationBoundary>
  );
}

export default function KnowledgeBaseCompanyDocumentRoute({ params }: Props) {
  return (
    <Suspense fallback={<CompanyDocumentLoading />}>
      <CompanyDocumentDetailHydrated params={params} />
    </Suspense>
  );
}
