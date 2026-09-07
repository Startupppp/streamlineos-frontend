"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { FileText, FolderOpen, HardDrive, Star } from "lucide-react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { StatCard, StatCardGrid } from "@/components/ui/stat-card";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import {
  useHrDocumentList,
  useHrDocumentStats,
  useDeleteDocument,
} from "@/hooks/api/hr";
import { hrDocumentListPrefix } from "@/hooks/api/hr/documents";
import { CreateEnvelopeDialog } from "@/components/sign/create-envelope-dialog";
import { UploadDocumentDialog } from "@/features/hr/documents/components/upload-document-dialog";
import { LetterGenerationSheet } from "@/features/hr/documents/letter-generation-sheet";
import { useSession } from "next-auth/react";
import type { Document } from "@/types/hr";

import { DocumentFilters, DOCUMENT_TYPES } from "@/features/hr/documents/document-filters";
import { DocumentTable, type FolderItem } from "@/features/hr/documents/document-table";
import { NewFolderDialog } from "@/features/hr/documents/new-folder-dialog";
import { EditDocumentSheet } from "@/features/hr/documents/edit-document-sheet";
import { useCan } from "@/hooks/api/access";
import { RichDocumentsSection } from "@/features/hr/documents/rich-documents-section";
import { DocumentsExtendedSection } from "@/features/hr/documents/documents-extended-section";
import { DocumentPageActions } from "@/features/hr/documents/document-page-actions";
import { DocumentLibrarySkeleton, DocumentLibraryError } from "@/features/hr/documents/document-page-states";
import { useDebouncedValue } from "@/hooks/common/use-debounce";
import { getErrorMessage } from "@/lib/get-error-message";

const DOCUMENT_CATEGORIES = [
  "Personal Documents", "Employment", "Compliance",
  "Training", "Financial", "Legal", "Other",
];

const DEFAULT_CATEGORY_TABS = [
  "All Files", "Contracts", "Policies", "Tax Forms", "Templates", "Payroll",
];

