"use client";

import { useState, useCallback } from "react";
import { Bookmark, Check, Pencil, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ResponsivePopover,
  ResponsivePopoverTrigger,
  ResponsivePopoverContent,
} from "@/components/ui/responsive-popover";
import type { InboxFilterState } from "./inbox-view-params";
import {
  useInboxSavedViews,
  type SavedInboxView,
} from "./use-inbox-saved-views";

interface InboxSavedViewsPanelProps {
  currentState: InboxFilterState;
  onApply: (state: InboxFilterState) => void;
}

function RenameRow({
  view,
  onRename,
  onCancel,
}: {
  view: SavedInboxView;
  onRename: (id: string, name: string) => void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState(view.name);
  const handleValueChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => setValue(e.target.value),
    [],
  );
  const handleConfirm = useCallback(() => {
    if (value.trim()) onRename(view.id, value.trim());
    onCancel();
  }, [value, view.id, onRename, onCancel]);
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") handleConfirm();
      if (e.key === "Escape") onCancel();
    },
    [handleConfirm, onCancel],
  );
  return (
    <div className="flex items-center gap-1">
      <Input
        value={value}
        onChange={handleValueChange}
        onKeyDown={handleKeyDown}
        className="h-7 text-sm flex-1"
        autoFocus
      />
      <Button type="button" size="icon" variant="ghost" className="h-7 w-7" onClick={handleConfirm} aria-label="Confirm rename">
        <Check className="h-3.5 w-3.5" />
      </Button>
      <Button type="button" size="icon" variant="ghost" className="h-7 w-7" onClick={onCancel} aria-label="Cancel rename">
        <X className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

export function InboxSavedViewsPanel({
  currentState,
  onApply,
}: InboxSavedViewsPanelProps) {
  const { views, saveView, applyView, renameView, deleteView } = useInboxSavedViews();
  const [saveName, setSaveName] = useState("");
  const [renamingId, setRenamingId] = useState<string | null>(null);

  const handleSaveNameChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => setSaveName(e.target.value),
    [],
  );

  const handleSave = useCallback(() => {
    const trimmed = saveName.trim();
    if (!trimmed) return;
    saveView(trimmed, currentState);
    setSaveName("");
  }, [saveName, currentState, saveView]);

  const handleSaveKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") handleSave();
    },
    [handleSave],
  );

  const handleApply = useCallback(
    (view: SavedInboxView) => onApply(applyView(view)),
    [applyView, onApply],
  );

  const handleStartRename = useCallback((id: string) => setRenamingId(id), []);
  const handleCancelRename = useCallback(() => setRenamingId(null), []);

  const handleRename = useCallback(
    (id: string, name: string) => {
      renameView(id, name);
      setRenamingId(null);
    },
    [renameView],
  );

  return (
    <ResponsivePopover>
      <ResponsivePopoverTrigger asChild>
        <Button type="button" variant="outline" size="sm" aria-label="Saved views">
          <Bookmark className="h-3.5 w-3.5 mr-1.5" />
          Views
        </Button>
      </ResponsivePopoverTrigger>
      <ResponsivePopoverContent
        className="w-72 p-3 flex flex-col gap-3"
        title="Saved views"
        align="end"
      >
        <div className="flex flex-col gap-1">
          <p className="text-xs font-medium text-muted-foreground">Save current view</p>
          <div className="flex items-center gap-1.5">
            <Input
              value={saveName}
              onChange={handleSaveNameChange}
              onKeyDown={handleSaveKeyDown}
              placeholder="View name…"
              className="h-8 text-sm flex-1"
            />
            <Button
              type="button"
              size="sm"
              onClick={handleSave}
              disabled={!saveName.trim()}
            >
              Save
            </Button>
          </div>
        </div>

        {views.length > 0 && (
          <div className="flex flex-col gap-1">
            <p className="text-xs font-medium text-muted-foreground">Saved views</p>
            <div className="flex flex-col gap-1">
              {views.map((view) =>
                renamingId === view.id ? (
                  <RenameRow
                    key={view.id}
                    view={view}
                    onRename={handleRename}
                    onCancel={handleCancelRename}
                  />
                ) : (
                  <div key={view.id} className="flex items-center gap-1 group">
                    <button
                      type="button"
                      className="flex-1 text-left text-sm py-1 px-2 rounded hover:bg-accent truncate"
                      onClick={() => handleApply(view)}
                    >
                      {view.name}
                    </button>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 opacity-0 group-hover:opacity-100"
                      onClick={() => handleStartRename(view.id)}
                      aria-label={`Rename ${view.name}`}
                    >
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive"
                      onClick={() => deleteView(view.id)}
                      aria-label={`Delete ${view.name}`}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ),
              )}
            </div>
          </div>
        )}

        {views.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-2">
            No saved views yet.
          </p>
        )}
      </ResponsivePopoverContent>
    </ResponsivePopover>
  );
}
