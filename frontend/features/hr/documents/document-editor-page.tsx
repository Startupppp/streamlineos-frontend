"use client";

import { getErrorMessage } from "@/lib/get-error-message";
import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useRichDocument, useUpdateRichDocument, usePublishRichDocument } from "@/hooks/api/hr";
import dynamic from "next/dynamic";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Save, Globe, GlobeLock } from "lucide-react";
import Link from "next/link";
import { UnsavedChangesDialog } from "@/components/ui/unsaved-changes-dialog";
import { useUnsavedChangesGuard } from "@/hooks/common/use-unsaved-changes-guard";
import { ErrorState } from "@/components/shared/error-state";

const TiptapEditor = dynamic(
  () => import("@/components/editor/tiptap-editor").then((m) => ({ default: m.TiptapEditor })),
  { ssr: false, loading: () => <Skeleton className="h-96 w-full rounded-lg" /> },
);

export function DocumentEditorPage() {
  const params = useParams<{ documentId: string }>();
  const documentId = Number(params.documentId);

  const updateDoc = useUpdateRichDocument();
  const publishDoc = usePublishRichDocument();
  const { data: doc, isLoading, isError, error, refetch } = useRichDocument(documentId);
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [contentJson, setContentJson] = useState<unknown>(null);
  const [isDirty, setIsDirty] = useState(false);
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!doc) return;
    const timeoutId = window.setTimeout(() => {
      setTitle(doc.title);
      setContentJson(doc.contentJson);
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [doc]);

  const handleSave = useCallback(async () => {
    if (!isDirty) return;
    await updateDoc.mutateAsync({ documentId, title, contentJson });
    setIsDirty(false);
    toast.success("Document saved");
  }, [documentId, title, contentJson, isDirty, updateDoc]);

  useEffect(() => {
    if (!isDirty) return;
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => {
      void handleSave().catch((e) => toast.error(getErrorMessage(e)));
    }, 30_000);
    return () => {
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    };
  }, [isDirty, handleSave]);

  const handleContentChange = useCallback((json: Record<string, unknown>) => {
    setContentJson(json);
    setIsDirty(true);
  }, []);

  const handleTitleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setTitle(e.target.value);
    setIsDirty(true);
  }, []);

  const handlePublish = useCallback(() => {
    publishDoc.mutate(documentId, {
      onSuccess: () => toast.success(doc?.isPublished ? "Document unpublished" : "Document published"),
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  }, [documentId, publishDoc, doc?.isPublished]);

  const { requestLeave, dialogProps } = useUnsavedChangesGuard({
    isDirty,
    onDiscard: () => {
      setTitle(doc?.title ?? "");
      setContentJson(doc?.contentJson ?? null);
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

  if (isLoading) {
    return (
      <PageWrapper title="Document Editor" subtitle="Loading...">
        <div className="flex flex-1 min-h-0 flex-col gap-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-[400px] w-full" />
        </div>
      </PageWrapper>
    );
  }

  if (isError) {
    return (
      <PageWrapper title="Document Editor" backHref="/hr/documents">
        <ErrorState
          title="Couldn't load document"
          description={getErrorMessage(error)}
          onRetry={() => void refetch()}
          className="flex-1"
        />
      </PageWrapper>
    );
  }

  if (!doc) {
    return (
      <PageWrapper title="Document Not Found" subtitle="The requested document could not be found.">
        <Button asChild><Link href="/hr/documents">Back to Documents</Link></Button>
      </PageWrapper>
    );
  }

  return (
    <>
      <PageWrapper
        title="Document Editor"
        subtitle={doc.templateType ? `Template: ${doc.templateType}` : undefined}
        onBack={() => requestLeave(() => router.push("/hr/documents"))}
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
              onClick={() => {
                void handleSave().catch((e) => toast.error(getErrorMessage(e)));
              }}
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
            className="rounded-none border-0 border-b px-0 text-lg font-semibold focus-visible:ring-0"
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
