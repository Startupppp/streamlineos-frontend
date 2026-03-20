"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { format, differenceInDays } from "date-fns";
import {
  FileText,
  Folder,
  Search,
  Download,
  Eye,
  Trash2,
  Upload,
  MoreHorizontal,
  AlertTriangle,
  Clock,
  Shield,
  FileCheck,
  FileBadge,
  File,
  Building2,
  CalendarClock,
  History,
  FolderPlus,
  Filter,
  ChevronRight,
  FileSpreadsheet,
  FileImage,
  ArrowDown,
} from "lucide-react";
import { EmptyDocumentsIllustration } from "@/components/illustrations";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { resolveImageUrl } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  getDocuments,
  getMyDocuments,
  getCompanyPolicies,
  getExpiringDocuments,
  deleteDocument,
  getDocumentStats,
} from "@/server/actions/document-actions";
import { isDocumentType, getColorSafe, documentTypeColors } from "@/lib/theme-constants";
import { UploadDocumentDialog } from "./upload-document-dialog";
import { useSession } from "next-auth/react";
import { viewFile, downloadFile } from "@/hooks/use-file-url";

type Document = Awaited<ReturnType<typeof getDocuments>>[number];

const DOCUMENT_TYPES = [
  { value: "CONTRACT", label: "Contract", icon: FileCheck },
  { value: "CERTIFICATE", label: "Certificate", icon: FileBadge },
  { value: "ID_PROOF", label: "ID Proof", icon: Shield },
  { value: "PAYSLIP", label: "Payslip", icon: FileText },
  { value: "POLICY", label: "Policy", icon: Building2 },
  { value: "OFFER_LETTER", label: "Offer Letter", icon: FileText },
  { value: "RESUME", label: "Resume", icon: File },
  { value: "OTHER", label: "Other", icon: File },
];

const DOCUMENT_CATEGORIES = [
  "Personal Documents",
  "Employment",
  "Compliance",
  "Training",
  "Financial",
  "Legal",
  "Other",
];

/* File type icon + color configs */
const FILE_ICON_CONFIG: Record<string, { bg: string; text: string; icon: React.ElementType }> = {
  pdf:  { bg: "bg-red-100 dark:bg-red-900/20",    text: "text-red-600 dark:text-red-400",    icon: FileText },
  docx: { bg: "bg-blue-100 dark:bg-blue-900/20",   text: "text-blue-600 dark:text-blue-400",   icon: FileText },
  doc:  { bg: "bg-blue-100 dark:bg-blue-900/20",   text: "text-blue-600 dark:text-blue-400",   icon: FileText },
  xlsx: { bg: "bg-emerald-100 dark:bg-emerald-900/20", text: "text-emerald-600 dark:text-emerald-400", icon: FileSpreadsheet },
  xls:  { bg: "bg-emerald-100 dark:bg-emerald-900/20", text: "text-emerald-600 dark:text-emerald-400", icon: FileSpreadsheet },
  csv:  { bg: "bg-emerald-100 dark:bg-emerald-900/20", text: "text-emerald-600 dark:text-emerald-400", icon: FileSpreadsheet },
  png:  { bg: "bg-amber-100 dark:bg-amber-900/20", text: "text-amber-600 dark:text-amber-400", icon: FileImage },
  jpg:  { bg: "bg-amber-100 dark:bg-amber-900/20", text: "text-amber-600 dark:text-amber-400", icon: FileImage },
  jpeg: { bg: "bg-amber-100 dark:bg-amber-900/20", text: "text-amber-600 dark:text-amber-400", icon: FileImage },
};

const DEFAULT_FILE_ICON = { bg: "bg-gray-100 dark:bg-gray-800/30", text: "text-gray-600 dark:text-gray-400", icon: File };

function getFileIconConfig(fileName: string) {
  const ext = fileName.split(".").pop()?.toLowerCase() || "";
  return FILE_ICON_CONFIG[ext] || DEFAULT_FILE_ICON;
}

/* Category badge colors */
const CATEGORY_COLORS: Record<string, string> = {
  Policies: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800",
  Templates: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:text-purple-400 dark:border-purple-800",
  Payroll: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800",
  "Tax Forms": "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800",
  General: "bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-800/30 dark:text-gray-400 dark:border-gray-700",
};

/* Folder icon colors */
const FOLDER_COLORS = [
  "bg-blue-100 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400",
  "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400",
  "bg-green-100 text-green-600 dark:bg-green-900/20 dark:text-green-400",
  "bg-amber-100 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400",
];

