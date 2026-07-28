"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { FileText, FolderOpen, HardDrive, Star } from "lucide-react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { StatCard, StatCardGrid } from "@/components/ui/stat-card";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import {
  useHrDocumentList,
  useDeleteDocument,
  useHrEmployees,
  unwrapEmployees,
} from "@/hooks/api/hr";
import { hrDocumentListPrefix } from "@/hooks/api/hr/documents";
import { CreateEnvelopeDialog } from "@/features/sign";
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

const DOCUMENT_CATEGORIES = [
  "Personal Documents", "Employment", "Compliance",
  "Training", "Financial", "Legal", "Other",
];

const DEFAULT_CATEGORY_TABS = [
  "All Files", "Contracts", "Policies", "Tax Forms", "Templates", "Payroll",
];

export default function DocumentsPage() {
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
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const isAdmin = useCan("hr:employees:manage");
  const canManageDocs = useCan("hr:documents:manage");
  const [isLetterGenOpen, setIsLetterGenOpen] = useState(false);

  const { data: employeesRaw } = useHrEmployees({ limit: 100 });
  const employees = useMemo(() => unwrapEmployees(employeesRaw), [employeesRaw]);

  const foldersKey = session?.orgId ? `hr-doc-folders-${session.orgId}` : null;

  useEffect(() => {
    if (!foldersKey) return;
    try {
      const stored = localStorage.getItem(foldersKey);
      if (stored) {
        const parsed: unknown = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setCustomFolders(parsed.filter((item): item is string => typeof item === "string"));
        }
      }
    } catch { }
  }, [foldersKey]);

  const typeFilter = selectedType !== "all" ? (selectedType as Document["type"]) : undefined;
  const qc = useQueryClient();

  const { data: documentsPage, isLoading, isError, refetch } = useHrDocumentList({
    page,
    limit: pageSize,
    type: typeFilter,
  });
  const { data: policiesPage } = useHrDocumentList({ type: "POLICY", limit: 100 });
  const deleteMutation = useDeleteDocument();

  const documents = useMemo(() => documentsPage?.data ?? [], [documentsPage]);
  const policies = useMemo(
    () => (policiesPage?.data ?? []).filter((d) => d.isPublic),
    [policiesPage],
  );
  const totalDocuments = documentsPage?.pagination.total ?? 0;
  const categoryTabs = useMemo(() => [...DEFAULT_CATEGORY_TABS, ...customFolders], [customFolders]);

  const filteredDocuments = useMemo(() => {
    return documents.filter((doc) => {
      const matchesSearch =
        searchTerm === "" ||
        doc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.tags?.some((tag) => tag.toLowerCase().includes(searchTerm.toLowerCase()));

      if (selectedCategory !== "All Files") {
        const builtInMatch =
          (selectedCategory === "Contracts" && (doc.type === "CONTRACT" || doc.type === "OFFER_LETTER")) ||
          (selectedCategory === "Policies" && doc.type === "POLICY") ||
          (selectedCategory === "Tax Forms" && (doc.type === "ID_PROOF" || doc.tags?.some((t) => t.toLowerCase().includes("tax")))) ||
          (selectedCategory === "Templates" && doc.tags?.some((t) => t.toLowerCase().includes("template"))) ||
          (selectedCategory === "Payroll" && doc.type === "PAYSLIP");
        const customFolderMatch =
          customFolders.includes(selectedCategory) &&
          (doc.category?.toLowerCase() === selectedCategory.toLowerCase() ||
            doc.tags?.some((t) => t.toLowerCase() === selectedCategory.toLowerCase()));
        if (!builtInMatch && !customFolderMatch) return false;
      }
      return matchesSearch;
    });
  }, [documents, searchTerm, selectedCategory, customFolders]);

  const totalFiltered = totalDocuments;

  const folders: FolderItem[] = useMemo(() => [
    { name: "Employee Contracts", count: documents.filter((d) => d.type === "CONTRACT" || d.type === "OFFER_LETTER").length, colorIdx: 0 },
    { name: "Company Policies", count: policies.length, colorIdx: 1 },
    { name: "Tax Documents", count: documents.filter((d) => d.type === "ID_PROOF" || d.tags?.some((t) => t.toLowerCase().includes("tax"))).length, colorIdx: 2 },
    { name: "Archives", count: documents.filter((d) => d.type === "OTHER").length, colorIdx: 3 },
  ], [documents, policies]);

  const totalStorageBytes = documents.reduce((acc, doc) => acc + (doc.fileSize ?? 0), 0);
  const maxStorageGB = 20;
  const storagePercent = Math.min(100, Math.round((totalStorageBytes / (1024 * 1024 * 1024) / maxStorageGB) * 100));

  const handleDelete = useCallback(async (documentId: number) => {
    await toast.promise(
      deleteMutation.mutateAsync(documentId),
      { loading: "Deleting document...", success: "Document deleted", error: "Failed to delete document" },
    );
    void qc.invalidateQueries({ queryKey: hrDocumentListPrefix });
  }, [deleteMutation, qc]);

  const handleSearchChange = useCallback((value: string) => { setSearchTerm(value); setPage(1); }, []);
  const handleTypeChange = useCallback((value: string) => { setSelectedType(value); setPage(1); }, []);
  const handleCategoryChange = useCallback((value: string) => { setSelectedCategory(value); setPage(1); }, []);
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
    setNewFolderName("");
    setIsNewFolderOpen(false);
    toast.success(`Folder "${name}" created`);
  }, [foldersKey]);

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
          <StatCard label="Public Documents" value={documents.filter((d) => d.isPublic).length} icon={Star} color="blue" />
        </StatCardGrid>

        <DocumentTable
          paginatedDocuments={filteredDocuments}
          allFilteredDocuments={filteredDocuments}
          folders={folders}
          page={page}
          pageSize={pageSize}
          totalFiltered={totalFiltered}
          selectedCategory={selectedCategory}
          searchTerm={searchTerm}
          onPageChange={setPage}
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
          isAdmin={isAdmin}
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
          isAdmin={isAdmin}
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
          employees={employees}
          onSaved={handleLetterSaved}
        />
      </div>
    </PageWrapper>
  );
}
