"use client";
import { getErrorMessage } from "@/lib/get-error-message";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { FolderPlus, Upload, FilePlus2, FileText, Pencil, Trash2, Globe, FolderOpen, HardDrive, Star, LayoutTemplate } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { StatCard } from "@/components/ui/stat-card";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import {
  getDocuments,
  getMyDocuments,
  getCompanyPolicies,
  getExpiringDocuments,
  deleteDocument,
  getDocumentStats,
} from "@/server/actions/document-actions";
import { isDocumentType } from "@/lib/theme-constants";
import { UploadDocumentDialog } from "./upload-document-dialog";
import { useSession } from "next-auth/react";
import { useRichDocuments, useDeleteRichDocument } from "@/lib/api/hooks/hr";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";

import { DocumentFilters, DOCUMENT_TYPES } from "@/features/hr/documents/document-filters";
import { DocumentTable, type Document, type FolderItem } from "@/features/hr/documents/document-table";
import { NewFolderDialog } from "@/features/hr/documents/new-folder-dialog";

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

  const [documents, setDocuments] = useState<Document[]>([]);
  const [policies, setPolicies] = useState<Document[]>([]);
  const [stats, setStats] = useState<Awaited<ReturnType<typeof getDocumentStats>>>(null);
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState<string>("all");
  const [selectedCategory, setSelectedCategory] = useState("All Files");
  const [searchTerm, setSearchTerm] = useState("");
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isNewFolderOpen, setIsNewFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [customFolders, setCustomFolders] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const pageSize = 5;

  const isAdmin = session?.user?.role === "CEO" || session?.user?.role === "ADMIN";
  const isAdminRef = useRef(isAdmin);
  isAdminRef.current = isAdmin;

  const categoryTabs = useMemo(
    () => [...DEFAULT_CATEGORY_TABS, ...customFolders],
    [customFolders],
  );

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const type = isDocumentType(selectedType) ? selectedType : undefined;
      const admin = isAdminRef.current;
      const [docsData, policiesData, , statsData] = await Promise.all([
        admin ? getDocuments({ type }) : getMyDocuments(),
        getCompanyPolicies(),
        admin ? getExpiringDocuments(30) : Promise.resolve([]),
        getDocumentStats(),
      ]);
      setDocuments(docsData);
      setPolicies(policiesData);
      setStats(statsData);
    } catch {
      toast.error("Failed to load documents");
    } finally {
      setLoading(false);
    }
  }, [selectedType]);

  useEffect(() => {
    loadData();
  }, [loadData, isAdmin]);

  const filteredDocuments = useMemo(() => {
    return documents.filter((doc) => {
      const matchesSearch =
        searchTerm === "" ||
        doc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.tags?.some((tag) => tag.toLowerCase().includes(searchTerm.toLowerCase()));

      if (selectedCategory !== "All Files") {
        const builtInMatch =
          (selectedCategory === "Contracts" &&
            (doc.type === "CONTRACT" || doc.type === "OFFER_LETTER")) ||
          (selectedCategory === "Policies" && doc.type === "POLICY") ||
          (selectedCategory === "Tax Forms" &&
            (doc.type === "ID_PROOF" ||
              doc.tags?.some((t) => t.toLowerCase().includes("tax")))) ||
          (selectedCategory === "Templates" &&
            doc.tags?.some((t) => t.toLowerCase().includes("template"))) ||
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
    {
      name: "Employee Contracts",
      count: documents.filter((d) => d.type === "CONTRACT" || d.type === "OFFER_LETTER").length,
      colorIdx: 0,
    },
    { name: "Company Policies", count: policies.length, colorIdx: 1 },
    {
      name: "Tax Documents",
      count: documents.filter(
        (d) => d.type === "ID_PROOF" || d.tags?.some((t) => t.toLowerCase().includes("tax")),
      ).length,
      colorIdx: 2,
    },
    {
      name: "Archives",
      count: documents.filter((d) => d.type === "OTHER").length,
      colorIdx: 3,
    },
  ];

  const totalStorageBytes = documents.reduce((acc, doc) => acc + (doc.fileSize || 0), 0);
  const maxStorageGB = 20;
  const usedGB = totalStorageBytes / (1024 * 1024 * 1024);
  const storagePercent = Math.min(100, Math.round((usedGB / maxStorageGB) * 100));

  const handleNewFolderOpen = useCallback(() => setIsNewFolderOpen(true), []);
  const handleUploadOpen = useCallback(() => setIsUploadOpen(true), []);

  const handleDelete = async (documentId: number) => {
    const result = await deleteDocument(documentId);
    if (result.success) {
      toast.success("Document deleted");
      loadData();
    } else {
      toast.error(result.error);
    }
  };

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setPage(1);
  };

  const handleTypeChange = (value: string) => {
    setSelectedType(value);
    setPage(1);
  };

  const handleCategoryChange = (value: string) => {
    setSelectedCategory(value);
    setPage(1);
  };

  const handleNewFolder = (name: string) => {
    setCustomFolders((prev) => [...prev, name]);
    setSelectedCategory(name);
    setNewFolderName("");
    setIsNewFolderOpen(false);
    toast.success(`Folder "${name}" created`);
  };

  if (loading) {
    return (
      <div className="flex-1 space-y-6">

        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-3.5 w-3.5" />
          <Skeleton className="h-4 w-20" />
        </div>

        <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <Skeleton className="h-8 w-52" />
            <Skeleton className="h-4 w-96" />
          </div>
          <div className="flex items-center gap-3 mt-4 md:mt-0">
            <Skeleton className="h-10 w-[120px] rounded-md" />
            <Skeleton className="h-10 w-[160px] rounded-md" />
          </div>
        </div>

        <Card className="shadow-sm border">
          <CardContent className="p-4">
            <div className="flex flex-wrap items-center gap-4">
              <Skeleton className="h-10 flex-1 min-w-[200px] max-w-md rounded-md" />
              <Skeleton className="h-9 w-[76px] rounded-md" />
              <div className="flex items-center gap-1">
                {DEFAULT_CATEGORY_TABS.map((tab) => (
                  <Skeleton
                    key={tab}
                    className="h-8 rounded-full"
                    style={{ width: `${tab.length * 9 + 24}px` }}
                  />
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border overflow-hidden">
          <CardContent className="p-0">
            <div className="flex items-center bg-muted/30 px-6 py-3 border-b">
              <Skeleton className="h-3 w-12" />
              <Skeleton className="h-3 w-16 ml-auto mr-32" />
              <Skeleton className="h-3 w-24 mr-16" />
              <Skeleton className="h-3 w-8 ml-auto" />
            </div>
            <div className="px-6 py-3">
              <Skeleton className="h-3 w-14" />
            </div>
            <div className="px-6 pb-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-xl border border-border">
                    <Skeleton className="h-9 w-9 rounded-lg flex-shrink-0" />
                    <div className="min-w-0 space-y-1.5">
                      <Skeleton className="h-4 w-28" />
                      <Skeleton className="h-3 w-14" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center px-6 py-4 border-t">
                <div className="flex items-center gap-3 flex-1">
                  <Skeleton className="h-9 w-9 rounded-lg flex-shrink-0" />
                  <div className="space-y-1.5">
                    <Skeleton className="h-4 w-44" />
                    <div className="flex gap-1.5">
                      <Skeleton className="h-4 w-14 rounded-full" />
                      <Skeleton className="h-4 w-12 rounded-full" />
                    </div>
                  </div>
                </div>
                <Skeleton className="h-5 w-16 rounded-full" />
                <Skeleton className="h-4 w-24 ml-16" />
                <Skeleton className="h-4 w-12 ml-auto" />
              </div>
            ))}
            <div className="flex items-center justify-between px-6 py-4 border-t">
              <Skeleton className="h-4 w-52" />
              <div className="flex items-center gap-2">
                <Skeleton className="h-8 w-[72px] rounded-md" />
                <Skeleton className="h-8 w-[52px] rounded-md" />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center gap-3">
          <Skeleton className="h-4 w-8" />
          <Skeleton className="w-32 h-2 rounded-full" />
          <Skeleton className="h-3 w-20" />
        </div>
      </div>
    );
  }

  const pageActions = (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="sm" className="gap-2" asChild>
        <Link href="/hr/documents/templates">
          <LayoutTemplate className="h-4 w-4" />
          <span className="hidden sm:inline">Templates</span>
        </Link>
      </Button>
      <Button variant="outline" size="sm" className="gap-2" onClick={handleNewFolderOpen}>
        <FolderPlus className="h-4 w-4" />
        <span className="hidden sm:inline">New Folder</span>
      </Button>
      <Button variant="outline" size="sm" className="gap-2" onClick={handleUploadOpen}>
        <Upload className="h-4 w-4" />
        <span className="hidden sm:inline">Upload</span>
      </Button>
      <Button size="sm" className="gap-2" asChild>
        <Link href="/hr/documents/editor/new">
          <FilePlus2 className="h-4 w-4" />
          <span className="hidden sm:inline">Create Document</span>
        </Link>
      </Button>
    </div>
  );

  const filtersBar = (
    <DocumentFilters
      searchTerm={searchTerm}
      onSearchChange={handleSearchChange}
      selectedType={selectedType}
      onTypeChange={handleTypeChange}
      selectedCategory={selectedCategory}
      onCategoryChange={handleCategoryChange}
      categoryTabs={categoryTabs}
    />
  );

  return (
    <PageWrapper
      title="Document Library"
      subtitle="Centralized repository for all company-wide HR documents, contracts, and policy files."
      actions={pageActions}
      filters={filtersBar}
    >
      <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Documents"
          value={documents.length}
          icon={FileText}
          color="blue"
        />
        <StatCard
          label="Folders"
          value={folders.length + customFolders.length}
          icon={FolderOpen}
          color="gold"
        />
        <StatCard
          label={`Storage (${maxStorageGB}GB)`}
          value={`${storagePercent}%`}
          icon={HardDrive}
          color={storagePercent > 80 ? "red" : storagePercent > 50 ? "gold" : "green"}
        />
        <StatCard
          label="Public Documents"
          value={documents.filter((d) => d.isPublic).length}
          icon={Star}
          color="purple"
        />
      </div>

      <DocumentTable
        paginatedDocuments={paginatedDocuments}
        folders={folders}
        page={page}
        pageSize={pageSize}
        totalFiltered={totalFiltered}
        totalPages={totalPages}
        selectedCategory={selectedCategory}
        searchTerm={searchTerm}
        onPageChange={setPage}
        onDelete={handleDelete}
        onOpenUpload={handleUploadOpen}
      />

      <RichDocumentsSection />

      <div className="flex items-center gap-3 text-sm">
        <div className="flex items-center gap-2 text-muted-foreground">
          <span className="font-medium">{storagePercent}%</span>
        </div>
        <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all"
            style={{ width: `${storagePercent}%` }}
          />
        </div>
        <span className="text-xs text-muted-foreground">of {maxStorageGB}GB used</span>
      </div>

      <UploadDocumentDialog
        open={isUploadOpen}
        onOpenChange={setIsUploadOpen}
        onSuccess={() => {
          loadData();
          setIsUploadOpen(false);
        }}
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
      </div>
    </PageWrapper>
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
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-4">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-20" />
          </div>
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!richDocs?.length) return null;

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-sm">Created Documents</h3>
          <span className="text-xs text-muted-foreground">{richDocs.length} documents</span>
        </div>
        <div className="space-y-2">
          {richDocs.map((doc) => (
            <div
              key={doc.id}
              className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                <FileText className="h-4 w-4 text-primary shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{doc.title}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {doc.templateType && (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                        {doc.templateType}
                      </Badge>
                    )}
                    {doc.isPublished && (
                      <Badge variant="default" className="text-[10px] px-1.5 py-0 gap-0.5">
                        <Globe className="h-2.5 w-2.5" />
                        Published
                      </Badge>
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
                <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
                  <Link href={`/hr/documents/editor/${doc.id}`}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Link>
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-destructive hover:text-destructive"
                  onClick={() => handleDelete(doc.id)}
                  disabled={deleteMutation.isPending}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
