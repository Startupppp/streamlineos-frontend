"use client";

import { useState, useCallback, useMemo } from "react";
import Link from "next/link";
import {
  Plus,
  ExternalLink,
  Trash2,
  Pencil,
  Copy,
  Check,
  BarChart2,
  Globe,
  Eye,
  TrendingUp,
  FileText,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { StatCard } from "@/components/ui/stat-card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  useLandingPages,
  useLandingPageDetail,
  useCreateLandingPage,
  useUpdateLandingPage,
  useDeleteLandingPage,
  useCrmPages,
  useUpdateCrmPage,
  useDeleteCrmPage,
  type LandingPage,
  type CrmPage,
} from "@/lib/api/hooks/marketing";
import { getErrorMessage } from "@/lib/get-error-message";
import { toast } from "sonner";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(d: string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function truncateUrl(url: string, max = 40) {
  try {
    const u = new URL(url);
    const path = u.hostname + u.pathname;
    return path.length > max ? path.slice(0, max) + "…" : path;
  } catch {
    return url.length > max ? url.slice(0, max) + "…" : url;
  }
}

// ─── Mini bar chart ───────────────────────────────────────────────────────────

function DailyBarChart({ data }: { data: { date: string; views: number }[] }) {
  const last14 = data.slice(-14);
  const maxVal = Math.max(...last14.map((d) => d.views), 1);

  return (
    <div className="flex items-end gap-1 h-16">
      {last14.map((d) => {
        const pct = Math.round((d.views / maxVal) * 100);
        return (
          <div key={d.date} className="flex-1 flex flex-col items-center gap-0.5 group relative">
            <div
              className="w-full rounded-sm bg-primary/70 hover:bg-primary transition-all"
              style={{ height: `${Math.max(pct, 4)}%` }}
              title={`${d.date}: ${d.views} views`}
            />
          </div>
        );
      })}
    </div>
  );
}

// ─── Percentage bar ───────────────────────────────────────────────────────────

function PercentBar({ label, count, total }: { label: string; count: number; total: number }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="capitalize text-muted-foreground">{label}</span>
        <span className="font-medium">{pct}% <span className="text-muted-foreground">({count})</span></span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-muted">
        <div className="h-1.5 rounded-full bg-primary" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

// ─── Copy Button ──────────────────────────────────────────────────────────────

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handle = useCallback(async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [text]);

  return (
    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handle} aria-label="Copy snippet">
      {copied ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
    </Button>
  );
}

// ─── Detail Drawer content ───────────────────────────────────────────────────

function PageDetailContent({ pageId }: { pageId: number }) {
  const { data, isLoading } = useLandingPageDetail(pageId);

  if (isLoading) {
    return (
      <div className="space-y-4 mt-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-full" />
        ))}
      </div>
    );
  }

  if (!data) return null;

  const { page, viewsByDay, deviceBreakdown, referrerBreakdown } = data;
  const totalDevice = deviceBreakdown.reduce((s, d) => s + d.count, 0);
  const snippet = `<script>fetch('/api/marketing/landing-pages/${pageId}/track',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({referrer:document.referrer,deviceType:/Mobi/i.test(navigator.userAgent)?'mobile':'desktop'})});</script>`;

  return (
    <div className="mt-4 space-y-6">
      {/* URL */}
      <div>
        <p className="text-xs text-muted-foreground mb-1">Page URL</p>
        <a
          href={page.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm font-medium text-primary underline-offset-2 hover:underline flex items-center gap-1 break-all"
        >
          {page.url}
          <ExternalLink className="h-3 w-3 flex-shrink-0" />
        </a>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-lg border bg-muted/40 p-3 text-center">
          <p className="text-xl font-bold">{page.totalViews}</p>
          <p className="text-[11px] text-muted-foreground">All time</p>
        </div>
        <div className="rounded-lg border bg-muted/40 p-3 text-center">
          <p className="text-xl font-bold">{page.weekViews}</p>
          <p className="text-[11px] text-muted-foreground">This week</p>
        </div>
        <div className="rounded-lg border bg-muted/40 p-3 text-center">
          <p className="text-xl font-bold">{page.todayViews}</p>
          <p className="text-[11px] text-muted-foreground">Today</p>
        </div>
      </div>

      {/* Daily chart */}
      <div>
        <p className="text-xs font-medium text-muted-foreground mb-2">Daily Views (last 14 days)</p>
        {viewsByDay.length > 0 ? (
          <DailyBarChart data={viewsByDay} />
        ) : (
          <p className="text-xs text-muted-foreground">No view data yet.</p>
        )}
      </div>

      {/* Device breakdown */}
      {deviceBreakdown.length > 0 && (
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-2">Device Breakdown</p>
          <div className="space-y-2">
            {deviceBreakdown.map((d) => (
              <PercentBar key={d.device} label={d.device} count={d.count} total={totalDevice} />
            ))}
          </div>
        </div>
      )}

      {/* Top referrers */}
      {referrerBreakdown.length > 0 && (
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-2">Top Referrers</p>
          <div className="space-y-1">
            {referrerBreakdown.slice(0, 5).map((r) => (
              <div key={r.referrer} className="flex justify-between text-xs">
                <span className="text-muted-foreground truncate max-w-[70%]">{r.referrer}</span>
                <span className="font-medium">{r.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tracking snippet */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <p className="text-xs font-medium text-muted-foreground">Tracking Snippet</p>
          <CopyButton text={snippet} />
        </div>
        <pre className="text-[10px] leading-relaxed bg-muted rounded-md p-3 overflow-x-auto whitespace-pre-wrap break-all">
          {snippet}
        </pre>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function LandingPagesPage() {
  const [sheetMode, setSheetMode] = useState<"create" | "edit" | "detail" | null>(null);
  const [selectedPage, setSelectedPage] = useState<LandingPage | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [description, setDescription] = useState("");

  const { data, isLoading } = useLandingPages();
  const createPage = useCreateLandingPage();
  const updatePage = useUpdateLandingPage();
  const deletePage = useDeleteLandingPage();

  const pages: LandingPage[] = data?.pages ?? [];

  // Aggregate stats
  const totalPages = pages.length;
  const totalViews = pages.reduce((s, p) => s + p.totalViews, 0);
  const todayViews = pages.reduce((s, p) => s + p.todayViews, 0);
  const weekViews = pages.reduce((s, p) => s + p.weekViews, 0);

  const resetForm = useCallback(() => {
    setName(""); setUrl(""); setDescription("");
  }, []);

  const openCreate = useCallback(() => {
    resetForm();
    setSelectedPage(null);
    setSheetMode("create");
  }, [resetForm]);

  const openEdit = useCallback((page: LandingPage) => {
    setName(page.name);
    setUrl(page.url);
    setDescription(page.description ?? "");
    setSelectedPage(page);
    setSheetMode("edit");
  }, []);

  const openDetail = useCallback((page: LandingPage) => {
    setSelectedPage(page);
    setSheetMode("detail");
  }, []);

  const closeSheet = useCallback(() => {
    setSheetMode(null);
    setSelectedPage(null);
    resetForm();
  }, [resetForm]);

  const handleCreate = useCallback(() => {
    if (!name.trim()) { toast.error("Name is required"); return; }
    if (!url.trim()) { toast.error("URL is required"); return; }
    createPage.mutate(
      { name: name.trim(), url: url.trim(), description: description.trim() || undefined },
      {
        onSuccess: () => { toast.success("Landing page created"); closeSheet(); },
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  }, [name, url, description, createPage, closeSheet]);

  const handleEdit = useCallback(() => {
    if (!selectedPage) return;
    if (!name.trim()) { toast.error("Name is required"); return; }
    if (!url.trim()) { toast.error("URL is required"); return; }
    updatePage.mutate(
      { id: selectedPage.id, name: name.trim(), url: url.trim(), description: description.trim() || undefined },
      {
        onSuccess: () => { toast.success("Landing page updated"); closeSheet(); },
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  }, [selectedPage, name, url, description, updatePage, closeSheet]);

  const handleToggleActive = useCallback((page: LandingPage) => {
    updatePage.mutate(
      { id: page.id, isActive: !page.isActive },
      {
        onSuccess: () => toast.success(page.isActive ? "Page deactivated" : "Page activated"),
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  }, [updatePage]);

  const handleDelete = useCallback(() => {
    if (!deleteId) return;
    deletePage.mutate(deleteId, {
      onSuccess: () => { toast.success("Landing page deleted"); setDeleteId(null); },
      onError: (e) => { toast.error(getErrorMessage(e)); setDeleteId(null); },
    });
  }, [deleteId, deletePage]);

  const sheetTitle = useMemo(() => {
    if (sheetMode === "create") return "Add Landing Page";
    if (sheetMode === "edit") return "Edit Landing Page";
    return selectedPage?.name ?? "Page Details";
  }, [sheetMode, selectedPage]);

  return (
    <PageWrapper
      title="Landing Pages"
      subtitle="Track analytics and performance of your landing pages"
      actions={
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/marketing/landing-pages/new">
              <Plus className="mr-1 h-4 w-4" />
              New Hosted Page
            </Link>
          </Button>
          <Button onClick={openCreate} size="sm" aria-label="Add landing page">
            <Plus className="mr-1 h-4 w-4" />
            Track External Page
          </Button>
        </div>
      }
    >
      <Tabs defaultValue="hosted" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="hosted">
            <FileText className="mr-1.5 h-3.5 w-3.5" />
            Hosted Pages
          </TabsTrigger>
          <TabsTrigger value="tracked">
            <BarChart2 className="mr-1.5 h-3.5 w-3.5" />
            Tracked Pages
          </TabsTrigger>
        </TabsList>

        <TabsContent value="hosted">
          <CrmHostedPagesTab />
        </TabsContent>

        <TabsContent value="tracked">

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total Pages" value={totalPages} icon={Globe} color="blue" />
        <StatCard label="Total Views" value={totalViews.toLocaleString()} icon={Eye} color="gold" />
        <StatCard label="Views Today" value={todayViews} icon={BarChart2} color="green" />
        <StatCard label="Views This Week" value={weekViews.toLocaleString()} icon={TrendingUp} color="purple" />
      </div>

      {/* Table */}
      <ScrollArea className="w-full" type="auto">
        <div className="min-w-[720px]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Page Name</TableHead>
                <TableHead>URL</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Total Views</TableHead>
                <TableHead className="text-right">This Week</TableHead>
                <TableHead className="text-right">Today</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 8 }).map((__, j) => (
                      <TableCell key={j}><Skeleton className="h-5 w-full" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : pages.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                    No landing pages yet. Add one to start tracking analytics.
                  </TableCell>
                </TableRow>
              ) : (
                pages.map((page) => (
                  <TableRow key={page.id}>
                    <TableCell>
                      <button
                        onClick={() => openDetail(page)}
                        className="text-sm font-medium hover:text-primary hover:underline underline-offset-2 text-left"
                        aria-label={`View details for ${page.name}`}
                      >
                        {page.name}
                      </button>
                    </TableCell>
                    <TableCell>
                      <a
                        href={page.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                        aria-label={`Open ${page.url} in new tab`}
                      >
                        {truncateUrl(page.url)}
                        <ExternalLink className="h-3 w-3 flex-shrink-0" />
                      </a>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={page.isActive
                          ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-transparent"
                          : "bg-muted text-muted-foreground border-transparent"}
                      >
                        {page.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium">{page.totalViews.toLocaleString()}</TableCell>
                    <TableCell className="text-right text-muted-foreground">{page.weekViews}</TableCell>
                    <TableCell className="text-right text-muted-foreground">{page.todayViews}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{fmtDate(page.createdAt)}</TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => openEdit(page)}
                          aria-label={`Edit ${page.name}`}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Switch
                          checked={page.isActive}
                          onCheckedChange={() => handleToggleActive(page)}
                          aria-label={`Toggle active status for ${page.name}`}
                          className="scale-75"
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={() => setDeleteId(page.id)}
                          aria-label={`Delete ${page.name}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </ScrollArea>

      {/* Sheet — create / edit / detail */}
      <Sheet open={sheetMode !== null} onOpenChange={(o) => { if (!o) closeSheet(); }}>
        <SheetContent side="right" className="flex flex-col p-0 gap-0 w-full sm:max-w-md">
          <SheetHeader className="shrink-0 px-4 pt-4 pb-3 border-b">
            <SheetTitle className="text-base">{sheetTitle}</SheetTitle>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-4 py-4">
            {sheetMode === "detail" && selectedPage ? (
              <PageDetailContent pageId={selectedPage.id} />
            ) : (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="lp-name">Name</Label>
                  <Input
                    id="lp-name"
                    placeholder="My Pricing Page"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="lp-url">URL</Label>
                  <Input
                    id="lp-url"
                    type="url"
                    placeholder="https://example.com/pricing"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="lp-desc">Description</Label>
                  <Textarea
                    id="lp-desc"
                    placeholder="Optional description…"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                  />
                </div>
              </div>
            )}
          </div>

          {sheetMode !== "detail" && (
            <SheetFooter className="shrink-0 px-4 py-3 border-t flex-row gap-2">
              <Button variant="outline" className="flex-1" onClick={closeSheet}>
                Cancel
              </Button>
              <Button
                className="flex-1"
                onClick={sheetMode === "edit" ? handleEdit : handleCreate}
                disabled={createPage.isPending || updatePage.isPending}
                aria-label={sheetMode === "edit" ? "Save changes" : "Create landing page"}
              >
                {sheetMode === "edit" ? "Save Changes" : "Create Landing Page"}
              </Button>
            </SheetFooter>
          )}
        </SheetContent>
      </Sheet>

      {/* Delete confirmation */}
      <AlertDialog open={deleteId !== null} onOpenChange={(o) => { if (!o) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Landing Page?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the landing page and all associated view data. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

        </TabsContent>
      </Tabs>
    </PageWrapper>
  );
}

// ─── CRM Hosted Pages Tab ─────────────────────────────────────────────────────

function CrmHostedPagesTab() {
  const { data: pages, isLoading } = useCrmPages();
  const updatePage = useUpdateCrmPage();
  const deletePage = useDeleteCrmPage();
  const [deleteCrmId, setDeleteCrmId] = useState<number | null>(null);

  const handleTogglePublish = useCallback(
    (page: CrmPage) => {
      updatePage.mutate(
        { id: page.id, isPublished: !page.isPublished },
        {
          onSuccess: () =>
            toast.success(page.isPublished ? "Page unpublished." : "Page published."),
          onError: (e) => toast.error(getErrorMessage(e)),
        },
      );
    },
    [updatePage],
  );

  const handleDeleteCrm = useCallback(() => {
    if (!deleteCrmId) return;
    deletePage.mutate(deleteCrmId, {
      onSuccess: () => { toast.success("Page archived."); setDeleteCrmId(null); },
      onError: (e) => { toast.error(getErrorMessage(e)); setDeleteCrmId(null); },
    });
  }, [deleteCrmId, deletePage]);

  const crmPages: CrmPage[] = pages ?? [];

  return (
    <>
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-lg" />
          ))}
        </div>
      ) : crmPages.length === 0 ? (
        <div className="rounded-xl border border-dashed py-16 text-center">
          <FileText className="mx-auto h-10 w-10 text-muted-foreground/40 mb-3" />
          <p className="text-sm font-medium text-muted-foreground">No hosted pages yet</p>
          <p className="text-xs text-muted-foreground mt-1 mb-4">
            Create a landing page hosted directly on your CRM.
          </p>
          <Button size="sm" asChild>
            <Link href="/marketing/landing-pages/new">
              <Plus className="mr-1.5 h-4 w-4" />
              Create First Page
            </Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {crmPages.map((page) => (
            <div
              key={page.id}
              className="flex items-center gap-4 rounded-lg border bg-card px-4 py-3"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium truncate">{page.title ?? page.name}</p>
                  {page.isPublished ? (
                    <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-transparent text-xs">
                      <CheckCircle2 className="mr-1 h-3 w-3" />
                      Live
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-xs text-muted-foreground">
                      <Clock className="mr-1 h-3 w-3" />
                      Draft
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  /{page.slug ?? "—"}
                  {page.description && (
                    <span className="ml-2 truncate">{page.description}</span>
                  )}
                </p>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                {page.isPublished && page.slug && (
                  <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
                    <a href={`/${page.slug}`} target="_blank" rel="noopener noreferrer" aria-label="View live">
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </Button>
                )}
                <Switch
                  checked={page.isPublished ?? false}
                  onCheckedChange={() => handleTogglePublish(page)}
                  aria-label={`Toggle publish for ${page.title}`}
                  className="scale-75"
                />
                <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
                  <Link href={`/marketing/landing-pages/${page.id}/edit`} aria-label="Edit page">
                    <Pencil className="h-3.5 w-3.5" />
                  </Link>
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-destructive hover:text-destructive"
                  onClick={() => setDeleteCrmId(page.id)}
                  aria-label="Delete page"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* CRM page delete dialog */}
      <AlertDialog open={deleteCrmId !== null} onOpenChange={(o) => { if (!o) setDeleteCrmId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive Page?</AlertDialogTitle>
            <AlertDialogDescription>
              This will unpublish and archive the page. It will no longer be publicly accessible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteCrm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Archive
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