/* Category filter tabs */
const CATEGORY_TABS = ["All Files", "Contracts", "Policies", "Tax Forms", "Templates", "Payroll"];

export default function DocumentsPage() {
  const { data: session } = useSession();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [policies, setPolicies] = useState<Document[]>([]);
  const [expiringDocs, setExpiringDocs] = useState<Document[]>([]);
  const [stats, setStats] = useState<Awaited<ReturnType<typeof getDocumentStats>>>(null);
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState<string>("all");
  const [selectedCategory, setSelectedCategory] = useState("All Files");
  const [searchTerm, setSearchTerm] = useState("");
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [page, setPage] = useState(1);
  const pageSize = 5;

  const isAdmin = session?.user?.role === "CEO" || session?.user?.role === "ADMIN";
  const isAdminRef = useRef(isAdmin);
  isAdminRef.current = isAdmin;

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const type = isDocumentType(selectedType) ? selectedType : undefined;
      const admin = isAdminRef.current;
      const [docsData, policiesData, expiringData, statsData] = await Promise.all([
        admin ? getDocuments({ type }) : getMyDocuments(),
        getCompanyPolicies(),
        admin ? getExpiringDocuments(30) : Promise.resolve([]),
        getDocumentStats(),
      ]);
      setDocuments(docsData);
      setPolicies(policiesData);
      setExpiringDocs(expiringData);
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

      // Category filter
      if (selectedCategory !== "All Files") {
        const docTypeLabel = DOCUMENT_TYPES.find((t) => t.value === doc.type)?.label || "";
        const categoryMatch =
          selectedCategory === "Contracts" && (doc.type === "CONTRACT" || doc.type === "OFFER_LETTER") ||
          selectedCategory === "Policies" && doc.type === "POLICY" ||
          selectedCategory === "Tax Forms" && (doc.type === "ID_PROOF" || doc.tags?.some(t => t.toLowerCase().includes("tax"))) ||
          selectedCategory === "Templates" && doc.tags?.some(t => t.toLowerCase().includes("template")) ||
          selectedCategory === "Payroll" && doc.type === "PAYSLIP";
        if (!categoryMatch) return false;
      }

      return matchesSearch;
    });
  }, [documents, searchTerm, selectedCategory]);

  // Pagination
  const totalFiltered = filteredDocuments.length;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / pageSize));
  const paginatedDocuments = filteredDocuments.slice((page - 1) * pageSize, page * pageSize);

  const handleDelete = async (documentId: number) => {
    const result = await deleteDocument(documentId);
    if (result.success) {
      toast.success("Document deleted");
      loadData();
    } else {
      toast.error(result.error);
    }
  };

  const getDocTypeBadge = (type: string) => {
    const label = DOCUMENT_TYPES.find((t) => t.value === type)?.label ?? type;
    const colorClass = CATEGORY_COLORS[label] || CATEGORY_COLORS.General;
    return (
      <Badge variant="outline" className={`text-xs font-medium ${colorClass}`}>
        {label}
      </Badge>
    );
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return "-";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Compute storage usage
  const totalStorageBytes = documents.reduce((acc, doc) => acc + (doc.fileSize || 0), 0);
  const maxStorageGB = 20;
  const usedGB = totalStorageBytes / (1024 * 1024 * 1024);
  const storagePercent = Math.min(100, Math.round((usedGB / maxStorageGB) * 100));

  // Virtual folders from document types
  const folders = [
    { name: "Employee Contracts", count: documents.filter(d => d.type === "CONTRACT" || d.type === "OFFER_LETTER").length, colorIdx: 0 },
    { name: "Company Policies", count: policies.length, colorIdx: 1 },
    { name: "Tax Documents", count: documents.filter(d => d.type === "ID_PROOF" || d.tags?.some(t => t.toLowerCase().includes("tax"))).length, colorIdx: 2 },
    { name: "Archives", count: documents.filter(d => d.type === "OTHER").length, colorIdx: 3 },
  ];

  if (loading) {
    return (
      <div className="flex-1 space-y-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-3.5 w-3.5" />
          <Skeleton className="h-4 w-20" />
        </div>

        {/* Header */}
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

        {/* Search + Category Tabs */}
        <Card className="shadow-sm border">
          <CardContent className="p-4">
            <div className="flex flex-wrap items-center gap-4">
              <Skeleton className="h-10 flex-1 min-w-[200px] max-w-md rounded-md" />
              <Skeleton className="h-9 w-[76px] rounded-md" />
              <div className="flex items-center gap-1">
                {CATEGORY_TABS.map((tab) => (
                  <Skeleton key={tab} className="h-8 rounded-full" style={{ width: `${tab.length * 9 + 24}px` }} />
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main Table */}
        <Card className="shadow-sm border overflow-hidden">
          <CardContent className="p-0">
            {/* Table Header */}
            <div className="flex items-center bg-muted/30 px-6 py-3 border-b">
              <Skeleton className="h-3 w-12" />
              <Skeleton className="h-3 w-16 ml-auto mr-32" />
              <Skeleton className="h-3 w-24 mr-16" />
              <Skeleton className="h-3 w-8 ml-auto" />
            </div>

            {/* Folders Label */}
            <div className="px-6 py-3">
              <Skeleton className="h-3 w-14" />
            </div>

            {/* Folder Cards Grid */}
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

            {/* Document Rows */}
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

            {/* Pagination */}
            <div className="flex items-center justify-between px-6 py-4 border-t">
              <Skeleton className="h-4 w-52" />
              <div className="flex items-center gap-2">
                <Skeleton className="h-8 w-[72px] rounded-md" />
                <Skeleton className="h-8 w-[52px] rounded-md" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Storage Usage */}
        <div className="flex items-center gap-3">
          <Skeleton className="h-4 w-8" />
          <Skeleton className="w-32 h-2 rounded-full" />
          <Skeleton className="h-3 w-20" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span>HR Admin</span>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="font-medium text-foreground">Documents</span>
      </div>

      {/* Header */}
      <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Document Library</h1>
          <p className="text-sm text-muted-foreground">
            Centralized repository for all company-wide HR documents, contracts, and policy files.
          </p>
        </div>
        <div className="flex items-center gap-3 mt-4 md:mt-0">
          <Button variant="outline" className="gap-2">
            <FolderPlus className="h-4 w-4" />
            New Folder
          </Button>
          <Button
            className="bg-[#2563eb] hover:bg-[#1d4ed8] text-white font-semibold shadow-sm gap-2"
            onClick={() => setIsUploadOpen(true)}
          >
            <Upload className="h-4 w-4" />
            Upload Document
          </Button>
        </div>
      </div>

      {/* Search + Category Tabs */}
      <Card className="shadow-sm border">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="relative flex-1 min-w-[200px] max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden="true" />
              <Input
                placeholder="Search by name, tag, or content..."
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
                className="pl-9 border-0 bg-muted/50 focus-visible:bg-background"
                aria-label="Search documents"
              />
            </div>
            <Button variant="outline" size="sm" className="gap-1.5 text-sm">
              <Filter className="h-3.5 w-3.5" />
              Filter
            </Button>
            <div className="flex items-center gap-1">
              {CATEGORY_TABS.map((cat) => (
                <button
                  key={cat}
                  onClick={() => { setSelectedCategory(cat); setPage(1); }}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all border ${
                    selectedCategory === cat
                      ? "bg-[#2563eb] text-white border-[#2563eb]"
                      : "bg-white dark:bg-background text-muted-foreground border-border hover:border-foreground/20 hover:bg-muted/50"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Table */}
      <Card className="shadow-sm border overflow-hidden">
        <CardContent className="p-0" aria-live="polite">
          <Table>
            <caption className="sr-only">Document library</caption>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead scope="col" className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-6 py-3">
                  <div className="flex items-center gap-1">
                    Name
                    <ArrowDown className="h-3 w-3" />
                  </div>
                </TableHead>
                <TableHead scope="col" className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-6 py-3">Category</TableHead>
                <TableHead scope="col" className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-6 py-3">Date Modified</TableHead>
                <TableHead scope="col" className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-6 py-3 text-right">Size</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {/* Folders Row */}
              {page === 1 && selectedCategory === "All Files" && searchTerm === "" && (
                <>
                  <TableRow>
                    <TableCell colSpan={4} className="px-6 py-3">
                      <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Folders</p>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell colSpan={4} className="px-6 py-0 pb-4">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {folders.map((folder) => (
                          <button
                            key={folder.name}
                            className="flex items-center gap-3 p-3 rounded-xl border border-border bg-background hover:bg-muted/30 transition-colors text-left"
                          >
                            <div className={`p-2 rounded-lg ${FOLDER_COLORS[folder.colorIdx]}`}>
                              <Folder className="h-5 w-5" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate">{folder.name}</p>
                              <p className="text-xs text-muted-foreground">{folder.count} files</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    </TableCell>
                  </TableRow>
                </>
              )}

              {/* Document Rows */}
              {paginatedDocuments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4}>
                    <div className="flex flex-col items-center justify-center py-16">
                      <EmptyDocumentsIllustration className="mb-3" />
                      <h3 className="text-lg font-medium text-foreground">No documents found</h3>
                      <p className="text-muted-foreground mb-4">Upload your first document to get started</p>
                      <Button onClick={() => setIsUploadOpen(true)}>
                        <Upload className="mr-2 h-4 w-4" />
                        Upload Document
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                paginatedDocuments.map((doc) => {
                  const fileConfig = getFileIconConfig(doc.fileName || doc.name);
                  const FileIcon = fileConfig.icon;
                  const typeLabel = DOCUMENT_TYPES.find((t) => t.value === doc.type)?.label || "General";
                  const categoryColor = CATEGORY_COLORS[typeLabel] || CATEGORY_COLORS.General;

                  return (
                    <TableRow key={doc.id} className="hover:bg-muted/30 transition-colors group cursor-pointer"
                      onClick={() => viewFile(doc.fileUrl)}>
                      <TableCell className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg flex-shrink-0 ${fileConfig.bg}`}>
                            <FileIcon className={`h-5 w-5 ${fileConfig.text}`} />
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-sm text-foreground truncate">
                              {doc.fileName || doc.name}
                            </p>
                            {doc.tags && doc.tags.length > 0 && (
                              <div className="flex gap-1.5 mt-1">
                                {doc.tags.slice(0, 3).map((tag) => (
                                  <Badge
                                    key={tag}
                                    variant="outline"
                                    className={`text-[10px] px-1.5 py-0 font-medium ${
                                      tag.toLowerCase().includes("confidential")
                                        ? "bg-red-50 text-red-600 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800"
                                        : "bg-muted/50 text-muted-foreground border-border"
                                    }`}
                                  >
                                    #{tag}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="px-6 py-4">
                        <Badge variant="outline" className={`text-xs font-medium ${categoryColor}`}>
                          {typeLabel}
                        </Badge>
                      </TableCell>
                      <TableCell className="px-6 py-4 text-sm text-muted-foreground">
                        {doc.createdAt ? format(new Date(doc.createdAt), "MMM dd, yyyy") : "-"}
                      </TableCell>
                      <TableCell className="px-6 py-4 text-sm text-muted-foreground text-right">
                        <div className="flex items-center justify-end gap-2">
                          <span>{formatFileSize(doc.fileSize)}</span>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                              <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); viewFile(doc.fileUrl); }}>
                                <Eye className="mr-2 h-4 w-4" />
                                View
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); downloadFile(doc.fileUrl, doc.fileName || doc.name); }}>
                                <Download className="mr-2 h-4 w-4" />
                                Download
                              </DropdownMenuItem>
                              {(doc.version || 1) > 1 && (
                                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); toast.info(`Document "${doc.name}" has ${doc.version} versions.`); }}>
                                  <History className="mr-2 h-4 w-4" />
                                  Version History ({doc.version})
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleDelete(doc.id); }} className="text-red-600">
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>

          {/* Pagination */}
          {totalFiltered > 0 && (
            <div className="flex items-center justify-between px-6 py-4 border-t">
              <span className="text-sm text-muted-foreground">
                Showing <strong className="text-foreground">{Math.min((page - 1) * pageSize + 1, totalFiltered)}</strong> to{" "}
                <strong className="text-foreground">{Math.min(page * pageSize, totalFiltered)}</strong> of{" "}
                <strong className="text-foreground">{totalFiltered}</strong> results
              </span>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="h-8 text-xs"
                  disabled={page <= 1} onClick={() => setPage(page - 1)}>
                  Previous
                </Button>
                <Button variant="outline" size="sm" className="h-8 text-xs"
                  disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Storage Usage */}
      <div className="flex items-center gap-3 text-sm">
        <div className="flex items-center gap-2 text-muted-foreground">
          <span className="font-medium">{storagePercent}%</span>
        </div>
        <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-[#2563eb] rounded-full transition-all"
            style={{ width: `${storagePercent}%` }}
          />
        </div>
        <span className="text-xs text-muted-foreground">
          of {maxStorageGB}GB used
        </span>
      </div>

      {/* Upload Dialog */}
      <UploadDocumentDialog
        open={isUploadOpen}
        onOpenChange={setIsUploadOpen}
        onSuccess={() => {
          loadData();
          setIsUploadOpen(false);
        }}
        documentTypes={DOCUMENT_TYPES}
        categories={DOCUMENT_CATEGORIES}
        isAdmin={isAdmin}
      />
    </div>
  );
}
