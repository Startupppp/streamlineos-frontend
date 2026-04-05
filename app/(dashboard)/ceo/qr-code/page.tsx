"use client";

import { useState, useEffect, useCallback } from "react";
import { useGetOrganizations } from "@/lib/hooks/auth-hooks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { generateQRCode, getQRCodes, deleteQRCode, getQRCodeImageUrl } from "./actions";
import {
  Loader2,
  QrCode as QrCodeIcon,
  ExternalLink,
  FileImage,
  FileType,
  Trash2,
  Download,
  RefreshCw,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { toast } from "sonner";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";

type QRCodeData = {
  id: number;
  slug: string;
  targetUrl: string;
  imageUrl: string;
  scanCount: number;
  createdAt: Date | null;
};

function QRCodeImage({ imageUrl }: { imageUrl: string }) {
  const [src, setSrc] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!imageUrl?.trim()) { setSrc("/placeholder.png"); return; }
    const trimmed = imageUrl.trim();
    if (trimmed.startsWith("http") || trimmed.startsWith("/")) {
      setSrc(trimmed);
    } else {
      getQRCodeImageUrl(trimmed).then(setSrc).catch(() => setError(true));
    }
  }, [imageUrl]);

  if (error) return <div className="flex items-center justify-center h-full text-xs text-muted-foreground">Error</div>;
  if (!src) return <div className="flex items-center justify-center h-full"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>;
  return (
    <Image
      src={src}
      alt="QR Code"
      fill
      className="object-contain"
      unoptimized={src.startsWith("http")}
      onError={() => setError(true)}
    />
  );
}

