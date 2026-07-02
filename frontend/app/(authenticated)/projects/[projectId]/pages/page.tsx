"use client";

import { use, useState, useMemo, useCallback, memo } from "react";
import { usePages, useCreatePage, useUpdatePage } from "@/hooks/api/projects";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { EmptyDocumentsIllustration } from "@/components/illustrations";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Plus,
  ChevronRight,
  ChevronDown,
  Pin,
  PinOff,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";

const createPageSchema = z.object({
  title: z.string().min(1, "Title is required"),
  icon: z.string().optional(),
});
type CreatePageForm = z.infer<typeof createPageSchema>;

interface ProjectPage {
  id: number;
  title: string;
  icon: string | null;
  content: unknown;
  parentPageId: number | null;
  isPinned: boolean;
  children?: ProjectPage[];
}

function buildTree(pages: ProjectPage[]): ProjectPage[] {
  const map = new Map<number, ProjectPage>();
  const roots: ProjectPage[] = [];

  for (const page of pages) {
    map.set(page.id, { ...page, children: [] });
  }

  for (const page of pages) {
    const node = map.get(page.id)!;
    if (page.parentPageId && map.has(page.parentPageId)) {
      map.get(page.parentPageId)!.children!.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
}

function PageTreeItem({
  page,
  depth,
  activePage,
  onSelect,
  onTogglePin,
}: {
  page: ProjectPage;
  depth: number;
  activePage: number | null;
  onSelect: (id: number) => void;
  onTogglePin: (id: number, pinned: boolean) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = (page.children?.length ?? 0) > 0;
  const isActive = activePage === page.id;

  const handleSelect = useCallback(() => onSelect(page.id), [onSelect, page.id]);

  const handleToggleExpand = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      setExpanded((v) => !v);
    },
    []
  );

  const handleTogglePin = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onTogglePin(page.id, !page.isPinned);
    },
    [onTogglePin, page.id, page.isPinned]
  );

  return (
    <div>
      <div
        className={`flex items-center gap-1 py-1.5 px-2 rounded-md cursor-pointer transition-colors group ${
          isActive ? "bg-violet-50 text-violet-700 font-medium" : "hover:bg-muted"
        }`}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
        onClick={handleSelect}
      >
        {hasChildren ? (
          <button
            onClick={handleToggleExpand}
            className="h-5 w-5 flex items-center justify-center shrink-0"
          >
            {expanded ? (
              <ChevronDown className="h-3.5 w-3.5" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5" />
            )}
          </button>
        ) : (
          <span className="w-5 shrink-0" />
        )}
        <span className="text-base shrink-0">{page.icon ?? "📄"}</span>
        <span className="text-sm truncate flex-1">{page.title}</span>
        <button
          onClick={handleTogglePin}
          className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
        >
          {page.isPinned ? (
            <PinOff className="h-3.5 w-3.5 text-muted-foreground" />
          ) : (
            <Pin className="h-3.5 w-3.5 text-muted-foreground" />
          )}
        </button>
      </div>
      {expanded &&
        hasChildren &&
        page.children!.map((child) => (
          <PageTreeItem
            key={child.id}
            page={child}
            depth={depth + 1}
            activePage={activePage}
            onSelect={onSelect}
            onTogglePin={onTogglePin}
          />
        ))}
    </div>
  );
}

interface PinnedPageItemProps {
  page: ProjectPage;
  activePage: number | null;
  onSelect: (id: number) => void;
}

const PinnedPageItem = memo(function PinnedPageItem({
  page,
  activePage,
  onSelect,
}: PinnedPageItemProps) {
  const handleClick = useCallback(() => onSelect(page.id), [onSelect, page.id]);

  return (
    <div
      onClick={handleClick}
      className={`flex items-center gap-2 py-1.5 px-2 rounded-md cursor-pointer transition-colors ${
        activePage === page.id
          ? "bg-violet-50 text-violet-700 font-medium"
          : "hover:bg-muted"
      }`}
    >
      <Pin className="h-3 w-3 text-muted-foreground shrink-0" />
      <span className="text-base shrink-0">{page.icon ?? "📄"}</span>
      <span className="text-sm truncate">{page.title}</span>
    </div>
  );
});

