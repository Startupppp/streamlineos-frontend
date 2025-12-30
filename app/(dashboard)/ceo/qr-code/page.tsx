"use client";

import { useState, useEffect, useCallback } from "react";
import { useGetOrganizations } from "@/lib/hooks/auth-hooks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { generateQRCode, getQRCodes } from "./actions";
import { Loader2, QrCode as QrCodeIcon, ExternalLink, RefreshCw, Download, FileImage, FileType } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { toast } from "sonner";
import { PageHeader } from "@/components/ui/page-header";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import QRCode from "qrcode";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type QRCodeData = {
  id: number;
  slug: string;
  targetUrl: string;
  imageUrl: string;
  scanCount: number;
  createdAt: Date | null;
};

export default function CEOQRCodePage() {
  const { data: organizations, isLoading: isOrgLoading } = useGetOrganizations();
  const [targetUrl, setTargetUrl] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [qrCodes, setQrCodes] = useState<QRCodeData[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(false);

  // Default to first org for now
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
    if (typeof window !== "undefined") {
        formData.append("origin", window.location.origin);
    }

    try {
      const result = await generateQRCode(formData);
      if (result.success) {
        toast.success("QR Code generated successfully");
        setTargetUrl("");
        fetchQRCodes();
      } else {
        toast.error(result.error || "Failed to generate QR code");
        console.error(result.error);
      }
    } catch {
      toast.error("An error occurred");
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadQRCode = async (slug: string, format: "png" | "jpeg" | "svg") => {
    const trackingUrl = typeof window !== 'undefined' ? `${window.location.origin}/qr/${slug}` : `/qr/${slug}`;
    try {
      let url = "";
      if (format === "svg") {
        const svgString = await QRCode.toString(trackingUrl, { type: "svg", width: 1024, margin: 2 });
        const blob = new Blob([svgString], { type: "image/svg+xml" });
        url = URL.createObjectURL(blob);
      } else {
        // png or jpeg
        url = await QRCode.toDataURL(trackingUrl, { type: "image/jpeg", width: 1024, margin: 2 });
        // default toDataURL returns png? checking type
        if (format === "jpeg") {
           url = await QRCode.toDataURL(trackingUrl, { type: "image/jpeg", width: 1024, margin: 2 });
        } else {
           url = await QRCode.toDataURL(trackingUrl, { type: "image/png", width: 1024, margin: 2 });
        }
      }

      const link = document.createElement("a");
      link.href = url;
      link.download = `qr-code-${slug}.${format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      if (format === "svg") URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      toast.error("Failed to download QR code");
    }
  };

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
      <PageHeader
        title="QR Code Manager"
        description="Generate and track QR codes for your marketing campaigns."
      />

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
                            <Image 
                                src={qr.imageUrl || "/placeholder.png"} 
                                alt="QR Code" 
                                fill 
                                className="object-contain"
                            />
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
                            <Button variant="outline" size="sm">
                              <Download className="h-4 w-4 mr-2" /> Download
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => downloadQRCode(qr.slug, "png")}>
                                <FileImage className="mr-2 h-4 w-4" /> PNG
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => downloadQRCode(qr.slug, "jpeg")}>
                                <FileImage className="mr-2 h-4 w-4" /> JPEG
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => downloadQRCode(qr.slug, "svg")}>
                                <FileType className="mr-2 h-4 w-4" /> SVG
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
  );
}
