"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { format } from "date-fns";
import {
  Plus,
  Pencil,
  Trash2,
  ExternalLink,
  MessageSquare,
  Megaphone,
  ArrowBigUp,
  Sparkles,
} from "lucide-react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { LoadingState } from "@/components/shared/loading-state";
import { ErrorState } from "@/components/shared/error-state";
import { EmptyState } from "@/components/ui/empty-state";
import {
  EmptyProjectsIllustration,
  EmptyMailIllustration,
  EmptyTicketIllustration,
} from "@/components/illustrations";
import { toast } from "sonner";
import {
  useRoadmapItems,
  useCreateRoadmapItem,
  useUpdateRoadmapItem,
  useDeleteRoadmapItem,
  useFeedbackPosts,
  useUpdateFeedbackPost,
  useDeleteFeedbackPost,
  useChangelog,
  useCreateChangelogEntry,
  useUpdateChangelogEntry,
  useDeleteChangelogEntry,
  type RoadmapItem,
  type RoadmapStatus,
  type FeedbackPost,
  type FeedbackStatus,
  type ChangelogEntry,
  type ChangelogType,
} from "@/hooks/api/projects/roadmap";

const ROADMAP_COLUMNS: { status: RoadmapStatus; label: string }[] = [
  { status: "planned", label: "Planned" },
  { status: "in_progress", label: "In Progress" },
  { status: "completed", label: "Completed" },
  { status: "cancelled", label: "Cancelled" },
];

