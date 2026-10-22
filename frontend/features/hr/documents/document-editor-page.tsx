"use client";

import { getErrorMessage } from "@/lib/get-error-message";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useRichDocument, useUpdateRichDocument, usePublishRichDocument } from "@/hooks/api/hr";
import type { RichDocument } from "@/hooks/api/hr/rich-documents";
import dynamic from "next/dynamic";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { LoadingButton } from "@/components/ui/loading-button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Save, Globe, GlobeLock } from "lucide-react";
import { UnsavedChangesDialog } from "@/components/ui/unsaved-changes-dialog";
import { useUnsavedChangesGuard } from "@/hooks/common/use-unsaved-changes-guard";
import { PageState } from "@/components/shared/page-state";
import { usePageState } from "@/hooks/api/use-page-state";
import { EmptyState } from "@/components/ui/empty-state";

const TiptapEditor = dynamic(
  () => import("@/components/editor/tiptap-editor").then((m) => ({ default: m.TiptapEditor })),
  { ssr: false, loading: () => <Skeleton className="h-96 w-full rounded-lg" /> },
);

interface DocumentEditorFormProps {
  doc: RichDocument;
  documentId: number;
}

function DocumentEditorForm({ doc, documentId }: DocumentEditorFormProps) {
  const [title, setTitle] = useState(doc.title);
  const [contentJson, setContentJson] = useState<unknown>(doc.contentJson);
  const [isDirty, setIsDirty] = useState(false);
  const router = useRouter();

  const updateDoc = useUpdateRichDocument();
  const publishDoc = usePublishRichDocument();

  async function handleSave() {
    if (!isDirty) return;
    await updateDoc.mutateAsync({ documentId, title, contentJson });
    setIsDirty(false);
    toast.success("Document saved");
  }

  function saveAndReportFailure(): void {
    void handleSave().catch((error) => toast.error(getErrorMessage(error)));
  }

  useEffect(() => {
    if (!isDirty) return;
    const timer = setTimeout(async () => {
      try {
        await updateDoc.mutateAsync({ documentId, title, contentJson });
        setIsDirty(false);
        toast.success("Document saved");
      } catch (error) {
        toast.error(getErrorMessage(error));
      }
    }, 30_000);
    return () => clearTimeout(timer);
  }, [isDirty, documentId, title, contentJson, updateDoc]);

  const { requestLeave, dialogProps } = useUnsavedChangesGuard({
    isDirty,
    onDiscard: () => {
      setTitle(doc.title);
      setContentJson(doc.contentJson);
      setIsDirty(false);
    },
    onSave: async () => {
      try {
        await handleSave();
      } catch (e) {
        toast.error(getErrorMessage(e));
        throw e;
      }
    },
  });

  function handleBackToDocuments() {
    requestLeave(() => router.push("/hr/documents"));
  }

  function handlePublish() {
    publishDoc.mutate(documentId, {
      onSuccess: () => toast.success(doc.isPublished ? "Document unpublished" : "Document published"),
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  }

  function handleContentChange(json: Record<string, unknown>) {
    setContentJson(json);
    setIsDirty(true);
  }

  function handleTitleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setTitle(e.target.value);
    setIsDirty(true);
  }

  return (
    <>
      <PageWrapper
        title="Document Editor"
        subtitle={doc.templateType ? `Template: ${doc.templateType}` : undefined}
        onBack={handleBackToDocuments}
        actions={
          <div className="flex items-center gap-2">
            {isDirty && (
              <Badge variant="outline" className="text-status-warning-ink">
                Unsaved
              </Badge>
            )}
            <LoadingButton
              variant="outline"
              size="sm"
              onClick={handlePublish}
              isPending={publishDoc.isPending}
            >
              {!publishDoc.isPending &&
                (doc.isPublished ? (
                  <GlobeLock className="mr-1 h-4 w-4" />
                ) : (
                  <Globe className="mr-1 h-4 w-4" />
                ))}
              {doc.isPublished ? "Unpublish" : "Publish"}
            </LoadingButton>
            <LoadingButton
              size="sm"
              onClick={saveAndReportFailure}
              disabled={!isDirty}
              isPending={updateDoc.isPending}
              loadingText="Saving..."
            >
              <Save className="mr-1 h-4 w-4" />
              Save
            </LoadingButton>
          </div>
        }
      >
        <div className="mx-auto max-w-4xl space-y-4">
          <Input
            value={title}
            onChange={handleTitleChange}
            placeholder="Document title"
            className="rounded-none border-0 border-b px-0 text-lg font-semibold focus-visible:ring-0 focus-visible:border-primary"
          />
          <TiptapEditor
            content={contentJson}
            onChange={handleContentChange}
            placeholder="Start writing your document..."
          />
        </div>
      </PageWrapper>
      <UnsavedChangesDialog {...dialogProps} />
    </>
  );
}

export function DocumentEditorPage() {
  const params = useParams<{ documentId: string }>();
  const documentId = Number(params.documentId);

  const { data: doc, isLoading, isError, error, refetch } = useRichDocument(documentId);
  const pageState = usePageState({ permission: "hr:documents:view", isLoading, isError, error });

  if (pageState.kind === "loading") {
    return (
      <PageWrapper title="Document Editor" subtitle="Loading...">
        <div className="flex flex-1 min-h-0 flex-col gap-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-100 w-full" />
        </div>
      </PageWrapper>
    );
  }

  if (pageState.kind !== "ready" && pageState.kind !== "empty") {
    return (
      <PageWrapper title="Document Editor" backHref="/hr/documents">
        <PageState resolution={pageState} loading={null} onRetry={() => void refetch()} className="flex-1">
          {null}
        </PageState>
      </PageWrapper>
    );
  }

  if (!doc) {
    return (
      <PageWrapper title="Document Editor" backHref="/hr/documents">
        <EmptyState
          className="flex-1"
          illustrationPreset="documents"
          title="Document not found"
          description="This document no longer exists or has been removed."
          action={{ label: "Back to Documents", href: "/hr/documents" }}
        />
      </PageWrapper>
    );
  }

  return <DocumentEditorForm key={doc.id} doc={doc} documentId={documentId} />;
}
