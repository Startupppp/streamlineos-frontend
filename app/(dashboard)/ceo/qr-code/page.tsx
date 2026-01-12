"use client";

import { useState, useEffect, useCallback } from "react";
import { useGetOrganizations } from "@/lib/hooks/auth-hooks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { generateQRCode, getQRCodes, deleteQRCode, getQRCodeImageUrl } from "./actions";
import { Loader2, QrCode as QrCodeIcon, ExternalLink, RefreshCw, FileImage, FileType, Trash2, MoreHorizontal } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { toast } from "sonner";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type QRCodeData = {
  id: number;
  slug: string;
  targetUrl: string;
  imageUrl: string;
  scanCount: number;
  createdAt: Date | null;
};

function QRCodeImage({ imageUrl }: { imageUrl: string }) {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [imageError, setImageError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!imageUrl || !imageUrl.trim()) {
      setImageSrc("/placeholder.png");
      setIsLoading(false);
      return;
    }

    const trimmedUrl = imageUrl.trim();

    const isValidUrl = trimmedUrl.startsWith("http://") || 
                       trimmedUrl.startsWith("https://") || 
                       trimmedUrl.startsWith("/");

    if (isValidUrl) {
      setImageSrc(trimmedUrl);
      setIsLoading(false);
    } else {
      setIsLoading(true);
      getQRCodeImageUrl(trimmedUrl)
        .then((url: string) => {
          if (url && (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("/"))) {
            setImageSrc(url);
          } else {
            setImageError(true);
          }
          setIsLoading(false);
        })
        .catch(() => {
          setImageError(true);
          setIsLoading(false);
        });
    }
  }, [imageUrl]);

  if (imageError) {
    return (
      <div className="flex items-center justify-center h-full text-xs text-muted-foreground">
        Error
      </div>
    );
  }

  if (isLoading || !imageSrc) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!imageSrc) {
    return (
      <div className="flex items-center justify-center h-full text-xs text-muted-foreground">
        No image
      </div>
    );
  }

  const isValidSrc = imageSrc.startsWith("http://") || 
                     imageSrc.startsWith("https://") || 
                     (imageSrc.startsWith("/") && imageSrc.length > 1);

  if (!isValidSrc) {
    return (
      <div className="flex items-center justify-center h-full text-xs text-muted-foreground">
        Invalid URL
      </div>
    );
  }

  try {
    if (imageSrc.startsWith("http://") || imageSrc.startsWith("https://")) {
      new URL(imageSrc);
    }
  } catch {
    return (
      <div className="flex items-center justify-center h-full text-xs text-muted-foreground">
        Invalid URL
      </div>
    );
  }

  return (
    <Image 
      src={imageSrc} 
      alt="QR Code" 
      fill 
      className="object-contain"
      unoptimized={imageSrc.startsWith("http://") || imageSrc.startsWith("https://")}
      onError={() => setImageError(true)}
    />
  );
}