const ROADMAP_STATUS_OPTIONS: { value: RoadmapStatus; label: string }[] = [
  { value: "planned", label: "Planned" },
  { value: "in_progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

const FEEDBACK_STATUS_OPTIONS: { value: FeedbackStatus; label: string }[] = [
  { value: "open", label: "Open" },
  { value: "planned", label: "Planned" },
  { value: "in_progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
  { value: "declined", label: "Declined" },
];

const CHANGELOG_TYPE_OPTIONS: { value: ChangelogType; label: string }[] = [
  { value: "feature", label: "Feature" },
  { value: "improvement", label: "Improvement" },
  { value: "fix", label: "Fix" },
];

const FEEDBACK_STATUS_VARIANT: Record<FeedbackStatus, "secondary" | "default" | "outline" | "destructive"> = {
  open: "secondary",
  planned: "outline",
  in_progress: "default",
  completed: "default",
  declined: "destructive",
};

const CHANGELOG_TYPE_VARIANT: Record<ChangelogType, "default" | "secondary" | "outline"> = {
  feature: "default",
  improvement: "secondary",
  fix: "outline",
};

function RoadmapItemSheet({
  item,
  onClose,
}: {
  item?: RoadmapItem;
  onClose: () => void;
}) {
  const isEdit = !!item;
  const [title, setTitle] = useState(item?.title ?? "");
  const [description, setDescription] = useState(item?.description ?? "");
  const [status, setStatus] = useState<RoadmapStatus>(item?.status ?? "planned");
  const [category, setCategory] = useState(item?.category ?? "");
  const [targetQuarter, setTargetQuarter] = useState(item?.targetQuarter ?? "");
  const [isPublic, setIsPublic] = useState(item?.isPublic ?? true);

  const create = useCreateRoadmapItem();
  const update = useUpdateRoadmapItem();
  const isPending = create.isPending || update.isPending;

  function handleTitleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setTitle(e.target.value);
  }
  function handleDescriptionChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setDescription(e.target.value);
  }
  function handleStatusChange(v: string) {
    setStatus(v as RoadmapStatus);
  }
  function handleTargetQuarterChange(e: React.ChangeEvent<HTMLInputElement>) {
    setTargetQuarter(e.target.value);
  }
  function handleCategoryChange(e: React.ChangeEvent<HTMLInputElement>) {
    setCategory(e.target.value);
  }

  function handleSave() {
    if (!title.trim()) return;
    const payload = {
      title: title.trim(),
      description: description.trim() || undefined,
      status,
      category: category.trim() || undefined,
      targetQuarter: targetQuarter.trim() || undefined,
      isPublic,
    };
    if (isEdit) {
      update.mutate(
        {
          id: item.id,
          title: payload.title,
          description: payload.description ?? null,
          status,
          category: payload.category ?? null,
          targetQuarter: payload.targetQuarter ?? null,
          isPublic,
        },
        {
          onSuccess: () => {
            toast.success("Roadmap item updated");
            onClose();
          },
          onError: () => toast.error("Failed to update item"),
        },
      );
    } else {
      create.mutate(payload, {
        onSuccess: () => {
          toast.success("Roadmap item created");
          onClose();
        },
        onError: () => toast.error("Failed to create item"),
      });
    }
  }

  return (
    <Sheet open onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{isEdit ? "Edit Roadmap Item" : "New Roadmap Item"}</SheetTitle>
        </SheetHeader>
        <div className="space-y-4 px-4 py-2">
          <div className="space-y-1">
            <Label>Title *</Label>
            <Input
              placeholder="e.g. Dark mode support"
              value={title}
              onChange={handleTitleChange}
            />
          </div>
          <div className="space-y-1">
            <Label>Description</Label>
            <Textarea
              rows={4}
              value={description}
              onChange={handleDescriptionChange}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Status</Label>
              <Select value={status} onValueChange={handleStatusChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROADMAP_STATUS_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Target Quarter</Label>
              <Input
                placeholder="e.g. Q3 2026"
                value={targetQuarter}
                onChange={handleTargetQuarterChange}
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Category</Label>
            <Input
              placeholder="e.g. Integrations"
              value={category}
              onChange={handleCategoryChange}
            />
          </div>
          <div className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2.5">
            <div>
              <p className="text-sm font-medium">Public</p>
              <p className="text-xs text-muted-foreground">Show this item on the public board</p>
            </div>
            <Switch checked={isPublic} onCheckedChange={setIsPublic} />
          </div>
        </div>
        <SheetFooter className="flex-row gap-2 border-t pt-4">
          <Button variant="outline" className="flex-1" onClick={onClose}>
            Cancel
          </Button>
          <Button className="flex-1" onClick={handleSave} disabled={isPending || !title.trim()}>
            {isPending ? "Saving…" : isEdit ? "Save Changes" : "Create Item"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

function RoadmapItemCard({
  item,
  onEdit,
  onDelete,
}: {
  item: RoadmapItem;
  onEdit: (item: RoadmapItem) => void;
  onDelete: (item: RoadmapItem) => void;
}) {
  function handleEdit() { onEdit(item); }
  function handleDelete() { onDelete(item); }

  return (
    <Card>
      <CardContent className="p-3 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-medium leading-snug min-w-0">{item.title}</p>
          <div className="flex items-center gap-1 shrink-0">
            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={handleEdit}>
              <Pencil className="h-3 w-3" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-6 w-6 text-destructive hover:text-destructive"
              onClick={handleDelete}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>
        {item.description && (
          <p className="text-xs text-muted-foreground line-clamp-2">{item.description}</p>
        )}
        <div className="flex flex-wrap items-center gap-1.5">
          {item.targetQuarter && (
            <Badge variant="outline" className="text-[10px]">{item.targetQuarter}</Badge>
          )}
          {item.category && (
            <Badge variant="secondary" className="text-[10px]">{item.category}</Badge>
          )}
          {!item.isPublic && (
            <Badge variant="outline" className="text-[10px]">Private</Badge>
          )}
          <span className="ml-auto inline-flex items-center gap-1 text-[11px] text-muted-foreground tabular-nums">
            <ArrowBigUp className="h-3.5 w-3.5" />
            {item.votes}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

function RoadmapTab({ search }: { search: string }) {
  const { data, isLoading, isError, refetch } = useRoadmapItems(
    search.trim() ? { search: search.trim() } : {},
  );
  const deleteItem = useDeleteRoadmapItem();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<RoadmapItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<RoadmapItem | null>(null);

  const grouped = useMemo(() => {
    const map: Record<RoadmapStatus, RoadmapItem[]> = {
      planned: [],
      in_progress: [],
      completed: [],
      cancelled: [],
    };
    for (const item of data ?? []) map[item.status].push(item);
    return map;
  }, [data]);

  function handleRetry() { refetch(); }
  function handleOpenSheet() { setSheetOpen(true); }
  function handleCloseSheet() { setSheetOpen(false); }
  function handleCloseEdit() { setEditTarget(null); }
  function handleClearDeleteTarget() { setDeleteTarget(null); }
  function handleDeleteDialogChange(open: boolean) { if (!open) setDeleteTarget(null); }
  function handleEditItem(item: RoadmapItem) { setEditTarget(item); }
  function handleDeleteItem(item: RoadmapItem) { setDeleteTarget(item); }

  function handleDelete() {
    if (!deleteTarget) return;
    deleteItem.mutate(deleteTarget.id, {
      onSuccess: () => {
        toast.success("Roadmap item deleted");
        handleClearDeleteTarget();
      },
      onError: () => toast.error("Failed to delete item"),
    });
  }

  if (isLoading) return <LoadingState variant="cards" rows={6} />;
  if (isError) return <ErrorState onRetry={handleRetry} />;

  const total = data?.length ?? 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{total} items</p>
        <Button size="sm" onClick={handleOpenSheet}>
          <Plus className="h-4 w-4 mr-1" /> New Item
        </Button>
      </div>

      {total === 0 ? (
        <EmptyState
          illustration={<EmptyProjectsIllustration />}
          title="No roadmap items yet"
          description="Plan what's coming and share it publicly with your users."
          action={{ label: "Add roadmap item", onClick: handleOpenSheet }}
          className="flex-1"
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {ROADMAP_COLUMNS.map((col) => (
            <div key={col.status} className="space-y-2">
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {col.label}
                </span>
                <span className="text-xs text-muted-foreground tabular-nums">
                  {grouped[col.status].length}
                </span>
              </div>
              <div className="space-y-2">
                {grouped[col.status].length === 0 ? (
                  <div className="rounded-lg border border-dashed border-border/60 py-6 text-center text-xs text-muted-foreground">
                    Empty
                  </div>
                ) : (
                  grouped[col.status].map((item) => (
                    <RoadmapItemCard
                      key={item.id}
                      item={item}
                      onEdit={handleEditItem}
                      onDelete={handleDeleteItem}
                    />
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {sheetOpen && <RoadmapItemSheet onClose={handleCloseSheet} />}
      {editTarget && (
        <RoadmapItemSheet item={editTarget} onClose={handleCloseEdit} />
      )}

      <AlertDialog open={!!deleteTarget} onOpenChange={handleDeleteDialogChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete roadmap item?</AlertDialogTitle>
            <AlertDialogDescription>
              &ldquo;{deleteTarget?.title}&rdquo; will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDelete}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function FeedbackRow({
  post,
  roadmapItems,
  onDelete,
}: {
  post: FeedbackPost;
  roadmapItems: RoadmapItem[];
  onDelete: (post: FeedbackPost) => void;
}) {
  const update = useUpdateFeedbackPost();

  function handleStatusChange(value: string) {
    update.mutate(
      { id: post.id, status: value as FeedbackStatus },
      {
        onSuccess: () => toast.success("Status updated"),
        onError: () => toast.error("Failed to update status"),
      },
    );
  }

  function handleLinkChange(value: string) {
    update.mutate(
      { id: post.id, linkedRoadmapItemId: value === "none" ? null : Number(value) },
      {
        onSuccess: () => toast.success("Linked roadmap item updated"),
        onError: () => toast.error("Failed to link item"),
      },
    );
  }

  function handleDeleteClick() { onDelete(post); }

  return (
    <Card>
      <CardContent className="p-3">
        <div className="flex items-start gap-3">
          <div className="flex flex-col items-center justify-center rounded-md border border-border/60 px-2 py-1 shrink-0">
            <ArrowBigUp className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-semibold tabular-nums">{post.votes}</span>
          </div>
          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-medium leading-snug">{post.title}</p>
                {post.description && (
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                    {post.description}
                  </p>
                )}
                {post.submittedByName && (
                  <p className="text-[11px] text-muted-foreground mt-1">
                    by {post.submittedByName}
                  </p>
                )}
              </div>
              <Button
                size="icon"
                variant="ghost"
                className="h-6 w-6 text-destructive hover:text-destructive shrink-0"
                onClick={handleDeleteClick}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Select value={post.status} onValueChange={handleStatusChange}>
                <SelectTrigger className="h-7 w-36 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FEEDBACK_STATUS_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={post.linkedRoadmapItemId ? String(post.linkedRoadmapItemId) : "none"}
                onValueChange={handleLinkChange}
              >
                <SelectTrigger className="h-7 w-48 text-xs">
                  <SelectValue placeholder="Link roadmap item" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No roadmap link</SelectItem>
                  {roadmapItems.map((item) => (
                    <SelectItem key={item.id} value={String(item.id)}>
                      {item.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Badge variant={FEEDBACK_STATUS_VARIANT[post.status]} className="text-[10px]">
                {FEEDBACK_STATUS_OPTIONS.find((o) => o.value === post.status)?.label}
              </Badge>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function FeedbackTab({ search }: { search: string }) {
  const { data, isLoading, isError, refetch } = useFeedbackPosts(
    search.trim() ? { search: search.trim() } : {},
  );
  const { data: roadmapData } = useRoadmapItems();
  const deletePost = useDeleteFeedbackPost();
  const [deleteTarget, setDeleteTarget] = useState<FeedbackPost | null>(null);

  function handleRetry() { refetch(); }
  function handleDeleteDialogChange(open: boolean) { if (!open) setDeleteTarget(null); }
  function handleSetDeleteTarget(post: FeedbackPost) { setDeleteTarget(post); }

  function handleDelete() {
    if (!deleteTarget) return;
    deletePost.mutate(deleteTarget.id, {
      onSuccess: () => {
        toast.success("Feedback deleted");
        setDeleteTarget(null);
      },
      onError: () => toast.error("Failed to delete feedback"),
    });
  }

  if (isLoading) return <LoadingState variant="list" rows={6} />;
  if (isError) return <ErrorState onRetry={handleRetry} />;

  if (!data || data.length === 0) {
    return (
      <EmptyState
        illustration={<EmptyMailIllustration />}
        title="No feedback yet"
        description="Feedback submitted from your public board will appear here, sorted by votes."
        className="flex-1"
      />
    );
  }

  return (
    <div className="space-y-3">
      {data.map((post) => (
        <FeedbackRow
          key={post.id}
          post={post}
          roadmapItems={roadmapData ?? []}
          onDelete={handleSetDeleteTarget}
        />
      ))}

      <AlertDialog open={!!deleteTarget} onOpenChange={handleDeleteDialogChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete feedback?</AlertDialogTitle>
            <AlertDialogDescription>
              &ldquo;{deleteTarget?.title}&rdquo; will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDelete}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function ChangelogSheet({
  entry,
  onClose,
}: {
  entry?: ChangelogEntry;
  onClose: () => void;
}) {
  const isEdit = !!entry;
  const [title, setTitle] = useState(entry?.title ?? "");
  const [content, setContent] = useState(entry?.content ?? "");
  const [version, setVersion] = useState(entry?.version ?? "");
  const [type, setType] = useState<ChangelogType>(entry?.type ?? "feature");
  const [isPublished, setIsPublished] = useState(entry?.isPublished ?? false);

  const create = useCreateChangelogEntry();
  const update = useUpdateChangelogEntry();
  const isPending = create.isPending || update.isPending;

  function handleTitleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setTitle(e.target.value);
  }
  function handleContentChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setContent(e.target.value);
  }
  function handleTypeChange(v: string) {
    setType(v as ChangelogType);
  }
  function handleVersionChange(e: React.ChangeEvent<HTMLInputElement>) {
    setVersion(e.target.value);
  }

  function handleSave() {
    if (!title.trim()) return;
    if (isEdit) {
      update.mutate(
        {
          id: entry.id,
          title: title.trim(),
          content: content.trim(),
          version: version.trim() || null,
          type,
          isPublished,
        },
        {
          onSuccess: () => {
            toast.success("Changelog entry updated");
            onClose();
          },
          onError: () => toast.error("Failed to update entry"),
        },
      );
    } else {
      create.mutate(
        {
          title: title.trim(),
          content: content.trim(),
          version: version.trim() || undefined,
          type,
          isPublished,
        },
        {
          onSuccess: () => {
            toast.success("Changelog entry created");
            onClose();
          },
          onError: () => toast.error("Failed to create entry"),
        },
      );
    }
  }

  return (
    <Sheet open onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{isEdit ? "Edit Changelog Entry" : "New Changelog Entry"}</SheetTitle>
        </SheetHeader>
        <div className="space-y-4 px-4 py-2">
          <div className="space-y-1">
            <Label>Title *</Label>
            <Input
              placeholder="e.g. Introducing the public roadmap"
              value={title}
              onChange={handleTitleChange}
            />
          </div>
          <div className="space-y-1">
            <Label>Content</Label>
            <Textarea
              rows={6}
              value={content}
              onChange={handleContentChange}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Type</Label>
              <Select value={type} onValueChange={handleTypeChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CHANGELOG_TYPE_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Version</Label>
              <Input
                placeholder="e.g. v1.4.0"
                value={version}
                onChange={handleVersionChange}
              />
            </div>
          </div>
          <div className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2.5">
            <div>
              <p className="text-sm font-medium">Published</p>
              <p className="text-xs text-muted-foreground">Show this entry on the public changelog</p>
            </div>
            <Switch checked={isPublished} onCheckedChange={setIsPublished} />
          </div>
        </div>
        <SheetFooter className="flex-row gap-2 border-t pt-4">
          <Button variant="outline" className="flex-1" onClick={onClose}>
            Cancel
          </Button>
          <Button className="flex-1" onClick={handleSave} disabled={isPending || !title.trim()}>
            {isPending ? "Saving…" : isEdit ? "Save Changes" : "Create Entry"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

interface ChangelogEntryCardProps {
  entry: ChangelogEntry;
  isUpdating: boolean;
  onTogglePublish: (entry: ChangelogEntry) => void;
  onEdit: (entry: ChangelogEntry) => void;
  onDelete: (entry: ChangelogEntry) => void;
}

function ChangelogEntryCard({
  entry,
  isUpdating,
  onTogglePublish,
  onEdit,
  onDelete,
}: ChangelogEntryCardProps) {
  function handleTogglePublish() { onTogglePublish(entry); }
  function handleEdit() { onEdit(entry); }
  function handleDelete() { onDelete(entry); }

  return (
    <Card>
      <CardContent className="p-3 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-medium">{entry.title}</p>
              <Badge variant={CHANGELOG_TYPE_VARIANT[entry.type]} className="text-[10px]">
                {CHANGELOG_TYPE_OPTIONS.find((o) => o.value === entry.type)?.label}
              </Badge>
              {entry.version && (
                <Badge variant="outline" className="text-[10px]">{entry.version}</Badge>
              )}
              <Badge
                variant={entry.isPublished ? "default" : "outline"}
                className="text-[10px]"
              >
                {entry.isPublished ? "Published" : "Draft"}
              </Badge>
            </div>
            {entry.content && (
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2 whitespace-pre-wrap">
                {entry.content}
              </p>
            )}
            <p className="text-[11px] text-muted-foreground mt-1">
              {entry.publishedAt
                ? `Published ${format(new Date(entry.publishedAt), "MMM d, yyyy")}`
                : `Created ${format(new Date(entry.createdAt), "MMM d, yyyy")}`}
            </p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs"
              onClick={handleTogglePublish}
              disabled={isUpdating}
            >
              {entry.isPublished ? "Unpublish" : "Publish"}
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7"
              onClick={handleEdit}
            >
              <Pencil className="h-3 w-3" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7 text-destructive hover:text-destructive"
              onClick={handleDelete}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ChangelogTab() {
  const { data, isLoading, isError, refetch } = useChangelog();
  const update = useUpdateChangelogEntry();
  const deleteEntry = useDeleteChangelogEntry();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<ChangelogEntry | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ChangelogEntry | null>(null);

  function handleRetry() { refetch(); }
  function handleOpenSheet() { setSheetOpen(true); }
  function handleCloseSheet() { setSheetOpen(false); }
  function handleCloseEdit() { setEditTarget(null); }
  function handleDeleteDialogChange(open: boolean) { if (!open) setDeleteTarget(null); }
  function handleEditEntry(entry: ChangelogEntry) { setEditTarget(entry); }
  function handleDeleteEntry(entry: ChangelogEntry) { setDeleteTarget(entry); }

  function handleTogglePublish(entry: ChangelogEntry) {
    update.mutate(
      { id: entry.id, isPublished: !entry.isPublished },
      {
        onSuccess: () =>
          toast.success(entry.isPublished ? "Entry unpublished" : "Entry published"),
        onError: () => toast.error("Failed to update entry"),
      },
    );
  }

  function handleDelete() {
    if (!deleteTarget) return;
    deleteEntry.mutate(deleteTarget.id, {
      onSuccess: () => {
        toast.success("Changelog entry deleted");
        setDeleteTarget(null);
      },
      onError: () => toast.error("Failed to delete entry"),
    });
  }

  if (isLoading) return <LoadingState variant="list" rows={5} />;
  if (isError) return <ErrorState onRetry={handleRetry} />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{data?.length ?? 0} entries</p>
        <Button size="sm" onClick={handleOpenSheet}>
          <Plus className="h-4 w-4 mr-1" /> New Entry
        </Button>
      </div>

      {!data || data.length === 0 ? (
        <EmptyState
          illustration={<EmptyTicketIllustration />}
          title="No changelog entries yet"
          description="Announce shipped features, improvements and fixes to your users."
          action={{ label: "Add entry", onClick: handleOpenSheet }}
          className="flex-1"
        />
      ) : (
        <div className="space-y-3">
          {data.map((entry) => (
            <ChangelogEntryCard
              key={entry.id}
              entry={entry}
              isUpdating={update.isPending}
              onTogglePublish={handleTogglePublish}
              onEdit={handleEditEntry}
              onDelete={handleDeleteEntry}
            />
          ))}
        </div>
      )}

      {sheetOpen && <ChangelogSheet onClose={handleCloseSheet} />}
      {editTarget && <ChangelogSheet entry={editTarget} onClose={handleCloseEdit} />}

      <AlertDialog open={!!deleteTarget} onOpenChange={handleDeleteDialogChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete changelog entry?</AlertDialogTitle>
            <AlertDialogDescription>
              &ldquo;{deleteTarget?.title}&rdquo; will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDelete}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default function RoadmapPage() {
  const { data: session } = useSession();
  const orgId = session?.orgId ?? null;
  const [search, setSearch] = useState("");

  function handleSearchChange(e: React.ChangeEvent<HTMLInputElement>) {
    setSearch(e.target.value);
  }

  return (
    <PageWrapper
      title="Roadmap"
      subtitle="Plan publicly, collect feedback and ship a changelog"
      actions={
        orgId ? (
          <Button asChild variant="outline" size="sm">
            <Link href={`/roadmap/${orgId}`} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4 mr-1" /> Public board
            </Link>
          </Button>
        ) : undefined
      }
    >
      <Tabs defaultValue="roadmap" className="gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <TabsList>
            <TabsTrigger value="roadmap">
              <Sparkles className="h-4 w-4" /> Roadmap
            </TabsTrigger>
            <TabsTrigger value="feedback">
              <MessageSquare className="h-4 w-4" /> Feedback
            </TabsTrigger>
            <TabsTrigger value="changelog">
              <Megaphone className="h-4 w-4" /> Changelog
            </TabsTrigger>
          </TabsList>
          <Input
            placeholder="Search…"
            value={search}
            onChange={handleSearchChange}
            className="sm:max-w-xs"
          />
        </div>

        <TabsContent value="roadmap">
          <RoadmapTab search={search} />
        </TabsContent>
        <TabsContent value="feedback">
          <FeedbackTab search={search} />
        </TabsContent>
        <TabsContent value="changelog">
          <ChangelogTab />
        </TabsContent>
      </Tabs>
    </PageWrapper>
  );
}
