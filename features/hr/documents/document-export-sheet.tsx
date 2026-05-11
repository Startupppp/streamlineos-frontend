"use client";

import { useState, useCallback, useMemo } from "react";
import { Download, Loader2, Mail, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useHrEmployees } from "@/lib/api/hooks/hr";
import type { DocumentExportFilters } from "@/lib/hr/documents-export-filters";
import { formatDocumentExportLabel } from "@/lib/hr/documents-export-filters";
import { DOCUMENT_TYPES } from "@/features/hr/documents/document-filters";
import { getErrorMessage } from "@/lib/get-error-message";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export type DocumentEmailRecipients = "HR" | "CEO" | "BOTH";

export interface DocumentExportSheetProps {
  isDocumentsAdmin: boolean;
  canEmailPack: boolean;
  /** Seed filters from the library UI (e.g. active type tab). */
  initialType?: string;
  initialCategory?: string;
}

export function DocumentExportSheet({
  isDocumentsAdmin,
  canEmailPack,
  initialType,
  initialCategory,
}: DocumentExportSheetProps) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"export" | "email">("export");
  const [type, setType] = useState<string>("");
  const [category, setCategory] = useState("");
  const [tag, setTag] = useState("");
  const [createdFrom, setCreatedFrom] = useState("");
  const [createdTo, setCreatedTo] = useState("");
  const [filterUserId, setFilterUserId] = useState<string>("");
  const [uploadedBy, setUploadedBy] = useState<string>("");
  const [emailRecipients, setEmailRecipients] = useState<DocumentEmailRecipients>("BOTH");
  const [emailSubject, setEmailSubject] = useState("");
  const [emailMessage, setEmailMessage] = useState("");
  const [emailCc, setEmailCc] = useState("");
  const [emailBcc, setEmailBcc] = useState("");
  const [exporting, setExporting] = useState(false);
  const [sending, setSending] = useState(false);

  const { data: employees = [] } = useHrEmployees(undefined);

  const employeeList = useMemo(
    () =>
      (employees as { id: string; firstName: string | null; lastName: string | null; name: string | null }[]).map(
        (e) => ({
          id: e.id,
          label: e.firstName ? `${e.firstName} ${e.lastName ?? ""}`.trim() : e.name ?? e.id,
        }),
      ),
    [employees],
  );

  const buildFilters = useCallback((): DocumentExportFilters => {
    const f: DocumentExportFilters = {};
    if (type && type !== "all") {
      const t = DOCUMENT_TYPES.find((x) => x.value === type)?.value;
      if (t) f.type = t as DocumentExportFilters["type"];
    }
    if (category.trim()) f.category = category.trim();
    if (tag.trim()) f.tag = tag.trim();
    if (createdFrom) f.createdFrom = createdFrom;
    if (createdTo) f.createdTo = createdTo;
    if (isDocumentsAdmin && filterUserId) f.filterUserId = filterUserId;
    if (isDocumentsAdmin && uploadedBy) f.uploadedBy = uploadedBy;
    return f;
  }, [type, category, tag, createdFrom, createdTo, filterUserId, uploadedBy, isDocumentsAdmin]);

  const filterSummary = useMemo(() => formatDocumentExportLabel(buildFilters()), [buildFilters]);

  const resetFromInitial = useCallback(() => {
    setType(initialType && initialType !== "all" ? initialType : "");
    setCategory(initialCategory && initialCategory !== "All Files" ? initialCategory : "");
    setTag("");
    setCreatedFrom("");
    setCreatedTo("");
    setFilterUserId("");
    setUploadedBy("");
    setEmailRecipients("BOTH");
    setEmailSubject("");
    setEmailMessage("");
    setEmailCc("");
    setEmailBcc("");
    setTab("export");
  }, [initialType, initialCategory]);

  const handleOpenChange = (v: boolean) => {
    setOpen(v);
    if (v) resetFromInitial();
  };

  const handleDownloadZip = async () => {
    setExporting(true);
    try {
      const filters = buildFilters();
      const res = await fetch("/api/hr/documents/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(filters),
      });
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error((errBody as { error?: string }).error ?? res.statusText);
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `documents-export-${new Date().toISOString().slice(0, 10)}.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      const inc = res.headers.get("X-Documents-Export-Count");
      const skip = res.headers.get("X-Documents-Export-Skipped");
      toast.success("Export downloaded", {
        description: `Included ${inc ?? "?"} file(s)${skip && skip !== "0" ? ` · skipped ${skip}` : ""}`,
      });
      setOpen(false);
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      setExporting(false);
    }
  };

  const handleSendEmail = async () => {
    setSending(true);
    try {
      const filters = buildFilters();
      const label = formatDocumentExportLabel(filters);
      const defaultSubject = `Document report – ${label}`;
      const res = await fetch("/api/hr/documents/export/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          ...filters,
          recipients: emailRecipients,
          subject: emailSubject.trim() || defaultSubject,
          message: emailMessage.trim() || undefined,
          cc: emailCc.trim() || undefined,
          bcc: emailBcc.trim() || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error((data as { error?: string }).error ?? "Failed to send");
      }
      const payload = data as { included?: number; skipped?: number; warnings?: string[] };
      toast.success("Email sent", {
        description: `ZIP attached · ${payload.included ?? 0} file(s)${
          payload.warnings?.length ? ` · ${payload.warnings.join(" ")}` : ""
        }`,
      });
      setOpen(false);
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      setSending(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Download className="h-4 w-4" />
          <span className="hidden sm:inline">Export / Share</span>
          <span className="sm:hidden">Export</span>
        </Button>
      </SheetTrigger>
      <SheetContent className="flex w-full flex-col gap-0 overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Export &amp; share documents</SheetTitle>
          <SheetDescription>
            Filter the library, download a ZIP of originals, or email a ZIP to leadership (CEO / HR).
          </SheetDescription>
        </SheetHeader>

        <div className="mt-4 flex flex-1 flex-col gap-4 px-1 pb-6">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Document type</Label>
              <Select value={type || "all"} onValueChange={(v) => setType(v === "all" ? "" : v)}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Any type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Any type</SelectItem>
                  {DOCUMENT_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Category / folder (contains)</Label>
              <Input
                className="h-9"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="e.g. Employment"
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-xs">Tag (contains)</Label>
              <Input className="h-9" value={tag} onChange={(e) => setTag(e.target.value)} placeholder="e.g. tax" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Created from</Label>
              <Input className="h-9" type="date" value={createdFrom} onChange={(e) => setCreatedFrom(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Created to</Label>
              <Input className="h-9" type="date" value={createdTo} onChange={(e) => setCreatedTo(e.target.value)} />
            </div>
            {isDocumentsAdmin ? (
              <>
                <div className="space-y-1.5">
                  <Label className="text-xs">Document owner (employee)</Label>
                  <Select value={filterUserId || "__all"} onValueChange={(v) => setFilterUserId(v === "__all" ? "" : v)}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="All employees" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__all">All employees</SelectItem>
                      {employeeList.map((e) => (
                        <SelectItem key={e.id} value={e.id}>
                          {e.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Uploaded by (user id)</Label>
                  <Select value={uploadedBy || "__any"} onValueChange={(v) => setUploadedBy(v === "__any" ? "" : v)}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Anyone" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__any">Anyone</SelectItem>
                      {employeeList.map((e) => (
                        <SelectItem key={`up-${e.id}`} value={e.id}>
                          {e.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            ) : null}
          </div>

          <Tabs value={tab} onValueChange={(v) => setTab(v as "export" | "email")} className="flex-1">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="export" className="gap-1.5">
                <Download className="h-3.5 w-3.5" />
                Download ZIP
              </TabsTrigger>
              <TabsTrigger value="email" className="gap-1.5" disabled={!canEmailPack}>
                <Mail className="h-3.5 w-3.5" />
                Send mail
              </TabsTrigger>
            </TabsList>
            <TabsContent value="export" className="mt-4 space-y-3">
              <p className="text-xs text-muted-foreground">
                Builds a ZIP of up to 100 matching files (original formats). Files that cannot be read from storage are
                skipped.
              </p>
              <Button className="w-full gap-2" onClick={() => void handleDownloadZip()} disabled={exporting}>
                {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                Download ZIP
              </Button>
            </TabsContent>
            <TabsContent value="email" className="mt-4 space-y-4">
              {!canEmailPack ? (
                <p className="text-sm text-muted-foreground">Only CEO, HR, or Admin can email document packs.</p>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label className="text-xs">Recipients</Label>
                    <RadioGroup
                      value={emailRecipients}
                      onValueChange={(v) => setEmailRecipients(v as DocumentEmailRecipients)}
                      className="flex flex-col gap-2"
                    >
                      <label className="flex items-center gap-2 text-sm">
                        <RadioGroupItem value="HR" />
                        HR only
                      </label>
                      <label className="flex items-center gap-2 text-sm">
                        <RadioGroupItem value="CEO" />
                        CEO only
                      </label>
                      <label className="flex items-center gap-2 text-sm">
                        <RadioGroupItem value="BOTH" />
                        HR + CEO
                      </label>
                    </RadioGroup>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Subject (optional)</Label>
                    <Input
                      className="h-9"
                      value={emailSubject}
                      onChange={(e) => setEmailSubject(e.target.value)}
                      placeholder={`Default: Document report – ${filterSummary}`}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Message (optional)</Label>
                    <Textarea
                      rows={3}
                      value={emailMessage}
                      onChange={(e) => setEmailMessage(e.target.value)}
                      placeholder="Short note to include above the file summary…"
                    />
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label className="text-xs">CC (comma-separated)</Label>
                      <Input className="h-9" value={emailCc} onChange={(e) => setEmailCc(e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">BCC (comma-separated)</Label>
                      <Input className="h-9" value={emailBcc} onChange={(e) => setEmailBcc(e.target.value)} />
                    </div>
                  </div>
                  <Button className="w-full gap-2" onClick={() => void handleSendEmail()} disabled={sending}>
                    {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    Send email with ZIP
                  </Button>
                </>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </SheetContent>
    </Sheet>
  );
}
