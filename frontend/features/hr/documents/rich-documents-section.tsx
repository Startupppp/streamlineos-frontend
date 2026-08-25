"use client";

import { useState, useCallback } from "react";
import { FileText, Globe, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { TruncatedText } from "@/components/ui/truncated-text";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { useRichDocuments, useDeleteRichDocument } from "@/hooks/api/hr";
import { getErrorMessage } from "@/lib/get-error-message";
import { useCan } from "@/hooks/api/access";

interface RichDocumentRowProps {
  doc: {
    id: number;
    title: string;
    templateType: string | null;
    isPublished: boolean | null;
    updatedAt: Date | string | null;
  };
  onDelete: (documentId: number) => void;
  isDeletePending: boolean;
  canManage: boolean;
}

function RichDocumentRow({ doc, onDelete, isDeletePending, canManage }: RichDocumentRowProps) {
  const handleDelete = useCallback(() => onDelete(doc.id), [onDelete, doc.id]);

  return (
    <div className="flex items-center justify-between p-2.5 rounded-xl border border-border bg-card hover:bg-muted/30 transition-colors duration-200">
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="w-7 rounded-lg bg-muted flex items-center justify-center shrink-0">
          <FileText className="h-3.5 w-3.5 text-muted-foreground" />
        </div>
        <div className="min-w-0">
          <TruncatedText text={doc.title} className="text-sm font-medium text-foreground" />
          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
            {doc.templateType && (
              <span className="inline-flex items-center text-micro font-semibold px-1.5 py-0 rounded-full border bg-muted text-muted-foreground border-border">
                {doc.templateType}
              </span>
            )}
            {doc.isPublished && (
              <span className="inline-flex items-center gap-0.5 text-micro font-semibold px-1.5 py-0 rounded-full border bg-status-success-surface text-status-success-ink border-status-success-rule">
                <Globe className="h-2.5 w-2.5" />
                Published
              </span>
            )}
            {doc.updatedAt && (
              <span className="text-micro text-muted-foreground">
                {formatDistanceToNow(new Date(doc.updatedAt), { addSuffix: true })}
              </span>
            )}
          </div>
        </div>
      </div>
      {canManage ? <div className="flex items-center gap-1 shrink-0">
        <Button
          variant="ghost"
          size="icon"
          className="w-7 text-muted-foreground hover:text-foreground"
          asChild
        >
          <Link href={`/hr/documents/editor/${doc.id}`} aria-label="Edit document">
            <Pencil className="h-3.5 w-3.5" />
          </Link>
        </Button>
        <LoadingButton
          variant="ghost"
          size="icon"
          className="w-7 text-muted-foreground hover:text-destructive"
          onClick={handleDelete}
          isPending={isDeletePending}
          aria-label="Delete document"
        >
          {!isDeletePending && <Trash2 className="h-3.5 w-3.5" />}
        </LoadingButton>
      </div> : null}
    </div>
  );
}

export function RichDocumentsSection() {
  const [page, setPage] = useState(1);
  const canManage = useCan("hr:documents:manage");
  const { data, isLoading } = useRichDocuments({ page, limit: 20 });
  const deleteMutation = useDeleteRichDocument();

  const richDocs = data?.data ?? [];
  const total = data?.pagination.total ?? 0;
  const totalPages = data?.pagination.totalPages ?? 1;

  const handleDelete = useCallback((documentId: number) => {
    deleteMutation.mutate(documentId, {
      onSuccess: () => toast.success("Document deleted"),
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  }, [deleteMutation]);

  const handlePrevPage = useCallback(() => {
    setPage((prev) => Math.max(1, prev - 1));
  }, []);

  const handleNextPage = useCallback(() => {
    setPage((prev) => prev + 1);
  }, []);

  if (isLoading) {
    return (
      <Card className="rounded-2xl border border-border/70 bg-card/90 backdrop-blur-sm shadow-[0_1px_2px_rgba(15,23,42,0.04),0_12px_32px_-14px_rgba(15,23,42,0.12)] overflow-hidden">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-16" />
          </div>
          <div className="space-y-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-11 w-full rounded-xl" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (richDocs.length === 0) return null;

  return (
    <Card className="rounded-2xl border border-border/70 bg-card/90 backdrop-blur-sm shadow-[0_1px_2px_rgba(15,23,42,0.04),0_12px_32px_-14px_rgba(15,23,42,0.12)] overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-7 rounded-lg bg-primary/10 flex items-center justify-center">
              <FileText className="h-3.5 w-3.5 text-primary" />
            </div>
            <h3 className="text-sm font-semibold text-foreground">Created Documents</h3>
          </div>
          <span className="inline-flex items-center gap-1 text-micro font-semibold px-2 py-0.5 rounded-full border bg-muted text-muted-foreground border-border">
            {total}
          </span>
        </div>
        <div className="space-y-1.5">
          {richDocs.map((doc) => (
            <RichDocumentRow
              key={doc.id}
              doc={doc}
              onDelete={handleDelete}
              isDeletePending={deleteMutation.isPending}
              canManage={canManage}
            />
          ))}
        </div>
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-3">
            <span className="text-dense text-muted-foreground">
              Page {page} of {totalPages}
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="text-xs"
                disabled={page <= 1}
                onClick={handlePrevPage}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-xs"
                disabled={page >= totalPages}
                onClick={handleNextPage}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