export default function PagesPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId: projectIdStr } = use(params);
  const projectId = parseInt(projectIdStr);
  const [createOpen, setCreateOpen] = useState(false);
  const [activePage, setActivePage] = useState<number | null>(null);
  const [editContent, setEditContent] = useState("");

  const { data: pages, isLoading } = usePages(projectId);

  const createMutation = useCreatePage();
  const updateMutation = useUpdatePage();
  const togglePinMutation = useUpdatePage();

  const form = useForm<CreatePageForm>({
    resolver: zodResolver(createPageSchema),
  });

  const onSubmit = (data: CreatePageForm) => {
    createMutation.mutate(
      { ...data, projectId },
      {
        onSuccess: () => {
          setCreateOpen(false);
          form.reset();
          toast.success("Page created");
        },
        onError: (err) => toast.error(getErrorMessage(err)),
      }
    );
  };

  const mappedPages: ProjectPage[] = useMemo(() => (pages ?? []).map((p) => ({
    id: p.id,
    title: p.title,
    icon: p.icon,
    content: p.content,
    parentPageId: p.parentPageId,
    isPinned: p.isPinned,
  })), [pages]);
  const tree = useMemo(() => buildTree(mappedPages), [mappedPages]);
  const pinnedPages = useMemo(
    () => mappedPages.filter((p) => p.isPinned),
    [mappedPages]
  );
  const selectedPage = useMemo(
    () => mappedPages.find((p) => p.id === activePage),
    [mappedPages, activePage]
  );

  const handleSelectPage = useCallback((pageId: number) => {
    setActivePage(pageId);
    const target = (pages ?? []).find((p) => p.id === pageId);
    setEditContent(typeof target?.content === "string" ? target.content : JSON.stringify(target?.content ?? ""));
  }, [pages]);

  const handleTogglePin = useCallback((pageId: number, pinned: boolean) => {
    togglePinMutation.mutate(
      { id: pageId, projectId, isPinned: pinned },
      { onError: (err) => toast.error(getErrorMessage(err)) }
    );
  }, [togglePinMutation, projectId]);

  const handleSave = useCallback(() => {
    if (activePage === null) return;
    updateMutation.mutate(
      { id: activePage, projectId, content: editContent },
      {
        onSuccess: () => toast.success("Page saved"),
        onError: (err) => toast.error(getErrorMessage(err)),
      }
    );
  }, [activePage, projectId, editContent, updateMutation]);

  const handleEditContentChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => setEditContent(e.target.value),
    []
  );

  const handleOpenCreatePage = useCallback(() => setCreateOpen(true), []);

  if (isLoading) {
    return (
      <PageWrapper title="Pages" noInternalScroll contentClassName="p-0">
        <div className="flex h-full">
          <div className="w-64 border-r p-4 space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </div>
          <div className="flex-1 p-6">
            <Skeleton className="h-64 w-full" />
          </div>
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title="Pages"
      actions={
        <Sheet open={createOpen} onOpenChange={setCreateOpen}>
          <SheetTrigger asChild>
            <Button size="sm" className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white shadow-sm">
              <Plus className="h-4 w-4 mr-1" /> New Page
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="sm:max-w-md p-0 flex flex-col gap-0">
            <SheetHeader className="shrink-0 px-6 py-4 border-b text-left gap-1">
              <SheetTitle>Create Page</SheetTitle>
            </SheetHeader>
            <div className="flex-1 overflow-y-auto px-6 py-5">
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="space-y-4"
            >
              <div>
                <Label htmlFor="page-title">Title</Label>
                <Input id="page-title" {...form.register("title")} />
                {form.formState.errors.title && (
                  <p className="text-xs text-destructive mt-1">
                    {form.formState.errors.title.message}
                  </p>
                )}
              </div>
              <div>
                <Label htmlFor="page-icon">Icon Emoji</Label>
                <Input
                  id="page-icon"
                  placeholder="📄"
                  maxLength={4}
                  {...form.register("icon")}
                />
              </div>
              <Button
                type="submit"
                disabled={createMutation.isPending}
                className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white shadow-sm"
              >
                {createMutation.isPending ? "Creating..." : "Create Page"}
              </Button>
            </form>
            </div>
          </SheetContent>
        </Sheet>
      }
      noInternalScroll
      contentClassName="p-0"
    >
      {!pages?.length ? (
        <div className="flex items-center justify-center flex-1 min-h-[300px]">
          <div className="text-center">
            <EmptyDocumentsIllustration className="mx-auto mb-4 w-36 h-36" />
            <h3 className="text-lg font-semibold mb-1">No pages yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Create your first page to start documenting your project.
            </p>
            <Button onClick={handleOpenCreatePage} className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white shadow-sm">
              <Plus className="h-4 w-4 mr-1" /> Create First Page
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex h-full overflow-hidden">
          <div className="w-64 border-r overflow-y-auto p-3 space-y-1 bg-muted/20">
            {pinnedPages.length > 0 && (
              <div className="mb-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-2 mb-1">
                  Pinned
                </p>
                {pinnedPages.map((page) => (
                  <PinnedPageItem
                    key={`pin-${page.id}`}
                    page={page}
                    activePage={activePage}
                    onSelect={handleSelectPage}
                  />
                ))}
                <div className="border-b my-2" />
              </div>
            )}
            {tree.map((page) => (
              <PageTreeItem
                key={page.id}
                page={page}
                depth={0}
                activePage={activePage}
                onSelect={handleSelectPage}
                onTogglePin={handleTogglePin}
              />
            ))}
          </div>

          <div className="flex-1 flex flex-col overflow-hidden">
            {selectedPage ? (
              <div className="flex-1 flex flex-col p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold flex items-center gap-2">
                    <span className="text-2xl">
                      {selectedPage.icon ?? "📄"}
                    </span>
                    {selectedPage.title}
                  </h2>
                  <Button
                    size="sm"
                    onClick={handleSave}
                    disabled={updateMutation.isPending}
                  >
                    {updateMutation.isPending ? "Saving..." : "Save"}
                  </Button>
                </div>
                <Textarea
                  className="flex-1 min-h-[400px] resize-none font-mono text-sm"
                  placeholder="Start writing..."
                  value={editContent}
                  onChange={handleEditContentChange}
                />
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center text-muted-foreground">
                  <EmptyDocumentsIllustration className="mx-auto mb-3 w-32 h-32" />
                  <p className="text-sm font-medium text-foreground">Select a page</p>
                  <p className="text-xs text-muted-foreground mt-1">Choose a page from the list to start editing</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </PageWrapper>
  );
}