export function DocumentsPage() {
  const { data: session } = useSession();
  const [selectedType, setSelectedType] = useState<string>("all");
  const [selectedCategory, setSelectedCategory] = useState("All Files");
  const [searchTerm, setSearchTerm] = useState("");
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isNewFolderOpen, setIsNewFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [customFolders, setCustomFolders] = useState<string[]>([]);
  const [editingDocument, setEditingDocument] = useState<Document | null>(null);
  const [signatureDocument, setSignatureDocument] = useState<Document | null>(null);
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [cursorHistory, setCursorHistory] = useState<Array<string | undefined>>([
    undefined,
  ]);
  const pageSize = 20;

  const canManageDocs = useCan("hr:documents:manage");
  const [isLetterGenOpen, setIsLetterGenOpen] = useState(false);

  const foldersKey = session?.orgId ? `hr-doc-folders-${session.orgId}` : null;

  useEffect(() => {
    let nextFolders: string[] = [];
    try {
      const stored = foldersKey ? localStorage.getItem(foldersKey) : null;
      if (stored) {
        const parsed: unknown = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          nextFolders = parsed.filter(
            (item): item is string => typeof item === "string",
          );
        }
      }
    } catch { }
    const timeoutId = window.setTimeout(() => setCustomFolders(nextFolders), 0);
    return () => window.clearTimeout(timeoutId);
  }, [foldersKey]);

  const typeFilter = selectedType !== "all" ? (selectedType as Document["type"]) : undefined;
  const debouncedSearch = useDebouncedValue(searchTerm, 300);
  const cursor = cursorHistory.at(-1);
  const page = cursorHistory.length;
  const qc = useQueryClient();

  const { data: documentsPage, isLoading, isFetching, isError, refetch } = useHrDocumentList({
    cursor,
    limit: pageSize,
    type: typeFilter,
    search: debouncedSearch || undefined,
    category: selectedCategory,
  });
  const { data: documentStats } = useHrDocumentStats();
  const deleteMutation = useDeleteDocument();

  const documents = useMemo(() => documentsPage?.data ?? [], [documentsPage]);
  const totalDocuments = documentStats?.total ?? 0;
  const categoryTabs = useMemo(() => [...DEFAULT_CATEGORY_TABS, ...customFolders], [customFolders]);

  const folders: FolderItem[] = useMemo(() => [
    {
      name: "Employee Contracts",
      count:
        (documentStats?.byType.CONTRACT ?? 0) +
        (documentStats?.byType.OFFER_LETTER ?? 0),
      colorIdx: 0,
    },
    { name: "Company Policies", count: documentStats?.byType.POLICY ?? 0, colorIdx: 1 },
    { name: "Tax Documents", count: documentStats?.byType.ID_PROOF ?? 0, colorIdx: 2 },
    { name: "Archives", count: documentStats?.byType.OTHER ?? 0, colorIdx: 3 },
  ], [documentStats]);

  const totalStorageBytes = documentStats?.storageBytes ?? 0;
  const maxStorageGB = 20;
  const storagePercent = Math.min(100, Math.round((totalStorageBytes / (1024 * 1024 * 1024) / maxStorageGB) * 100));

  const handleDelete = useCallback(async (documentId: number) => {
    await toast.promise(
      deleteMutation.mutateAsync(documentId),
      {
        loading: "Removing document...",
        success: "Document removed",
        error: (error) => getErrorMessage(error),
      },
    );
    void qc.invalidateQueries({ queryKey: hrDocumentListPrefix });
  }, [deleteMutation, qc]);

  const resetCursor = useCallback(() => setCursorHistory([undefined]), []);
  const handleSearchChange = useCallback((value: string) => { setSearchTerm(value); resetCursor(); }, [resetCursor]);
  const handleTypeChange = useCallback((value: string) => { setSelectedType(value); resetCursor(); }, [resetCursor]);
  const handleCategoryChange = useCallback((value: string) => { setSelectedCategory(value); resetCursor(); }, [resetCursor]);
  const handleNextPage = useCallback(() => {
    const nextCursor = documentsPage?.pageInfo.nextCursor;
    if (nextCursor) setCursorHistory((history) => [...history, nextCursor]);
  }, [documentsPage?.pageInfo.nextCursor]);
  const handlePreviousPage = useCallback(() => {
    setCursorHistory((history) =>
      history.length > 1 ? history.slice(0, -1) : history,
    );
  }, []);
  const handleOpenUpload = useCallback(() => setIsUploadOpen(true), []);
  const handleOpenNewFolder = useCallback(() => setIsNewFolderOpen(true), []);
  const handleViewList = useCallback(() => setViewMode("list"), []);
  const handleViewGrid = useCallback(() => setViewMode("grid"), []);
  const handleEdit = useCallback((doc: Document) => setEditingDocument(doc), []);
  const handleSendForSignature = useCallback((doc: Document) => setSignatureDocument(doc), []);
  const handleRetry = useCallback(() => { void refetch(); }, [refetch]);
  const handleOpenLetterGen = useCallback(() => setIsLetterGenOpen(true), []);
  const handleLetterSaved = useCallback(() => { void refetch(); }, [refetch]);
  const handleUploadSuccess = useCallback(() => {
    void qc.invalidateQueries({ queryKey: hrDocumentListPrefix });
    setIsUploadOpen(false);
  }, [qc]);
  const handleEditSheetChange = useCallback((open: boolean) => { if (!open) setEditingDocument(null); }, []);
  const handleSignatureDialogChange = useCallback((open: boolean) => { if (!open) setSignatureDocument(null); }, []);

  const handleNewFolder = useCallback((name: string) => {
    setCustomFolders((prev) => {
      const updated = [...prev, name];
      if (foldersKey) {
        try { localStorage.setItem(foldersKey, JSON.stringify(updated)); } catch { }
      }
      return updated;
    });
    setSelectedCategory(name);
    resetCursor();
    setNewFolderName("");
    setIsNewFolderOpen(false);
    toast.success(`Folder "${name}" created`);
  }, [foldersKey, resetCursor]);

  if (isLoading) return <DocumentLibrarySkeleton />;
  if (isError) return <DocumentLibraryError onRetry={handleRetry} />;

  return (
    <PageWrapper
      title="Document Library"
      subtitle="Centralized repository for all company-wide HR documents, contracts, and policy files."
      actions={
        <DocumentPageActions
          viewMode={viewMode}
          canManageDocs={canManageDocs}
          onViewList={handleViewList}
          onViewGrid={handleViewGrid}
          onOpenLetterGen={handleOpenLetterGen}
          onOpenNewFolder={handleOpenNewFolder}
          onOpenUpload={handleOpenUpload}
        />
      }
      filters={
        <DocumentFilters
          searchTerm={searchTerm}
          onSearchChange={handleSearchChange}
          selectedType={selectedType}
          onTypeChange={handleTypeChange}
          selectedCategory={selectedCategory}
          onCategoryChange={handleCategoryChange}
          categoryTabs={categoryTabs}
        />
      }
    >
      <div className="flex flex-1 min-h-0 flex-col gap-4">
        <StatCardGrid cols={4}>
          <StatCard label="Total Documents" value={totalDocuments} icon={FileText} color="blue" />
          <StatCard label="Folders" value={folders.length + customFolders.length} icon={FolderOpen} color="amber" />
          <StatCard
            label={`Storage (${maxStorageGB}GB)`}
            value={`${storagePercent}%`}
            icon={HardDrive}
            color={storagePercent > 80 ? "red" : storagePercent > 50 ? "gold" : "green"}
          />
          <StatCard label="Public Documents" value={documentStats?.publicCount ?? 0} icon={Star} color="blue" />
        </StatCardGrid>

        <DocumentTable
          documents={documents}
          folders={folders}
          page={page}
          hasNext={documentsPage?.pageInfo.hasMore ?? false}
          isFetching={isFetching}
          selectedCategory={selectedCategory}
          searchTerm={searchTerm}
          canManageDocs={canManageDocs}
          onPreviousPage={handlePreviousPage}
          onNextPage={handleNextPage}
          onDelete={handleDelete}
          onEdit={handleEdit}
          onOpenUpload={handleOpenUpload}
          onSendForSignature={handleSendForSignature}
        />

        <RichDocumentsSection />
        <DocumentsExtendedSection />

        <UploadDocumentDialog
          open={isUploadOpen}
          onOpenChange={setIsUploadOpen}
          onSuccess={handleUploadSuccess}
          documentTypes={DOCUMENT_TYPES}
          categories={[...DOCUMENT_CATEGORIES, ...customFolders]}
          canAssignEmployee={canManageDocs}
        />
        <NewFolderDialog
          open={isNewFolderOpen}
          onOpenChange={setIsNewFolderOpen}
          folderName={newFolderName}
          onFolderNameChange={setNewFolderName}
          existingTabs={categoryTabs}
          onConfirm={handleNewFolder}
        />
        <EditDocumentSheet
          open={!!editingDocument}
          onOpenChange={handleEditSheetChange}
          document={editingDocument}
          documentTypes={DOCUMENT_TYPES}
          categories={[...DOCUMENT_CATEGORIES, ...customFolders]}
          canAssignEmployee={canManageDocs}
        />
        <CreateEnvelopeDialog
          open={!!signatureDocument}
          onOpenChange={handleSignatureDialogChange}
          defaultTitle={signatureDocument?.name}
          sourceModule="hr"
          sourceEntityType="document"
          sourceEntityId={signatureDocument ? String(signatureDocument.id) : undefined}
          dialogTitle="Send for e-signature"
          dialogDescription="Creates a SignOS envelope linked to this document — you'll upload the PDF and add signers next."
        />
        <LetterGenerationSheet
          open={isLetterGenOpen}
          onOpenChange={setIsLetterGenOpen}
          onSaved={handleLetterSaved}
        />
      </div>
    </PageWrapper>
  );
}
