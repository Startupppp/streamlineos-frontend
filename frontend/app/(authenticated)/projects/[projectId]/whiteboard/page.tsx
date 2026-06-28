"use client";

import {
  use,
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
import { EmptyUploadIllustration } from "@/components/illustrations";
import { cn } from "@/lib/utils";
import {
  Plus,
  Trash2,
  StickyNote,
  Square,
  Circle,
  Type,
  Save,
} from "lucide-react";
import {
  useWhiteboards,
  useWhiteboard,
  useCreateWhiteboard,
  useUpdateWhiteboard,
  useDeleteWhiteboard,
  type WhiteboardElement,
  type WhiteboardSummary,
} from "@/lib/api/hooks/projects";
import { toast } from "sonner";

type ElementType = WhiteboardElement["type"];

const PALETTE = [
  "#FDE68A",
  "#BFDBFE",
  "#BBF7D0",
  "#FBCFE8",
  "#DDD6FE",
  "#FECACA",
  "#E2E8F0",
] as const;

const TOOL_DEFS: { type: ElementType; label: string; icon: typeof StickyNote }[] = [
  { type: "note", label: "Note", icon: StickyNote },
  { type: "rect", label: "Rectangle", icon: Square },
  { type: "ellipse", label: "Ellipse", icon: Circle },
  { type: "text", label: "Text", icon: Type },
];

interface ToolButtonProps {
  tool: (typeof TOOL_DEFS)[number];
  onAdd: (type: ElementType) => void;
}

const ToolButton = memo(function ToolButton({ tool, onAdd }: ToolButtonProps) {
  const handleClick = useCallback(() => onAdd(tool.type), [onAdd, tool.type]);
  return (
    <Button size="sm" variant="outline" className="h-8" onClick={handleClick}>
      <tool.icon className="h-3.5 w-3.5 mr-1" />
      {tool.label}
    </Button>
  );
});

interface PaletteButtonProps {
  color: string;
  isActive: boolean;
  onSelect: (color: string) => void;
}

const PaletteButton = memo(function PaletteButton({ color, isActive, onSelect }: PaletteButtonProps) {
  const handleClick = useCallback(() => onSelect(color), [onSelect, color]);
  return (
    <button
      type="button"
      aria-label={`Color ${color}`}
      onClick={handleClick}
      className={cn(
        "h-6 w-6 rounded-md border transition",
        isActive ? "border-primary ring-2 ring-primary/30" : "border-border",
      )}
      style={{ backgroundColor: color }}
    />
  );
});

function nextElementId(elements: WhiteboardElement[]): string {
  let max = 0;
  for (const element of elements) {
    const numeric = Number(element.id.replace(/^el-/, ""));
    if (Number.isFinite(numeric) && numeric > max) max = numeric;
  }
  return `el-${max + 1}`;
}

function defaultElement(type: ElementType, id: string, color: string): WhiteboardElement {
  const base = { id, type, x: 80, y: 80, color };
  if (type === "note") return { ...base, w: 160, h: 120, text: "New note" };
  if (type === "text") return { ...base, w: 160, h: 40, text: "Text" };
  if (type === "ellipse") return { ...base, w: 140, h: 100, text: "" };
  return { ...base, w: 160, h: 100, text: "" };
}

function elementsEqual(a: WhiteboardElement[], b: WhiteboardElement[]): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

interface DragState {
  id: string;
  pointerId: number;
  offsetX: number;
  offsetY: number;
}

function CanvasElement({
  element,
  selected,
  onPointerDown,
  onDoubleClick,
}: {
  element: WhiteboardElement;
  selected: boolean;
  onPointerDown: (event: ReactPointerEvent<SVGGElement>, element: WhiteboardElement) => void;
  onDoubleClick: (element: WhiteboardElement) => void;
}) {
  function handlePointerDown(event: ReactPointerEvent<SVGGElement>) {
    onPointerDown(event, element);
  }
  function handleDoubleClick() {
    onDoubleClick(element);
  }

  const stroke = selected ? "var(--primary)" : "var(--border)";
  const strokeWidth = selected ? 2 : 1;

  return (
    <g
      onPointerDown={handlePointerDown}
      onDoubleClick={handleDoubleClick}
      style={{ cursor: "move" }}
    >
      {element.type === "ellipse" ? (
        <ellipse
          cx={element.x + element.w / 2}
          cy={element.y + element.h / 2}
          rx={element.w / 2}
          ry={element.h / 2}
          fill={element.color}
          stroke={stroke}
          strokeWidth={strokeWidth}
        />
      ) : element.type === "text" ? (
        <rect
          x={element.x}
          y={element.y}
          width={element.w}
          height={element.h}
          rx={4}
          fill="transparent"
          stroke={selected ? stroke : "transparent"}
          strokeDasharray="4 3"
          strokeWidth={strokeWidth}
        />
      ) : (
        <rect
          x={element.x}
          y={element.y}
          width={element.w}
          height={element.h}
          rx={element.type === "note" ? 8 : 4}
          fill={element.color}
          stroke={stroke}
          strokeWidth={strokeWidth}
        />
      )}
      {(element.type === "note" || element.type === "text") && element.text && (
        <foreignObject
          x={element.x}
          y={element.y}
          width={element.w}
          height={element.h}
          style={{ pointerEvents: "none" }}
        >
          <div
            className={cn(
              "h-full w-full px-2 py-1 text-[12px] leading-snug break-words overflow-hidden",
              element.type === "text" ? "font-medium text-foreground" : "text-slate-800",
            )}
          >
            {element.text}
          </div>
        </foreignObject>
      )}
    </g>
  );
}

function CreateBoardDialog({
  open,
  onOpenChange,
  onCreate,
  isPending,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (name: string) => void;
  isPending: boolean;
}) {
  const [name, setName] = useState("");
  const [wasOpen, setWasOpen] = useState(open);

  if (open && !wasOpen) {
    setWasOpen(true);
    setName("");
  } else if (!open && wasOpen) {
    setWasOpen(false);
  }

  function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    setName(event.target.value);
  }
  function handleSubmit() {
    if (!name.trim()) return;
    onCreate(name.trim());
  }
  function handleCancel() {
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>New Board</DialogTitle>
        </DialogHeader>
        <div className="space-y-1.5 py-2">
          <Label>Board name *</Label>
          <Input
            autoFocus
            placeholder="e.g. Sprint brainstorm"
            value={name}
            onChange={handleChange}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isPending || !name.trim()}>
            {isPending ? "Creating…" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function BoardCanvas({
  projectId,
  board,
}: {
  projectId: number;
  board: { id: number; name: string };
}) {
  const { data, isLoading, isError, refetch } = useWhiteboard(projectId, board.id);
  const update = useUpdateWhiteboard(projectId);

  const [elements, setElements] = useState<WhiteboardElement[]>(() => data?.data ?? []);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeColor, setActiveColor] = useState<string>(PALETTE[0]);
  const [editing, setEditing] = useState<{ id: string; value: string } | null>(null);
  const [syncedData, setSyncedData] = useState<WhiteboardElement[] | null>(() => data?.data ?? null);
  const dragRef = useRef<DragState | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  if (data && data.data !== syncedData) {
    setSyncedData(data.data);
    setElements(data.data);
    setSelectedId(null);
    setEditing(null);
  }

  const dirty = useMemo(
    () => (data ? !elementsEqual(elements, data.data) : false),
    [data, elements],
  );

  const selected = useMemo(
    () => elements.find((element) => element.id === selectedId) ?? null,
    [elements, selectedId],
  );

  const toSvgPoint = useCallback((clientX: number, clientY: number) => {
    const svg = svgRef.current;
    if (!svg) return { x: clientX, y: clientY };
    const rect = svg.getBoundingClientRect();
    return { x: clientX - rect.left, y: clientY - rect.top };
  }, []);

  const handleAdd = useCallback(
    (type: ElementType) => {
      setElements((current) => {
        const id = nextElementId(current);
        const next = defaultElement(type, id, activeColor);
        setSelectedId(id);
        return [...current, next];
      });
    },
    [activeColor],
  );

  const handleElementPointerDown = useCallback(
    (event: ReactPointerEvent<SVGGElement>, element: WhiteboardElement) => {
      event.stopPropagation();
      setSelectedId(element.id);
      const point = toSvgPoint(event.clientX, event.clientY);
      dragRef.current = {
        id: element.id,
        pointerId: event.pointerId,
        offsetX: point.x - element.x,
        offsetY: point.y - element.y,
      };
      svgRef.current?.setPointerCapture(event.pointerId);
    },
    [toSvgPoint],
  );

  const handleCanvasPointerMove = useCallback(
    (event: ReactPointerEvent<SVGSVGElement>) => {
      const drag = dragRef.current;
      if (!drag || drag.pointerId !== event.pointerId) return;
      const point = toSvgPoint(event.clientX, event.clientY);
      const x = Math.max(0, point.x - drag.offsetX);
      const y = Math.max(0, point.y - drag.offsetY);
      setElements((current) =>
        current.map((element) =>
          element.id === drag.id ? { ...element, x, y } : element,
        ),
      );
    },
    [toSvgPoint],
  );

  const handleCanvasPointerUp = useCallback((event: ReactPointerEvent<SVGSVGElement>) => {
    const drag = dragRef.current;
    if (drag && drag.pointerId === event.pointerId) {
      svgRef.current?.releasePointerCapture(event.pointerId);
      dragRef.current = null;
    }
  }, []);

  const handleCanvasPointerDown = useCallback(() => {
    setSelectedId(null);
    setEditing(null);
  }, []);

  const handleDoubleClick = useCallback((element: WhiteboardElement) => {
    if (element.type !== "note" && element.type !== "text") return;
    setSelectedId(element.id);
    setEditing({ id: element.id, value: element.text });
  }, []);

  const handleEditChange = useCallback((event: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = event.target.value;
    setEditing((current) => (current ? { ...current, value } : current));
  }, []);

  const commitEdit = useCallback(() => {
    setEditing((current) => {
      if (!current) return null;
      setElements((els) =>
        els.map((element) =>
          element.id === current.id ? { ...element, text: current.value } : element,
        ),
      );
      return null;
    });
  }, []);

  const handleDeleteSelected = useCallback(() => {
    setSelectedId((current) => {
      if (!current) return null;
      setElements((els) => els.filter((element) => element.id !== current));
      setEditing(null);
      return null;
    });
  }, []);

  const handleColorSelect = useCallback(
    (color: string) => {
      setActiveColor(color);
      setSelectedId((current) => {
        if (current) {
          setElements((els) =>
            els.map((element) =>
              element.id === current ? { ...element, color } : element,
            ),
          );
        }
        return current;
      });
    },
    [],
  );

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (editing) return;
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) return;
      if ((event.key === "Delete" || event.key === "Backspace") && selectedId) {
        event.preventDefault();
        handleDeleteSelected();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [editing, selectedId, handleDeleteSelected]);

  function handleSave() {
    update.mutate(
      { id: board.id, data: elements },
      {
        onSuccess: () => toast.success("Board saved"),
        onError: () => toast.error("Failed to save board"),
      },
    );
  }

  if (isLoading) {
    return <LoadingState variant="page" />;
  }

  if (isError || !data) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <ErrorState onRetry={() => refetch()} />
      </div>
    );
  }

  const editingElement = editing
    ? elements.find((element) => element.id === editing.id) ?? null
    : null;

  return (
    <div className="flex flex-1 min-h-0 flex-col">
      <div className="flex flex-wrap items-center gap-2 border-b border-border pb-2 mb-2">
        <div className="flex items-center gap-1">
          {TOOL_DEFS.map((tool) => (
            <ToolButton key={tool.type} tool={tool} onAdd={handleAdd} />
          ))}
        </div>
        <div className="flex items-center gap-1 pl-2 border-l border-border">
          {PALETTE.map((color) => (
            <PaletteButton
              key={color}
              color={color}
              isActive={activeColor === color}
              onSelect={handleColorSelect}
            />
          ))}
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <Button
            size="sm"
            variant="ghost"
            className="h-8 text-destructive hover:text-destructive"
            onClick={handleDeleteSelected}
            disabled={!selected}
          >
            <Trash2 className="h-3.5 w-3.5 mr-1" />
            Delete
          </Button>
          {dirty && (
            <span className="text-xs text-amber-600 font-medium">Unsaved changes</span>
          )}
          <Button size="sm" className="h-8" onClick={handleSave} disabled={!dirty || update.isPending}>
            <Save className="h-3.5 w-3.5 mr-1" />
            {update.isPending ? "Saving…" : "Save"}
          </Button>
        </div>
      </div>

      <div className="relative flex-1 min-h-0 overflow-hidden rounded-lg border border-border bg-muted/20">
        <svg
          ref={svgRef}
          className="h-full w-full touch-none"
          onPointerDown={handleCanvasPointerDown}
          onPointerMove={handleCanvasPointerMove}
          onPointerUp={handleCanvasPointerUp}
        >
          <defs>
            <pattern id="wb-grid" width="24" height="24" patternUnits="userSpaceOnUse">
              <path d="M 24 0 L 0 0 0 24" fill="none" stroke="var(--border)" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#wb-grid)" />
          {elements.map((element) => (
            <CanvasElement
              key={element.id}
              element={element}
              selected={element.id === selectedId}
              onPointerDown={handleElementPointerDown}
              onDoubleClick={handleDoubleClick}
            />
          ))}
        </svg>

        {editing && editingElement && (
          <textarea
            autoFocus
            value={editing.value}
            onChange={handleEditChange}
            onBlur={commitEdit}
            className="absolute resize-none rounded-md border border-primary bg-background px-2 py-1 text-[12px] leading-snug shadow-sm outline-none"
            style={{
              left: editingElement.x,
              top: editingElement.y,
              width: editingElement.w,
              height: editingElement.h,
            }}
          />
        )}

        {elements.length === 0 && !editing && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <p className="text-sm text-muted-foreground">
              Add a note, shape, or text from the toolbar to start.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function WhiteboardPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId: projectIdStr } = use(params);
  const projectId = Number(projectIdStr);

  const { data: boards, isLoading, isError, refetch } = useWhiteboards(projectId);
  const createBoard = useCreateWhiteboard(projectId);
  const deleteBoard = useDeleteWhiteboard(projectId);

  const [chosenBoardId, setChosenBoardId] = useState<number | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<WhiteboardSummary | null>(null);

  const selectedBoard = useMemo(() => {
    if (!boards || boards.length === 0) return null;
    return boards.find((board) => board.id === chosenBoardId) ?? boards[0];
  }, [boards, chosenBoardId]);
  const selectedBoardId = selectedBoard?.id ?? null;

  function handleCreate(name: string) {
    createBoard.mutate(name, {
      onSuccess: (board) => {
        toast.success("Board created");
        setChosenBoardId(board.id);
        setCreateOpen(false);
      },
      onError: () => toast.error("Failed to create board"),
    });
  }

  function handleConfirmDelete() {
    if (!deleteTarget) return;
    deleteBoard.mutate(deleteTarget.id, {
      onSuccess: () => {
        toast.success("Board deleted");
        if (chosenBoardId === deleteTarget.id) setChosenBoardId(null);
        setDeleteTarget(null);
      },
      onError: () => toast.error("Failed to delete board"),
    });
  }

  function handleOpenCreate() {
    setCreateOpen(true);
  }

  return (
    <PageWrapper
      title="Whiteboard"
      subtitle="Sketch ideas with sticky notes, shapes, and text"
      noInternalScroll
      contentClassName="flex"
      actions={
        <Button size="sm" onClick={handleOpenCreate}>
          <Plus className="h-4 w-4 mr-1" /> New Board
        </Button>
      }
    >
      {isLoading ? (
        <div className="flex-1">
          <LoadingState variant="page" />
        </div>
      ) : isError ? (
        <div className="flex flex-1 items-center justify-center">
          <ErrorState onRetry={() => refetch()} />
        </div>
      ) : !boards || boards.length === 0 ? (
        <div className="flex flex-1">
          <EmptyState
            illustration={<EmptyUploadIllustration />}
            title="Create your first board"
            description="Whiteboards let your team brainstorm visually with notes and shapes."
            action={{ label: "New Board", onClick: handleOpenCreate }}
            className="flex-1"
          />
        </div>
      ) : (
        <div className="flex flex-1 min-h-0 gap-4">
          <aside className="w-56 shrink-0 overflow-y-auto scrollbar-thin border-r border-border pr-3">
            <ul className="space-y-1">
              {boards.map((board) => (
                <li key={board.id}>
                  <div
                    className={cn(
                      "group flex items-center gap-2 rounded-md px-2 py-1.5 text-sm cursor-pointer",
                      board.id === selectedBoardId
                        ? "bg-primary/10 text-primary"
                        : "hover:bg-muted",
                    )}
                    onClick={() => setChosenBoardId(board.id)}
                  >
                    <StickyNote className="h-3.5 w-3.5 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{board.name}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {board.elementCount} {board.elementCount === 1 ? "item" : "items"}
                      </p>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive"
                      onClick={(event) => {
                        event.stopPropagation();
                        setDeleteTarget(board);
                      }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          </aside>

          <div className="flex flex-1 min-h-0 flex-col">
            {selectedBoard ? (
              <BoardCanvas key={selectedBoard.id} projectId={projectId} board={selectedBoard} />
            ) : (
              <div className="flex flex-1 items-center justify-center">
                <EmptyState
                  illustration={<EmptyUploadIllustration />}
                  title="Select a board"
                  description="Choose a board from the list to start editing."
                  compact
                />
              </div>
            )}
          </div>
        </div>
      )}

      <CreateBoardDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreate={handleCreate}
        isPending={createBoard.isPending}
      />

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete board?</AlertDialogTitle>
            <AlertDialogDescription>
              &ldquo;{deleteTarget?.name}&rdquo; and all of its elements will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleConfirmDelete}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageWrapper>
  );
}
