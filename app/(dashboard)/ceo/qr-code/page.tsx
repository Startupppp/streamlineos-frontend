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
  ScanLine,
  Link2,
  CalendarDays,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { toast } from "sonner";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type QRCodeData = {
  id: number;
  slug: string;
  targetUrl: string;
  imageUrl: string;
  scanCount: number;
  createdAt: Date | null;
};

function QRCodeImage({ imageUrl, size = 96 }: { imageUrl: string; size?: number }) {
  const [src, setSrc] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    setError(false);
    setSrc(null);
    if (!imageUrl?.trim()) { setSrc("/placeholder.png"); return; }
    const trimmed = imageUrl.trim();
    if (trimmed.startsWith("http") || trimmed.startsWith("/")) {
      setSrc(trimmed);
    } else {
      getQRCodeImageUrl(trimmed).then(setSrc).catch(() => setError(true));
    }
  }, [imageUrl]);

  if (error) {
    return (
      <div className="flex items-center justify-center h-full w-full text-xs text-muted-foreground">
        <QrCodeIcon className="h-8 w-8 text-muted-foreground/30" />
      </div>
    );
  }
  if (!src) {
    return (
      <div className="flex items-center justify-center h-full w-full">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground/40" />
      </div>
    );
  }
  return (
    <Image
      src={src}
      alt="QR Code"
      width={size}
      height={size}
      className="object-contain w-full h-full"
      unoptimized={src.startsWith("http")}
      onError={() => setError(true)}
    />
  );
}

function QRCard({
  qr,
  onDelete,
  onDownload,
}: {
  qr: QRCodeData;
  onDelete: (id: number) => void;
  onDownload: (slug: string, format: "png" | "jpeg" | "svg") => void;
}) {
  const domain = (() => {
    try { return new URL(qr.targetUrl).hostname; } catch { return qr.targetUrl; }
  })();

  return (
    <div className="rounded-xl border bg-card flex flex-col overflow-hidden hover:shadow-soft transition-shadow">
      {/* QR preview */}
      <div className="bg-white flex items-center justify-center p-4 h-36 border-b">
        <div className="relative h-full aspect-square">
          <QRCodeImage imageUrl={qr.imageUrl} size={120} />
        </div>
      </div>

      {/* Info */}
      <div className="p-4 flex flex-col gap-3 flex-1">
        <div className="space-y-1.5">
          <Link
            href={qr.targetUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 group"
          >
            <span className="text-sm font-medium truncate group-hover:text-gold transition-colors">
              {domain}
            </span>
            <ExternalLink className="h-3 w-3 shrink-0 text-muted-foreground group-hover:text-gold transition-colors" />
          </Link>
          <p className="text-[11px] text-muted-foreground truncate">{qr.targetUrl}</p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <ScanLine className="h-3 w-3 shrink-0" />
            <span className="font-semibold text-foreground">{qr.scanCount}</span>
            <span>scans</span>
          </div>
          <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <CalendarDays className="h-3 w-3 shrink-0" />
            {qr.createdAt ? new Date(qr.createdAt).toLocaleDateString() : "—"}
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <Link2 className="h-3 w-3 text-muted-foreground shrink-0" />
          <code className="text-[11px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground truncate flex-1">
            /qr/{qr.slug}
          </code>
        </div>
      </div>

      {/* Actions */}
      <div className="px-4 pb-4 flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="flex-1 h-8 text-xs gap-1.5">
              <Download className="h-3.5 w-3.5" />
              Download
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem onClick={() => onDownload(qr.slug, "png")}>
              <FileImage className="mr-2 h-3.5 w-3.5" /> PNG
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onDownload(qr.slug, "jpeg")}>
              <FileImage className="mr-2 h-3.5 w-3.5" /> JPEG
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onDownload(qr.slug, "svg")}>
              <FileType className="mr-2 h-3.5 w-3.5" /> SVG
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0"
          onClick={() => onDelete(qr.id)}
          aria-label="Delete QR code"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

function QRCardSkeleton() {
  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      <Skeleton className="h-36 w-full rounded-none" />
      <div className="p-4 space-y-3">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-1/2" />
      </div>
      <div className="px-4 pb-4">
        <Skeleton className="h-8 w-full" />
      </div>
    </div>
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
      subtitle="Generate trackable QR codes for your marketing campaigns."
      badge={typedCodes.length > 0 ? String(typedCodes.length) : undefined}
      actions={
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => refetch()} disabled={isLoadingData} aria-label="Refresh">
          <RefreshCw className={cn("h-3.5 w-3.5", isLoadingData && "animate-spin")} />
        </Button>
      }
    >
      <div className="space-y-6">
        {/* Generator */}
        <div className="rounded-xl border bg-card p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-9 w-9 rounded-xl bg-gold/10 ring-1 ring-gold/20 flex items-center justify-center shrink-0">
              <QrCodeIcon className="h-4 w-4 text-gold" />
            </div>
            <div>
              <p className="text-sm font-semibold">Generate New QR Code</p>
              <p className="text-xs text-muted-foreground">Enter the destination URL to create a tracked QR code</p>
            </div>
          </div>
          <form onSubmit={handleGenerate} className="flex gap-2">
            <div className="flex-1 space-y-1">
              <Label htmlFor="target-url" className="sr-only">Target URL</Label>
              <Input
                id="target-url"
                placeholder="https://example.com/campaign-landing-page"
                value={targetUrl}
                onChange={(e) => setTargetUrl(e.target.value)}
                required
                type="url"
                className="h-9"
              />
            </div>
            <Button type="submit" disabled={generateMutation.isPending || !targetUrl} size="sm" className="h-9 shrink-0">
              {generateMutation.isPending ? (
                <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
              ) : (
                <QrCodeIcon className="mr-2 h-3.5 w-3.5" />
              )}
              Generate
            </Button>
          </form>
        </div>

        {/* Cards grid */}
        <div>
          {isLoadingData ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {Array.from({ length: 4 }).map((_, i) => <QRCardSkeleton key={i} />)}
            </div>
          ) : typedCodes.length === 0 ? (
            <div className="rounded-xl border border-dashed bg-muted/20 flex flex-col items-center justify-center py-14 gap-3">
              <div className="h-12 w-12 rounded-2xl bg-muted flex items-center justify-center">
                <QrCodeIcon className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium">No QR codes yet</p>
              <p className="text-xs text-muted-foreground">Generate your first QR code above.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {typedCodes.map((qr) => (
                <QRCard
                  key={qr.id}
                  qr={qr}
                  onDelete={setDeleteId}
                  onDownload={handleDownload}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={deleteId !== null}
        onOpenChange={(open) => { if (!open) setDeleteId(null); }}
        title="Delete QR Code"
        description="This action cannot be undone. The QR code and its tracking data will be permanently deleted."
        confirmLabel="Delete"
        destructive
        onConfirm={handleDeleteConfirm}
      />
    </PageWrapper>
  );
}
