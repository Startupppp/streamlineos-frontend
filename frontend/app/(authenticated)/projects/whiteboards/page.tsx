"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useCallback } from "react";
import { formatDistanceToNow } from "date-fns";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { RequireModule } from "@/components/auth/require-module";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/shared/error-state";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyUploadIllustration } from "@/components/illustrations";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Briefcase, Globe, Lock, PenTool, Plus } from "lucide-react";
import {
  useAllWhiteboards,
  useCreateWhiteboardInProject,
  useProjects,
  type WhiteboardHubItem,
} from "@/hooks/api/projects";
import { useCan } from "@/hooks/api/access";
import { toast } from "sonner";

function VisibilityIcon({ visibility }: { visibility: WhiteboardHubItem["visibility"] }) {
  if (visibility === "private") {
    return <Lock className="h-3 w-3 shrink-0 text-muted-foreground" aria-label="Private" />;
  }
  if (visibility === "public") {
    return <Globe className="h-3 w-3 shrink-0 text-muted-foreground" aria-label="Public link" />;
  }
  return null;
}

function BoardCard({ board }: { board: WhiteboardHubItem }) {
  const updatedLabel = board.updatedAt
    ? formatDistanceToNow(new Date(board.updatedAt), { addSuffix: true })
    : null;

  return (
    <Link
      href={`/projects/${board.projectId}/whiteboard?board=${board.id}`}
      className="group flex flex-col gap-2 rounded-xl border border-border bg-card p-3 shadow-sm transition-all hover:border-accent hover:shadow-md active:scale-[0.98]"
    >
      <div className="flex items-center gap-2 min-w-0">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground group-hover:bg-accent/10 group-hover:text-accent transition-colors">
          <PenTool className="h-3.5 w-3.5" />
        </span>
        <p className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">{board.name}</p>
        <VisibilityIcon visibility={board.visibility} />
      </div>
      <div className="flex items-center gap-1.5 min-w-0 text-xs text-muted-foreground">
        <Briefcase className="h-3 w-3 shrink-0" />
        <span className="truncate">{board.projectName}</span>
      </div>
      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
        <span>
          {board.elementCount} {board.elementCount === 1 ? "item" : "items"}
        </span>
        {updatedLabel !== null && <span className="truncate">{updatedLabel}</span>}
      </div>
    </Link>
  );
}

function BoardGridSkeleton() {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: 8 }, (_, idx) => (
        <div key={idx} className="flex flex-col gap-2 rounded-xl border border-border bg-card p-3 shadow-sm">
          <div className="flex items-center gap-2">
            <Skeleton className="h-7 w-7 rounded-md" />
            <Skeleton className="h-4 flex-1" />
          </div>
          <Skeleton className="h-3 w-2/3" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      ))}
    </div>
  );
}

interface CreateBoardHubDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (projectId: number, boardId: number) => void;
}

function CreateBoardHubDialog({ open, onOpenChange, onSuccess }: CreateBoardHubDialogProps) {
  const [projectId, setProjectId] = useState<string>("");
  const [name, setName] = useState("");
  const { data: projectsData } = useProjects(undefined, { enabled: open });
  const create = useCreateWhiteboardInProject();

  const projects = projectsData?.data ?? [];
  const isValid = projectId !== "" && name.trim() !== "";

  function handleOpenChange(next: boolean) {
    if (!next) {
      setProjectId("");
      setName("");
    }
    onOpenChange(next);
  }

  function handleSubmit() {
    if (!isValid || create.isPending) return;
    create.mutate(
      { projectId: Number(projectId), name: name.trim() },
      {
        onSuccess: (board) => {
          toast.success("Board created");
          handleOpenChange(false);
          onSuccess(Number(projectId), board.id);
        },
        onError: () => toast.error("Failed to create board"),
      },
    );
  }

  function handleNameChange(e: React.ChangeEvent<HTMLInputElement>) {
    setName(e.target.value);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") handleSubmit();
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>New Board</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-1">
          <div className="space-y-1.5">
            <Label>Project</Label>
            <Select value={projectId} onValueChange={setProjectId}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Select a project" />
              </SelectTrigger>
              <SelectContent>
                {projects.map((p) => (
                  <SelectItem key={p.id} value={String(p.id)}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Board name</Label>
            <Input
              autoFocus
              placeholder="e.g. Sprint brainstorm"
              value={name}
              onChange={handleNameChange}
              onKeyDown={handleKeyDown}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!isValid || create.isPending}>
            {create.isPending ? "Creating…" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function WhiteboardsHubPage() {
  const router = useRouter();
  const canManage = useCan("projects:whiteboards:manage");
  const { data: boards, isLoading, isError, refetch } = useAllWhiteboards();
  const [createOpen, setCreateOpen] = useState(false);

  const handleRetry = useCallback(() => refetch(), [refetch]);
  const handleOpenCreate = useCallback(() => setCreateOpen(true), []);
  const handleCreateSuccess = useCallback(
    (projectId: number, boardId: number) => {
      router.push(`/projects/${projectId}/whiteboard?board=${boardId}`);
    },
    [router],
  );

  return (
    <RequireModule module="PROJECTS">
      <PageWrapper
        title="Whiteboards"
        eyebrow="Projects"
        subtitle="Every board you can access across your projects"
        actions={
          canManage ? (
            <Button size="sm" onClick={handleOpenCreate}>
              <Plus className="h-4 w-4 mr-1" /> New board
            </Button>
          ) : undefined
        }
      >
        {isLoading ? (
          <BoardGridSkeleton />
        ) : isError ? (
          <ErrorState onRetry={handleRetry} className="flex-1" />
        ) : !boards || boards.length === 0 ? (
          <EmptyState
            illustration={<EmptyUploadIllustration />}
            title="No whiteboards yet"
            description="Boards live inside projects. Open a project and create one from its Whiteboard tab."
            action={
              canManage
                ? { label: "New board", onClick: handleOpenCreate }
                : { label: "Go to projects", href: "/projects/all" }
            }
            className="flex-1"
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {boards.map((board) => (
              <BoardCard key={board.id} board={board} />
            ))}
          </div>
        )}

        {canManage && (
          <CreateBoardHubDialog
            open={createOpen}
            onOpenChange={setCreateOpen}
            onSuccess={handleCreateSuccess}
          />
        )}
      </PageWrapper>
    </RequireModule>
  );
}