export default function CEOQRCodePage() {
  const { data: session } = useSession();
  const router = useRouter();
  const { data: organizations, isLoading: isOrgLoading } = useGetOrganizations();
  const [targetUrl, setTargetUrl] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [qrCodes, setQrCodes] = useState<QRCodeData[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [qrCodeToDelete, setQrCodeToDelete] = useState<number | null>(null);

  useEffect(() => {
    if (session?.user?.role && session.user.role !== "OWNER") {
      toast.error("Access Denied: Only organization owners can access QR codes.");
      router.push("/dashboard");
    }
  }, [session, router]);

  const orgId = organizations?.[0]?.id;

  const fetchQRCodes = useCallback(async () => {
    if (!orgId) return;
    setIsLoadingData(true);
    try {
      const data = await getQRCodes(orgId);
      setQrCodes(data);
    } catch {
      toast.error("Failed to load QR codes");
    } finally {
      setIsLoadingData(false);
    }
  }, [orgId]);

  useEffect(() => {
    if (orgId) {
      fetchQRCodes();
    }
  }, [orgId, fetchQRCodes]);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgId) {
        toast.error("No organization found");
        return;
    }
    if (!targetUrl) return;

    setIsGenerating(true);
    const formData = new FormData();
    formData.append("targetUrl", targetUrl);
    formData.append("orgId", orgId);

    try {
      const result = await generateQRCode(formData);
      if (result.success) {
        toast.success("QR Code generated successfully");
        setTargetUrl("");
        fetchQRCodes();
      } else {
        toast.error(result.error || "Failed to generate QR code");
      }
    } catch {
      toast.error("An error occurred");
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadQRCode = async (imageUrl: string, slug: string, format: "png" | "jpeg" | "svg") => {
    try {
      const downloadUrl = `/api/qr-code/download?slug=${encodeURIComponent(slug)}&format=${format}`;
      
      const response = await fetch(downloadUrl, {
        method: "GET",
        credentials: "include",
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Download failed" }));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const blob = await response.blob();
      
      if (blob.size === 0) {
        throw new Error("Downloaded file is empty");
      }

      const contentType = response.headers.get("content-type");
      const contentDisposition = response.headers.get("content-disposition");
      let filename = `qr-code-${slug}.${format === "jpeg" ? "jpg" : format === "svg" ? "svg" : "png"}`;
      
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="?([^"]+)"?/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      link.style.display = "none";
      document.body.appendChild(link);
      link.click();
      
      setTimeout(() => {
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }, 100);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      toast.error(`Failed to download QR code: ${errorMessage}`);
    }
  };

  const handleDeleteClick = (id: number) => {
    setQrCodeToDelete(id);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!qrCodeToDelete) return;
    
    try {
      const result = await deleteQRCode(qrCodeToDelete);
      if (result.success) {
        toast.success("QR Code deleted successfully");
        fetchQRCodes();
      } else {
        toast.error(result.error || "Failed to delete QR code");
      }
    } catch {
      toast.error("An error occurred");
    } finally {
      setDeleteDialogOpen(false);
      setQrCodeToDelete(null);
    }
  };

  if (!session?.user || session.user.role !== "OWNER") {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (isOrgLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!organizations || organizations.length === 0) {
      return (
          <div className="p-8 text-center">
              <h2 className="text-xl font-bold">No Organization Found</h2>
              <p className="text-muted-foreground">You need to have an organization to create QR codes.</p>
          </div>
      )
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">QR Code Manager</h1>
        <p className="text-muted-foreground">Generate and track QR codes for your marketing campaigns.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Generate New QR Code</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleGenerate} className="flex gap-4 items-end">
            <div className="flex-1 space-y-2">
              <label className="text-sm font-medium">Target Website URL</label>
              <Input
                placeholder="https://example.com/campaign"
                value={targetUrl}
                onChange={(e) => setTargetUrl(e.target.value)}
                required
                type="url"
              />
            </div>
            <Button type="submit" disabled={isGenerating}>
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating...
                </>
              ) : (
                <>
                  <QrCodeIcon className="mr-2 h-4 w-4" /> Generate QR
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Your QR Codes</CardTitle>
          <Button variant="ghost" size="sm" onClick={fetchQRCodes} disabled={isLoadingData}>
            <RefreshCw className={`h-4 w-4 ${isLoadingData ? "animate-spin" : ""}`} />
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>QR Code</TableHead>
                <TableHead>Target URL</TableHead>
                <TableHead>Scans</TableHead>
                <TableHead>Tracking Link</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {qrCodes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No QR codes generated yet.
                  </TableCell>
                </TableRow>
              ) : (
                  qrCodes.map((qr) => (
                    <TableRow key={qr.id}>
                      <TableCell>
                        <div className="relative h-16 w-16 bg-white p-1 rounded border">
                            <QRCodeImage imageUrl={qr.imageUrl} />
                        </div>
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        <Link href={qr.targetUrl} target="_blank" className="hover:underline flex items-center gap-1">
                            {qr.targetUrl} <ExternalLink className="h-3 w-3" />
                        </Link>
                      </TableCell>
                      <TableCell>
                        <div className="font-bold text-lg">{qr.scanCount}</div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm font-mono bg-muted px-2 py-1 rounded">
                            {typeof window !== 'undefined' ? `${window.location.origin}/qr/${qr.slug}` : `/qr/${qr.slug}`}
                        </span>
                      </TableCell>
                       <TableCell>
                        {qr.createdAt ? new Date(qr.createdAt).toLocaleDateString() : "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                              <span className="sr-only">Actions</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => downloadQRCode(qr.imageUrl, qr.slug, "png")}>
                                <FileImage className="mr-2 h-4 w-4" /> PNG
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => downloadQRCode(qr.imageUrl, qr.slug, "jpeg")}>
                                <FileImage className="mr-2 h-4 w-4" /> JPEG
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => downloadQRCode(qr.imageUrl, qr.slug, "svg")}>
                                <FileType className="mr-2 h-4 w-4" /> SVG
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDeleteClick(qr.id)} className="text-red-600 focus:text-red-600 focus:bg-red-50">
                                <Trash2 className="mr-2 h-4 w-4" /> Delete
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

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete QR Code</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this QR code? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
