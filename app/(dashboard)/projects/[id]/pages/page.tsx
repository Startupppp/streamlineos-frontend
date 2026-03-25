"use client";

import { use, useState, useMemo } from "react";
import { trpc } from "@/trpc/client";
import { ProjectSubNav } from "@/components/projects/project-sub-nav";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyDocumentsIllustration } from "@/components/illustrations";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Plus,
  FileText,
  ChevronRight,
  ChevronDown,
  Pin,
  PinOff,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

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

  return (
    <div>
      <div
        className={`flex items-center gap-1 py-1.5 px-2 rounded-md cursor-pointer transition-colors group ${
          isActive ? "bg-primary/10 text-primary" : "hover:bg-muted"
        }`}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
        onClick={() => onSelect(page.id)}
      >
        {hasChildren ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setExpanded(!expanded);
            }}
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
          onClick={(e) => {
            e.stopPropagation();
            onTogglePin(page.id, !page.isPinned);
          }}
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

export default function PagesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const projectId = parseInt(id);
  const [createOpen, setCreateOpen] = useState(false);
  const [activePage, setActivePage] = useState<number | null>(null);
  const [editContent, setEditContent] = useState("");

  const utils = trpc.useUtils();
  const { data: pages, isLoading } = trpc.project.pagesGetByProject.useQuery({
    projectId,
  });

  const createMutation = trpc.project.pagesCreate.useMutation({
    onSuccess: () => {
      utils.project.pagesGetByProject.invalidate({ projectId });
      setCreateOpen(false);
      form.reset();
      toast.success("Page created");
    },
    onError: (err) => toast.error(err.message),
  });

  const updateMutation = trpc.project.pagesUpdate.useMutation({
    onSuccess: () => {
      utils.project.pagesGetByProject.invalidate({ projectId });
      toast.success("Page saved");
    },
    onError: (err) => toast.error(err.message),
  });

  const togglePinMutation = trpc.project.pagesUpdate.useMutation({
    onSuccess: () => {
      utils.project.pagesGetByProject.invalidate({ projectId });
    },
    onError: (err) => toast.error(err.message),
  });

  const form = useForm<CreatePageForm>({
    resolver: zodResolver(createPageSchema),
  });

  const onSubmit = (data: CreatePageForm) => {
    createMutation.mutate({ ...data, projectId });
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

  const handleSelectPage = (pageId: number) => {
    if (activePage !== null && editContent !== String(selectedPage?.content ?? "")) {
      updateMutation.mutate({
        id: activePage,
        content: editContent,
      });
    }
    setActivePage(pageId);
    const target = (pages ?? []).find((p) => p.id === pageId);
    setEditContent(typeof target?.content === "string" ? target.content : JSON.stringify(target?.content ?? ""));
  };

  const handleTogglePin = (pageId: number, pinned: boolean) => {
    togglePinMutation.mutate({ id: pageId, isPinned: pinned });
  };

  const handleSave = () => {
    if (activePage === null) return;
    updateMutation.mutate({
      id: activePage,
      content: editContent,
    });
  };

  if (isLoading) {
    return (
      <div className="h-full flex flex-col">
        <div className="flex-shrink-0 px-6 sm:px-8 md:px-12 pt-6 sm:pt-8 md:pt-12 pb-4 bg-background border-b">
          <Skeleton className="h-8 w-48 mb-4" />
          <Skeleton className="h-10 w-full" />
        </div>
        <div className="flex-1 flex">
          <div className="w-64 border-r p-4 space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </div>
          <div className="flex-1 p-6">
            <Skeleton className="h-full w-full" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex-shrink-0 px-6 sm:px-8 md:px-12 pt-6 sm:pt-8 md:pt-12 pb-4 bg-background border-b">
        <ProjectSubNav projectId={projectId} />
        <div className="flex items-center justify-between mt-4">
          <h1 className="text-2xl font-bold">Pages</h1>
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-1" /> New Page
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Page</DialogTitle>
              </DialogHeader>
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
                  className="w-full"
                >
                  {createMutation.isPending ? "Creating..." : "Create Page"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {!pages?.length ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center py-16">
            <EmptyDocumentsIllustration className="mx-auto mb-4 w-36 h-36" />
            <h3 className="text-lg font-semibold mb-1">No pages yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Create your first page to start documenting your project.
            </p>
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4 mr-1" /> Create First Page
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex overflow-hidden">
          <div className="w-64 border-r overflow-y-auto p-3 space-y-1">
            {pinnedPages.length > 0 && (
              <div className="mb-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-2 mb-1">
                  Pinned
                </p>
                {pinnedPages.map((page) => (
                  <div
                    key={`pin-${page.id}`}
                    onClick={() => handleSelectPage(page.id)}
                    className={`flex items-center gap-2 py-1.5 px-2 rounded-md cursor-pointer transition-colors ${
                      activePage === page.id
                        ? "bg-primary/10 text-primary"
                        : "hover:bg-muted"
                    }`}
                  >
                    <Pin className="h-3 w-3 text-muted-foreground shrink-0" />
                    <span className="text-base shrink-0">
                      {page.icon ?? "📄"}
                    </span>
                    <span className="text-sm truncate">{page.title}</span>
                  </div>
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
                  <h2 className="text-xl font-semibold flex items-center gap-2">
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
                  onChange={(e) => setEditContent(e.target.value)}
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
    </div>
  );
}
