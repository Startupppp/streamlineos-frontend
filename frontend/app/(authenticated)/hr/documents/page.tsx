"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import {
  FolderPlus,
  Upload,
  FilePlus2,
  FileText,
  Pencil,
  Trash2,
  Globe,
  FolderOpen,
  HardDrive,
  Star,
  LayoutTemplate,
  LayoutGrid,
  List,
  AlertCircle,
  Mail,
  CalendarCheck,
  AlertTriangle,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { StatCard, StatCardGrid } from "@/components/ui/stat-card";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  useHrDocuments,
  useDeleteDocument,
  useRichDocuments,
  useDeleteRichDocument,
} from "@/hooks/api/hr";
import { useLetters } from "@/hooks/api/hr/letters";
import { useCertifications } from "@/hooks/api/hr/certifications";
import { CreateEnvelopeDialog } from "@/features/sign";
import { UploadDocumentDialog } from "@/features/hr/documents/components/upload-document-dialog";
import { LetterGenerationSheet } from "@/features/hr/documents/letter-generation-sheet";
import { LettersHistoryTable } from "@/features/hr/documents/letters-history-table";
import { ComplianceCalendar } from "@/features/hr/documents/compliance-calendar";
import { ExpiringDocumentsTable } from "@/features/hr/documents/expiring-documents-table";
import { useHrEmployees } from "@/hooks/api/hr";
import { useSession } from "next-auth/react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import type { Document, Employee } from "@/types/hr";

import { DocumentFilters, DOCUMENT_TYPES } from "@/features/hr/documents/document-filters";
import { DocumentTable, type FolderItem } from "@/features/hr/documents/document-table";
import { NewFolderDialog } from "@/features/hr/documents/new-folder-dialog";
import { EditDocumentSheet } from "@/features/hr/documents/edit-document-sheet";
import { getErrorMessage } from "@/lib/get-error-message";
import { useCan } from "@/hooks/api/access";

const DOCUMENT_CATEGORIES = [
  "Personal Documents",
  "Employment",
  "Compliance",
  "Training",
  "Financial",
  "Legal",
  "Other",
];