export default function CEOQRCodePage() {
  const { data: session } = useSession();
  const router = useRouter();
  const qc = useQueryClient();
  const { data: organizations, isLoading: isOrgLoading } = useGetOrganizations();
  const [targetUrl, setTargetUrl] = useState("");
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const orgId = organizations?.[0]?.id;

  const { data: qrCodes = [], isLoading: isLoadingData, refetch } = useQuery({
    queryKey: ["qr-codes", orgId],
    queryFn: () => getQRCodes(orgId!),
    enabled: !!orgId,
  });

  const generateMutation = useMutation({
    mutationFn: async () => {
      if (!orgId) throw new Error("No organization found");
      const formData = new FormData();
      formData.append("targetUrl", targetUrl);
      formData.append("orgId", orgId);
      return generateQRCode(formData);
    },
    onSuccess: (result) => {
      if (result.success) {
        toast.success("QR Code generated successfully");
        setTargetUrl("");
        qc.invalidateQueries({ queryKey: ["qr-codes", orgId] });
      } else {
        toast.error(result.error ?? "Failed to generate QR code");
      }
    },
    onError: () => toast.error("An error occurred"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteQRCode(id),
    onSuccess: (result) => {
      if (result.success) {
        toast.success("QR Code deleted");
        qc.invalidateQueries({ queryKey: ["qr-codes", orgId] });
      } else {
        toast.error(result.error ?? "Failed to delete");
      }
      setDeleteId(null);
    },
    onError: () => { toast.error("An error occurred"); setDeleteId(null); },
  });

  const handleDeleteConfirm = useCallback(() => {
    if (deleteId !== null) deleteMutation.mutate(deleteId);
  }, [deleteId, deleteMutation]);

  const handleDeleteDialogChange = useCallback((open: boolean) => {
    if (!open) setDeleteId(null);
  }, []);

  const handleGenerate = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (!targetUrl) return;
    generateMutation.mutate();
  }, [targetUrl, generateMutation]);

  const handleDownload = useCallback(async (slug: string, format: "png" | "jpeg" | "svg") => {
    try {
      const res = await fetch(`/api/qr-code/download?slug=${encodeURIComponent(slug)}&format=${format}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Download failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `qr-${slug}.${format === "jpeg" ? "jpg" : format}`;
      document.body.appendChild(link);
      link.click();
      setTimeout(() => { document.body.removeChild(link); URL.revokeObjectURL(url); }, 100);
    } catch {
      toast.error("Failed to download QR code");
    }
  }, []);

  if (!session?.user || session.user.role !== "CEO") {
    router.push("/dashboard");
    return null;
  }

  if (isOrgLoading) {
    return (
      <div className="flex items-center justify-center h-40">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!organizations?.length) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-xl font-bold">No Organization Found</h2>
        <p className="text-muted-foreground mt-1">You need an organization to create QR codes.</p>
      </div>
    );
  }

  const typedCodes = qrCodes as QRCodeData[];

  return (
    <PageWrapper
      title="QR Code Manager"
      subtitle="Generate and track QR codes for your marketing campaigns."
    >
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Generate New QR Code</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleGenerate} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="target-url" className="text-sm">Target URL</Label>
                <Input
                  id="target-url"
                  placeholder="https://example.com/campaign"
                  value={targetUrl}
                  onChange={(e) => setTargetUrl(e.target.value)}
                  required
                  type="url"
                  className="h-9"
                />
              </div>
              <Button type="submit" disabled={generateMutation.isPending || !targetUrl} size="sm">
                {generateMutation.isPending ? (
                  <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <QrCodeIcon className="mr-2 h-3.5 w-3.5" />
                )}
                Generate QR Code
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between py-3">
            <CardTitle className="text-base">Your QR Codes</CardTitle>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => refetch()} disabled={isLoadingData}>
              <RefreshCw className={`h-3.5 w-3.5 ${isLoadingData ? "animate-spin" : ""}`} />
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-20">QR</TableHead>
                  <TableHead>Target URL</TableHead>
                  <TableHead className="w-20">Scans</TableHead>
                  <TableHead className="hidden md:table-cell">Tracking Link</TableHead>
                  <TableHead className="w-24">Created</TableHead>
                  <TableHead className="w-20 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoadingData ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
                    </TableCell>
                  </TableRow>
                ) : typedCodes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-10 text-muted-foreground text-sm">
                      No QR codes yet. Generate one above.
                    </TableCell>
                  </TableRow>
                ) : (
                  typedCodes.map((qr) => (
                    <TableRow key={qr.id}>
                      <TableCell>
                        <div className="relative h-14 w-14 bg-white rounded border p-0.5">
                          <QRCodeImage imageUrl={qr.imageUrl} />
                        </div>
                      </TableCell>
                      <TableCell className="max-w-[180px]">
                        <Link
                          href={qr.targetUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:underline flex items-center gap-1 text-sm truncate"
                        >
                          <span className="truncate">{qr.targetUrl}</span>
                          <ExternalLink className="h-3 w-3 shrink-0" />
                        </Link>
                      </TableCell>
                      <TableCell>
                        <span className="font-bold">{qr.scanCount}</span>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                          /qr/{qr.slug}
                        </code>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {qr.createdAt ? new Date(qr.createdAt).toLocaleDateString() : "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <Download className="h-3.5 w-3.5" />
                              <span className="sr-only">Actions</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleDownload(qr.slug, "png")}>
                              <FileImage className="mr-2 h-3.5 w-3.5" /> PNG
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDownload(qr.slug, "jpeg")}>
                              <FileImage className="mr-2 h-3.5 w-3.5" /> JPEG
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDownload(qr.slug, "svg")}>
                              <FileType className="mr-2 h-3.5 w-3.5" /> SVG
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => setDeleteId(qr.id)}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="mr-2 h-3.5 w-3.5" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <ConfirmDialog
        open={deleteId !== null}
        onOpenChange={handleDeleteDialogChange}
        title="Delete QR Code"
        description="This action cannot be undone. The QR code and its tracking data will be permanently deleted."
        confirmLabel="Delete"
        destructive
        onConfirm={handleDeleteConfirm}
      />
    </PageWrapper>
  );
}
