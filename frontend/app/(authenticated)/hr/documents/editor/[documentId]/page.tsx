import { Suspense } from "react";
import { HydrationBoundary } from "@tanstack/react-query";
import { requirePermission } from "@/lib/rbac/require-permission";
import { prefetchHrRichDocument } from "@/lib/prefetch/hr-people";
import { DocumentEditorPage } from "@/features/hr/documents/document-editor-page";
import DocumentEditorLoading from "./loading";

async function DocumentEditorHydrated({ documentId }: { documentId: number }) {
  const state = await prefetchHrRichDocument(documentId);
  return (
    <HydrationBoundary state={state}>
      <DocumentEditorPage />
    </HydrationBoundary>
  );
}

export default async function HrDocumentEditorPage({
  params,
}: {
  params: Promise<{ documentId: string }>;
}) {
  await requirePermission("hr:documents:manage");
  const { documentId } = await params;
  const id = Number(documentId);
  return (
    <Suspense fallback={<DocumentEditorLoading />}>
      <DocumentEditorHydrated documentId={id} />
    </Suspense>
  );
}