const DEFAULT_CATEGORY_TABS = [
  "All Files",
  "Contracts",
  "Policies",
  "Tax Forms",
  "Templates",
  "Payroll",
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
  const pageSize = 5;

  const isAdmin = useCan("hr:employees:manage");
  const canManageDocs = useCan("hr:documents:manage");
  const [isLetterGenOpen, setIsLetterGenOpen] = useState(false);

  const { data: employeesRaw } = useHrEmployees();
  const employees = useMemo(
    () => (Array.isArray(employeesRaw) ? employeesRaw : []) as Employee[],
    [employeesRaw],
  );

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

  const { data: rawDocuments = [], isLoading, isError, refetch } = useHrDocuments(undefined, typeFilter);
  const { data: rawPolicies = [] } = useHrDocuments(undefined, "POLICY");
  const deleteMutation = useDeleteDocument();

  const documents = rawDocuments;
  const policies = rawPolicies.filter((d) => d.isPublic);

  const categoryTabs = useMemo(
    () => [...DEFAULT_CATEGORY_TABS, ...customFolders],
    [customFolders],
  );

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

  const totalFiltered = filteredDocuments.length;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / pageSize));
  const paginatedDocuments = filteredDocuments.slice((page - 1) * pageSize, page * pageSize);

  const folders: FolderItem[] = [
    { name: "Employee Contracts", count: documents.filter((d) => d.type === "CONTRACT" || d.type === "OFFER_LETTER").length, colorIdx: 0 },
    { name: "Company Policies", count: policies.length, colorIdx: 1 },
    { name: "Tax Documents", count: documents.filter((d) => d.type === "ID_PROOF" || d.tags?.some((t) => t.toLowerCase().includes("tax"))).length, colorIdx: 2 },
    { name: "Archives", count: documents.filter((d) => d.type === "OTHER").length, colorIdx: 3 },
  ];

  const totalStorageBytes = documents.reduce((acc, doc) => acc + (doc.fileSize ?? 0), 0);
  const maxStorageGB = 20;
  const usedGB = totalStorageBytes / (1024 * 1024 * 1024);
  const storagePercent = Math.min(100, Math.round((usedGB / maxStorageGB) * 100));

  const handleDelete = useCallback(async (documentId: number) => {
    await toast.promise(
      deleteMutation.mutateAsync(documentId),
      {
        loading: "Deleting document...",
        success: "Document deleted",
        error: "Failed to delete document",
      },
    );
  }, [deleteMutation]);

  const handleSearchChange = useCallback((value: string) => { setSearchTerm(value); setPage(1); }, []);
  const handleTypeChange = useCallback((value: string) => { setSelectedType(value); setPage(1); }, []);
  const handleCategoryChange = useCallback((value: string) => { setSelectedCategory(value); setPage(1); }, []);
  const handleOpenUpload = useCallback(() => setIsUploadOpen(true), []);
  const handleOpenNewFolder = useCallback(() => setIsNewFolderOpen(true), []);
  const handleViewList = useCallback(() => setViewMode("list"), []);
  const handleViewGrid = useCallback(() => setViewMode("grid"), []);

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

  const handleEdit = useCallback((doc: Document) => setEditingDocument(doc), []);
  const handleUploadSuccess = useCallback(() => { void refetch(); setIsUploadOpen(false); }, [refetch]);
  const handleEditSheetChange = useCallback((open: boolean) => { if (!open) setEditingDocument(null); }, []);
  const handleSendForSignature = useCallback((doc: Document) => setSignatureDocument(doc), []);
  const handleSignatureDialogChange = useCallback((open: boolean) => { if (!open) setSignatureDocument(null); }, []);
  const handleRetry = useCallback(() => { void refetch(); }, [refetch]);
  const handleOpenLetterGen = useCallback(() => setIsLetterGenOpen(true), []);
  const handleLetterSaved = useCallback(() => { void refetch(); }, [refetch]);

  if (isLoading) {
    return (
      <PageWrapper
        title="Document Library"
        subtitle="Centralized repository for all HR documents, contracts, and policy files."
      >
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 10 }).map((_, i) => (
              <Skeleton key={i} className="h-[72px] rounded-xl" />
            ))}
          </div>
          <Skeleton className="h-[400px] rounded-2xl" />
        </div>
      </PageWrapper>
    );
  }

  if (isError) {
    return (
      <PageWrapper
        title="Document Library"
        subtitle="Centralized repository for all HR documents, contracts, and policy files."
      >
        <div className="flex flex-col items-center justify-center py-14 text-center gap-3">
          <AlertCircle className="h-8 w-8 text-destructive" />
          <div>
            <p className="text-sm font-medium text-foreground">Failed to load documents</p>
            <p className="text-xs text-muted-foreground mt-0.5">Something went wrong. Please try again.</p>
          </div>
          <Button size="sm" variant="outline" onClick={handleRetry}>Try again</Button>
        </div>
      </PageWrapper>
    );
  }

  const pageActions = (
    <div className="flex items-center gap-2">
      <div className="rounded-lg border border-border p-1 flex items-center gap-0.5">
        <button
          onClick={handleViewList}
          className={cn(
            "h-7 w-7 rounded-md flex items-center justify-center transition-colors duration-200",
            viewMode === "list"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
          aria-label="List view"
        >
          <List className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={handleViewGrid}
          className={cn(
            "h-7 w-7 rounded-md flex items-center justify-center transition-colors duration-200",
            viewMode === "grid"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
          aria-label="Grid view"
        >
          <LayoutGrid className="h-3.5 w-3.5" />
        </button>
      </div>

      {canManageDocs && (
        <Button variant="outline" size="sm" className="gap-1.5 h-8" onClick={handleOpenLetterGen}>
          <Mail className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Generate Letter</span>
        </Button>
      )}
      <Button variant="outline" size="sm" className="gap-1.5 h-8" asChild>
        <Link href="/hr/documents/templates">
          <LayoutTemplate className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Templates</span>
        </Link>
      </Button>
      <Button variant="outline" size="sm" className="gap-1.5 h-8" onClick={handleOpenNewFolder}>
        <FolderPlus className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">New Folder</span>
      </Button>
      <Button variant="outline" size="sm" className="gap-1.5 h-8" onClick={handleOpenUpload}>
        <Upload className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Upload</span>
      </Button>
      <Button size="sm" className="gap-1.5 h-8" asChild>
        <Link href="/hr/documents/editor/new">
          <FilePlus2 className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Create Document</span>
        </Link>
      </Button>
    </div>
  );

  return (
    <PageWrapper
      title="Document Library"
      subtitle="Centralized repository for all company-wide HR documents, contracts, and policy files."
      badge={documents.length}
      actions={pageActions}
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
      <div className="space-y-4">
        <StatCardGrid cols={4}>
          <StatCard label="Total Documents" value={documents.length} icon={FileText} color="blue" />
          <StatCard label="Folders" value={folders.length + customFolders.length} icon={FolderOpen} color="amber" />
          <StatCard
            label={`Storage (${maxStorageGB}GB)`}
            value={`${storagePercent}%`}
            icon={HardDrive}
            color={storagePercent > 80 ? "red" : storagePercent > 50 ? "gold" : "green"}
          />
          <StatCard label="Public Documents" value={documents.filter((d) => d.isPublic).length} icon={Star} color="purple" />
        </StatCardGrid>

        <DocumentTable
          paginatedDocuments={paginatedDocuments}
          allFilteredDocuments={filteredDocuments}
          folders={folders}
          page={page}
          pageSize={pageSize}
          totalFiltered={totalFiltered}
          totalPages={totalPages}
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

interface RichDocumentRowProps {
  doc: { id: number; title: string; templateType: string | null; isPublished: boolean | null; updatedAt: Date | string | null };
  onDelete: (id: number) => void;
  isDeletePending: boolean;
}

function RichDocumentRow({ doc, onDelete, isDeletePending }: RichDocumentRowProps) {
  const handleDelete = useCallback(() => onDelete(doc.id), [onDelete, doc.id]);

  return (
    <div className="flex items-center justify-between p-2.5 rounded-xl border border-border bg-card hover:bg-muted/30 transition-colors duration-200">
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="h-7 w-7 rounded-lg bg-muted flex items-center justify-center shrink-0">
          <FileText className="h-3.5 w-3.5 text-muted-foreground" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground truncate">{doc.title}</p>
          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
            {doc.templateType && (
              <span className="inline-flex items-center text-[10px] font-semibold px-1.5 py-0 rounded-full border bg-muted text-muted-foreground border-border">
                {doc.templateType}
              </span>
            )}
            {doc.isPublished && (
              <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0 rounded-full border bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-800">
                <Globe className="h-2.5 w-2.5" />
                Published
              </span>
            )}
            {doc.updatedAt && (
              <span className="text-[10px] text-muted-foreground">
                {formatDistanceToNow(new Date(doc.updatedAt), { addSuffix: true })}
              </span>
            )}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-muted-foreground hover:text-foreground"
          asChild
        >
          <Link href={`/hr/documents/editor/${doc.id}`} aria-label="Edit document">
            <Pencil className="h-3.5 w-3.5" />
          </Link>
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-muted-foreground hover:text-rose-600"
          onClick={handleDelete}
          disabled={isDeletePending}
          aria-label="Delete document"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

function RichDocumentsSection() {
  const { data: richDocs, isLoading } = useRichDocuments();
  const deleteMutation = useDeleteRichDocument();

  const handleDelete = useCallback((id: number) => {
    deleteMutation.mutate(id, {
      onSuccess: () => toast.success("Document deleted"),
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  }, [deleteMutation]);

  if (isLoading) {
    return (
      <Card className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
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

  if (!richDocs?.length) return null;

  return (
    <Card className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center">
              <FileText className="h-3.5 w-3.5 text-primary" />
            </div>
            <h3 className="text-sm font-semibold text-foreground">Created Documents</h3>
          </div>
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border bg-muted text-muted-foreground border-border">
            {richDocs.length}
          </span>
        </div>
        <div className="space-y-1.5">
          {richDocs.map((doc) => (
            <RichDocumentRow
              key={doc.id}
              doc={doc}
              onDelete={handleDelete}
              isDeletePending={deleteMutation.isPending}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function DocumentsExtendedSection() {
  const { data: letters = [], isLoading: lettersLoading } = useLetters();
  const { data: expiringCerts = [], isLoading: certsLoading } = useCertifications({ expiringSoon: true });
  const { data: allDocs = [], isLoading: docsLoading } = useHrDocuments();

  const expiringDocs = allDocs.filter(
    (d) => d.expiryDate && new Date(d.expiryDate) <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  );

  return (
    <Card className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
      <CardContent className="p-4">
        <Tabs defaultValue="letters">
          <TabsList className="mb-4">
            <TabsTrigger value="letters" className="text-xs gap-1.5">
              <Mail className="h-3 w-3" />
              Letters
            </TabsTrigger>
            <TabsTrigger value="expiring" className="text-xs gap-1.5">
              <AlertTriangle className="h-3 w-3" />
              Expiring
            </TabsTrigger>
            <TabsTrigger value="compliance" className="text-xs gap-1.5">
              <CalendarCheck className="h-3 w-3" />
              Calendar
            </TabsTrigger>
          </TabsList>

          <TabsContent value="letters" className="mt-0">
            <LettersHistoryTable letters={letters} isLoading={lettersLoading} />
          </TabsContent>

          <TabsContent value="expiring" className="mt-0">
            <ExpiringDocumentsTable
              expiringDocuments={expiringDocs.map((d) => ({
                id: d.id,
                name: d.name,
                type: d.type ?? "",
                expiryDate: d.expiryDate ?? "",
                userId: d.userId ?? null,
              }))}
              expiringCertifications={expiringCerts
                .filter((c) => !!c.expiryDate)
                .map((c) => ({
                  id: c.id,
                  name: c.name,
                  expiryDate: c.expiryDate!,
                  user: c.user,
                }))}
              isLoading={docsLoading || certsLoading}
            />
          </TabsContent>

          <TabsContent value="compliance" className="mt-0">
            <ComplianceCalendar />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
