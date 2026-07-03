"use client";

import { use, useState, useCallback, memo } from "react";
import {
  useViews,
  useCreateView,
  useUpdateView,
  useDeleteView,
} from "@/hooks/api/projects";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptySearchIllustration } from "@/components/illustrations";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Plus,
  LayoutGrid,
  List,
  Kanban,
  Calendar,
  GitBranch,
  Pin,
  PinOff,
  ArrowRight,
  Trash2,
} from "lucide-react";
import { useForm, Controller } from "react-hook-form";
import { getErrorMessage } from "@/lib/get-error-message";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

const LAYOUT_TYPES = ["board", "list", "table", "calendar", "gantt"] as const;

const createViewSchema = z.object({
  name: z.string().min(1, "Name is required"),
  layoutType: z.enum(LAYOUT_TYPES).optional(),
});
type CreateViewForm = z.infer<typeof createViewSchema>;

const LAYOUT_META: Record<string, { icon: React.ReactNode; label: string; color: string }> = {
  board: { icon: <Kanban className="h-4 w-4" />, label: "Board", color: "text-slate-600 bg-slate-100" },
  list: { icon: <List className="h-4 w-4" />, label: "List", color: "text-blue-600 bg-blue-50" },
  table: { icon: <LayoutGrid className="h-4 w-4" />, label: "Table", color: "text-emerald-600 bg-emerald-50" },
  calendar: { icon: <Calendar className="h-4 w-4" />, label: "Calendar", color: "text-amber-600 bg-amber-50" },
  gantt: { icon: <GitBranch className="h-4 w-4" />, label: "Gantt", color: "text-rose-600 bg-rose-50" },
};

interface ViewItem {
  id: number;
  name: string;
  layoutType: string;
  isPinned: boolean;
  filters?: Record<string, unknown> | null;
}

interface ViewCardProps {
  view: ViewItem;
  isPinned: boolean;
  onNavigate: (view: ViewItem) => void;
  onTogglePin: (viewId: number, isPinned: boolean) => void;
  onDelete: (viewId: number) => void;
}

const ViewCard = memo(function ViewCard({
  view,
  isPinned,
  onNavigate,
  onTogglePin,
  onDelete,
}: ViewCardProps) {
  const handleNavigate = useCallback(() => onNavigate(view), [onNavigate, view]);
  const handleStopPropagation = useCallback((e: React.MouseEvent) => e.stopPropagation(), []);
  const handleTogglePin = useCallback(
    () => onTogglePin(view.id, !isPinned),
    [onTogglePin, view.id, isPinned]
  );
  const handleDelete = useCallback(() => onDelete(view.id), [onDelete, view.id]);

  const filterCount = view.filters ? Object.keys(view.filters).length : 0;
  const meta = LAYOUT_META[view.layoutType] ?? LAYOUT_META["board"];

  return (
    <div
      className="bg-card border border-border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer mb-1.5 flex items-center justify-between gap-3"
      onClick={handleNavigate}
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className={cn("shrink-0 h-8 w-8 rounded-md flex items-center justify-center", meta?.color ?? "text-slate-600 bg-slate-100")}>
          {meta?.icon}
        </div>
        <div className="min-w-0">
          <p className="font-medium text-sm truncate">{view.name}</p>
          <p className="text-xs text-muted-foreground">
            {meta?.label ?? view.layoutType}
            {filterCount > 0 && ` · ${filterCount} filter${filterCount > 1 ? "s" : ""}`}
          </p>
        </div>
        {isPinned && (
          <Badge variant="outline" className="text-[10px] shrink-0 bg-amber-50 text-amber-700 border-amber-200">Pinned</Badge>
        )}
      </div>
      <div
        className="flex items-center gap-1 shrink-0"
        onClick={handleStopPropagation}
      >
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0"
          onClick={handleTogglePin}
        >
          {isPinned ? (
            <PinOff className="h-3.5 w-3.5" />
          ) : (
            <Pin className="h-3.5 w-3.5" />
          )}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0 text-destructive hover:text-destructive"
          onClick={handleDelete}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
        <ArrowRight className="h-4 w-4 text-muted-foreground ml-1" />
      </div>
    </div>
  );
});

