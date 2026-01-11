"use client";

import { useState, useEffect, useMemo } from "react";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import { UploadDocumentDialog } from "./upload-document-dialog";
import { useSession } from "next-auth/react";

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

export default function DocumentsPage() {
  const { data: session } = useSession();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [policies, setPolicies] = useState<Document[]>([]);
  const [expiringDocs, setExpiringDocs] = useState<Document[]>([]);
  const [stats, setStats] = useState<Awaited<ReturnType<typeof getDocumentStats>>>(null);
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [isUploadOpen, setIsUploadOpen] = useState(false);

  const isAdmin = session?.user?.role === "OWNER" || session?.user?.role === "ADMIN";

  useEffect(() => {
    loadData();
  }, [selectedType, isAdmin, session]);

  const loadData = async () => {
    setLoading(true);
    try {
      const type = selectedType === "all" ? undefined : selectedType as any;
      const [docsData, policiesData, expiringData, statsData] = await Promise.all([
        isAdmin ? getDocuments({ type }) : getMyDocuments(),
        getCompanyPolicies(),
        isAdmin ? getExpiringDocuments(30) : Promise.resolve([]),
        getDocumentStats(),
      ]);
      setDocuments(docsData);
      setPolicies(policiesData);
      setExpiringDocs(expiringData);
      setStats(statsData);
    } catch (error) {
      toast.error("Failed to load documents");
    } finally {
      setLoading(false);
    }
  };

  const filteredDocuments = useMemo(() => {
    return documents.filter((doc) => {
      const matchesSearch =
        searchTerm === "" ||
        doc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.tags?.some((tag) => tag.toLowerCase().includes(searchTerm.toLowerCase()));
      return matchesSearch;
    });
  }, [documents, searchTerm]);

  const handleDelete = async (documentId: number) => {
    const result = await deleteDocument(documentId);
    if (result.success) {
      toast.success("Document deleted");
      loadData();
    } else {
      toast.error(result.error);
    }
  };

  const getDocTypeIcon = (type: string) => {
    const docType = DOCUMENT_TYPES.find((t) => t.value === type);
    const Icon = docType?.icon || File;
    return <Icon className="h-4 w-4" />;
  };

  const getDocTypeBadge = (type: string) => {
    const styles: Record<string, string> = {
      CONTRACT: "bg-blue-100 text-blue-800 border-blue-200",
      CERTIFICATE: "bg-purple-100 text-purple-800 border-purple-200",
      ID_PROOF: "bg-emerald-100 text-emerald-800 border-emerald-200",
      PAYSLIP: "bg-amber-100 text-amber-800 border-amber-200",
      POLICY: "bg-indigo-100 text-indigo-800 border-indigo-200",
      OFFER_LETTER: "bg-teal-100 text-teal-800 border-teal-200",
      RESUME: "bg-pink-100 text-pink-800 border-pink-200",
      OTHER: "bg-slate-100 text-slate-800 border-slate-200",
    };
    return (
      <Badge className={`${styles[type] || styles.OTHER} flex items-center gap-1 font-medium`}>
        {getDocTypeIcon(type)}
        {DOCUMENT_TYPES.find((t) => t.value === type)?.label || type}
      </Badge>
    );
  };

  const getExpiryBadge = (expiryDate: string | null) => {
    if (!expiryDate) return null;
    const days = differenceInDays(new Date(expiryDate), new Date());
    if (days < 0) {
      return (
        <Badge className="bg-red-100 text-red-800 border-red-200">
          <AlertTriangle className="h-3 w-3 mr-1" />
          Expired
        </Badge>
      );
    }
    if (days <= 30) {
      return (
        <Badge className="bg-amber-100 text-amber-800 border-amber-200">
          <Clock className="h-3 w-3 mr-1" />
          Expires in {days} days
        </Badge>
      );
    }
    return null;
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return "-";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (loading) {
    return (
      <div className="flex-1 space-y-6 p-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-40" />
        </div>
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-6 p-6 bg-slate-50/50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            Document Management
          </h1>
          <p className="text-slate-600 mt-1">
            {isAdmin
              ? "Manage employee documents, policies, and compliance records"
              : "View and manage your personal documents"}
          </p>
        </div>
        <Button
          onClick={() => setIsUploadOpen(true)}
          className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700"
        >
          <Upload className="mr-2 h-4 w-4" />
          Upload Document
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-0 shadow-sm bg-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">
              Total Documents
            </CardTitle>
            <div className="p-2 bg-violet-100 rounded-lg">
              <FileText className="h-4 w-4 text-violet-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">
              {stats?.totalCount || 0}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Across all categories
            </p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">
              Expiring Soon
            </CardTitle>
            <div className="p-2 bg-amber-100 rounded-lg">
              <CalendarClock className="h-4 w-4 text-amber-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">
              {stats?.expiringCount || 0}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Within next 30 days
            </p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">
              Expired
            </CardTitle>
            <div className="p-2 bg-red-100 rounded-lg">
              <AlertTriangle className="h-4 w-4 text-red-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">
              {stats?.expiredCount || 0}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Need immediate attention
            </p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">
              Company Policies
            </CardTitle>
            <div className="p-2 bg-indigo-100 rounded-lg">
              <Building2 className="h-4 w-4 text-indigo-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">
              {policies.length}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Active policy documents
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue={isAdmin && expiringDocs.length > 0 ? "expiring" : "all"} className="space-y-4">
        <TabsList className="bg-white shadow-sm border">
          {isAdmin && expiringDocs.length > 0 && (
            <TabsTrigger value="expiring" className="data-[state=active]:bg-amber-100 data-[state=active]:text-amber-700">
              <AlertTriangle className="h-4 w-4 mr-2" />
              Expiring ({expiringDocs.length})
            </TabsTrigger>
          )}
          <TabsTrigger value="all" className="data-[state=active]:bg-violet-100 data-[state=active]:text-violet-700">
            All Documents
          </TabsTrigger>
          <TabsTrigger value="policies" className="data-[state=active]:bg-violet-100 data-[state=active]:text-violet-700">
            Company Policies
          </TabsTrigger>
        </TabsList>

        {/* Expiring Documents Tab */}
        {isAdmin && expiringDocs.length > 0 && (
          <TabsContent value="expiring" className="space-y-4">
            <Card className="border-0 shadow-sm">
              <CardHeader className="border-b bg-amber-50/50">
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-amber-500" />
                  Documents Expiring Soon
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50/50">
                      <TableHead>Document</TableHead>
                      <TableHead>Employee</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Expiry Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {expiringDocs.map((doc) => (
                      <TableRow key={doc.id} className="hover:bg-slate-50/50">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-slate-100 rounded-lg">
                              {getDocTypeIcon(doc.type)}
                            </div>
                            <div>
                              <p className="font-medium text-slate-900">{doc.name}</p>
                              <p className="text-xs text-slate-500">{doc.fileName}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Avatar className="h-7 w-7">
                              <AvatarImage src={doc.user?.image || undefined} />
                              <AvatarFallback className="text-xs bg-violet-100 text-violet-700">
                                {doc.user?.firstName?.[0]}{doc.user?.lastName?.[0]}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-slate-600">
                              {doc.user?.firstName} {doc.user?.lastName}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>{getDocTypeBadge(doc.type)}</TableCell>
                        <TableCell className="text-slate-600">
                          {doc.expiryDate ? format(new Date(doc.expiryDate), "MMM d, yyyy") : "-"}
                        </TableCell>
                        <TableCell>{getExpiryBadge(doc.expiryDate)}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => window.open(doc.fileUrl, "_blank")}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* All Documents Tab */}
        <TabsContent value="all" className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search documents..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 bg-white"
              />
            </div>
            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger className="w-[180px] bg-white">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {DOCUMENT_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Documents Table */}
          <Card className="border-0 shadow-sm">
            <CardContent className="p-0">
              {filteredDocuments.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <div className="p-4 bg-slate-100 rounded-full mb-4">
                    <Folder className="h-8 w-8 text-slate-400" />
                  </div>
                  <h3 className="text-lg font-medium text-slate-900">No documents found</h3>
                  <p className="text-slate-500 mb-4">Upload your first document to get started</p>
                  <Button onClick={() => setIsUploadOpen(true)}>
                    <Upload className="mr-2 h-4 w-4" />
                    Upload Document
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50/50">
                      <TableHead>Document</TableHead>
                      {isAdmin && <TableHead>Employee</TableHead>}
                      <TableHead>Type</TableHead>
                      <TableHead>Size</TableHead>
                      <TableHead>Uploaded</TableHead>
                      <TableHead>Expiry</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredDocuments.map((doc) => (
                      <TableRow key={doc.id} className="hover:bg-slate-50/50">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-slate-100 rounded-lg">
                              {getDocTypeIcon(doc.type)}
                            </div>
                            <div>
                              <p className="font-medium text-slate-900">{doc.name}</p>
                              <p className="text-xs text-slate-500">{doc.fileName}</p>
                              {doc.tags && doc.tags.length > 0 && (
                                <div className="flex gap-1 mt-1">
                                  {doc.tags.slice(0, 2).map((tag) => (
                                    <Badge key={tag} variant="outline" className="text-xs px-1.5 py-0">
                                      {tag}
                                    </Badge>
                                  ))}
                                  {doc.tags.length > 2 && (
                                    <Badge variant="outline" className="text-xs px-1.5 py-0">
                                      +{doc.tags.length - 2}
                                    </Badge>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        {isAdmin && (
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Avatar className="h-7 w-7">
                                <AvatarImage src={doc.user?.image || undefined} />
                                <AvatarFallback className="text-xs bg-violet-100 text-violet-700">
                                  {doc.user?.firstName?.[0]}{doc.user?.lastName?.[0]}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-slate-600 text-sm">
                                {doc.user?.firstName} {doc.user?.lastName}
                              </span>
                            </div>
                          </TableCell>
                        )}
                        <TableCell>{getDocTypeBadge(doc.type)}</TableCell>
                        <TableCell className="text-slate-600">
                          {formatFileSize(doc.fileSize)}
                        </TableCell>
                        <TableCell className="text-slate-600">
                          {doc.createdAt ? format(new Date(doc.createdAt), "MMM d, yyyy") : "-"}
                        </TableCell>
                        <TableCell>
                          {doc.expiryDate ? (
                            <div className="flex flex-col gap-1">
                              <span className="text-slate-600 text-sm">
                                {format(new Date(doc.expiryDate), "MMM d, yyyy")}
                              </span>
                              {getExpiryBadge(doc.expiryDate)}
                            </div>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => window.open(doc.fileUrl, "_blank")}
                              >
                                <Eye className="mr-2 h-4 w-4" />
                                View
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={async () => {
                                  try {
                                    const response = await fetch(doc.fileUrl);
                                    const blob = await response.blob();
                                    const url = window.URL.createObjectURL(blob);
                                    const link = document.createElement("a");
                                    link.href = url;
                                    link.download = doc.fileName || doc.name;
                                    document.body.appendChild(link);
                                    link.click();
                                    document.body.removeChild(link);
                                    window.URL.revokeObjectURL(url);
                                    toast.success("Download started");
                                  } catch {
                                    toast.error("Failed to download file");
                                  }
                                }}
                              >
                                <Download className="mr-2 h-4 w-4" />
                                Download
                              </DropdownMenuItem>
                              {(doc.version || 1) > 1 && (
                                <DropdownMenuItem>
                                  <History className="mr-2 h-4 w-4" />
                                  Version History
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => handleDelete(doc.id)}
                                className="text-red-600"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Company Policies Tab */}
        <TabsContent value="policies" className="space-y-4">
          <Card className="border-0 shadow-sm">
            <CardHeader className="border-b bg-indigo-50/50">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <Building2 className="h-5 w-5 text-indigo-600" />
                Company Policies & Guidelines
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {policies.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <div className="p-4 bg-indigo-100 rounded-full mb-4">
                    <Building2 className="h-8 w-8 text-indigo-600" />
                  </div>
                  <h3 className="text-lg font-medium text-slate-900">No policies found</h3>
                  <p className="text-slate-500">Company policies will appear here</p>
                </div>
              ) : (
                <div className="divide-y">
                  {policies.map((policy) => (
                    <div
                      key={policy.id}
                      className="flex items-center justify-between p-4 hover:bg-slate-50/50 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-indigo-100 rounded-lg">
                          <FileText className="h-6 w-6 text-indigo-600" />
                        </div>
                        <div>
                          <h4 className="font-medium text-slate-900">{policy.name}</h4>
                          {policy.description && (
                            <p className="text-sm text-slate-500 mt-0.5">{policy.description}</p>
                          )}
                          <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
                            <span>
                              Updated {policy.updatedAt ? format(new Date(policy.updatedAt), "MMM d, yyyy") : "-"}
                            </span>
                            {policy.version && policy.version > 1 && (
                              <span>Version {policy.version}</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(policy.fileUrl, "_blank")}
                        className="shrink-0"
                      >
                        <Eye className="mr-2 h-4 w-4" />
                        View Policy
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Upload Document Dialog */}
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