export default function ViewsPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId: projectIdStr } = use(params);
  const projectId = parseInt(projectIdStr);
  const [createOpen, setCreateOpen] = useState(false);
  const router = useRouter();

  const { data: views, isLoading } = useViews(projectId);
  const createMutation = useCreateView();
  const togglePinMutation = useUpdateView();
  const deleteMutation = useDeleteView();

  const form = useForm<CreateViewForm>({
    resolver: zodResolver(createViewSchema),
    defaultValues: { layoutType: "board" },
  });

  const onSubmit = useCallback(
    (data: CreateViewForm) => {
      createMutation.mutate(
        { ...data, projectId },
        {
          onSuccess: () => {
            setCreateOpen(false);
            form.reset();
            toast.success("View created");
          },
          onError: (err) => toast.error(getErrorMessage(err)),
        }
      );
    },
    [createMutation, projectId, form]
  );

  const handleNavigateToView = useCallback(
    (view: { id: number; layoutType: string }) => {
      const urlParams = new URLSearchParams();
      urlParams.set("viewId", view.id.toString());
      urlParams.set("view", view.layoutType);
      router.push(`/projects/${projectId}?${urlParams.toString()}`);
    },
    [router, projectId]
  );

  const handleTogglePin = useCallback(
    (viewId: number, isPinned: boolean) => {
      togglePinMutation.mutate(
        { id: viewId, projectId, isPinned },
        {
          onError: (err) => toast.error(getErrorMessage(err)),
        }
      );
    },
    [togglePinMutation, projectId]
  );

  const handleDelete = useCallback(
    (viewId: number) => {
      deleteMutation.mutate(
        { id: viewId, projectId },
        {
          onSuccess: () => toast.success("View deleted"),
          onError: (err) => toast.error(getErrorMessage(err)),
        }
      );
    },
    [deleteMutation, projectId]
  );

  const handleOpenCreate = useCallback(() => setCreateOpen(true), []);

  const pinnedViews = (views ?? []).filter((v) => v.isPinned);
  const unpinnedViews = (views ?? []).filter((v) => !v.isPinned);

  if (isLoading) {
    return (
      <PageWrapper title="Views" backHref={`/projects/${projectIdStr}`}>
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full rounded-lg" />
          ))}
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title="Views"
      backHref={`/projects/${projectIdStr}`}
      actions={
        <Sheet open={createOpen} onOpenChange={setCreateOpen}>
          <SheetTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-1" /> New View
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="sm:max-w-md p-0 flex flex-col gap-0">
            <SheetHeader className="shrink-0 px-6 py-4 border-b text-left gap-1">
              <SheetTitle>Create View</SheetTitle>
            </SheetHeader>
            <div className="flex-1 overflow-y-auto px-6 py-5">
              <form id="view-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                <div>
                  <Label htmlFor="view-name">Name</Label>
                  <Input id="view-name" className="mt-1.5" {...form.register("name")} />
                  {form.formState.errors.name && (
                    <p className="text-xs text-destructive mt-1">
                      {form.formState.errors.name.message}
                    </p>
                  )}
                </div>
                <div>
                  <Label>Layout</Label>
                  <Controller
                    control={form.control}
                    name="layoutType"
                    render={({ field }) => (
                      <div className="grid grid-cols-3 gap-2 mt-1.5">
                        {LAYOUT_TYPES.map((l) => {
                          const m = LAYOUT_META[l];
                          const isSelected = field.value === l;
                          return (
                            <button
                              key={l}
                              type="button"
                              onClick={() => field.onChange(l)}
                              className={cn(
                                "flex flex-col items-center gap-1.5 rounded-lg border p-3 text-xs font-medium transition-all",
                                isSelected
                                  ? "border-primary bg-primary/5 text-foreground"
                                  : "border-border bg-muted/40 text-muted-foreground hover:border-border hover:bg-muted"
                              )}
                            >
                              {m?.icon}
                              {m?.label}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Filters can be applied from the board view after creation.
                </p>
              </form>
            </div>
            <div className="shrink-0 px-6 py-4 border-t">
              <Button
                type="submit"
                form="view-form"
                disabled={createMutation.isPending}
                className="w-full"
              >
                {createMutation.isPending ? "Creating..." : "Create View"}
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      }
    >
      <div className="space-y-6">
        {!views?.length ? (
          <EmptyState
            illustration={<EmptySearchIllustration />}
            title="No saved views"
            description="Create custom views with saved filters and layouts."
            action={{ label: "Create First View", onClick: handleOpenCreate }}
            className="min-h-[40vh]"
          />
        ) : (
          <>
            {pinnedViews.length > 0 && (
              <section>
                <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-0.5">
                  Pinned
                </h2>
                <div>
                  {pinnedViews.map((view) => (
                    <ViewCard
                      key={view.id}
                      view={view}
                      isPinned
                      onNavigate={handleNavigateToView}
                      onTogglePin={handleTogglePin}
                      onDelete={handleDelete}
                    />
                  ))}
                </div>
              </section>
            )}

            {unpinnedViews.length > 0 && (
              <section>
                {pinnedViews.length > 0 && (
                  <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-0.5">
                    All Views
                  </h2>
                )}
                <div>
                  {unpinnedViews.map((view) => (
                    <ViewCard
                      key={view.id}
                      view={view}
                      isPinned={false}
                      onNavigate={handleNavigateToView}
                      onTogglePin={handleTogglePin}
                      onDelete={handleDelete}
                    />
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </PageWrapper>
  );
}
