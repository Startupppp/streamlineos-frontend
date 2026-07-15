"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
  SheetBody,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  useCreateChangelogEntry,
  useUpdateChangelogEntry,
} from "@/hooks/api/projects/roadmap";
import type { ChangelogEntry, ChangelogType } from "@/types/projects";
import { CHANGELOG_TYPE_OPTIONS } from "./roadmap-constants";

interface ChangelogSheetProps {
  entry?: ChangelogEntry;
  onClose: () => void;
}

export function ChangelogSheet({ entry, onClose }: ChangelogSheetProps) {
  const isEdit = !!entry;
  const [title, setTitle] = useState(entry?.title ?? "");
  const [content, setContent] = useState(entry?.content ?? "");
  const [version, setVersion] = useState(entry?.version ?? "");
  const [type, setType] = useState<ChangelogType>(entry?.type ?? "feature");
  const [isPublished, setIsPublished] = useState(entry?.isPublished ?? false);

  const create = useCreateChangelogEntry();
  const update = useUpdateChangelogEntry();
  const isPending = create.isPending || update.isPending;

  function handleTitleChange(e: React.ChangeEvent<HTMLInputElement>) { setTitle(e.target.value); }
  function handleContentChange(e: React.ChangeEvent<HTMLTextAreaElement>) { setContent(e.target.value); }
  function handleTypeChange(v: string) {
    const found = CHANGELOG_TYPE_OPTIONS.find((o) => o.value === v);
    if (found) setType(found.value);
  }
  function handleVersionChange(e: React.ChangeEvent<HTMLInputElement>) { setVersion(e.target.value); }

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
          onSuccess: () => { toast.success("Changelog entry updated"); onClose(); },
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
          onSuccess: () => { toast.success("Changelog entry created"); onClose(); },
          onError: () => toast.error("Failed to create entry"),
        },
      );
    }
  }

  return (
    <Sheet open onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-lg p-0 flex flex-col gap-0">
        <SheetHeader className="shrink-0 px-6 py-4 border-b text-left gap-1">
          <SheetTitle>{isEdit ? "Edit Changelog Entry" : "New Changelog Entry"}</SheetTitle>
        </SheetHeader>
        <SheetBody className="px-6 py-5 space-y-4">
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
            <Textarea rows={6} value={content} onChange={handleContentChange} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Type</Label>
              <Select value={type} onValueChange={handleTypeChange}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CHANGELOG_TYPE_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Version</Label>
              <Input placeholder="e.g. v1.4.0" value={version} onChange={handleVersionChange} />
            </div>
          </div>
          <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-3 py-2.5">
            <div>
              <p className="text-sm font-medium text-foreground">Published</p>
              <p className="text-xs text-muted-foreground">Show this entry on the public changelog</p>
            </div>
            <Switch
              checked={isPublished}
              onCheckedChange={setIsPublished}
              className="border border-border data-[state=unchecked]:bg-input"
            />
          </div>
        </SheetBody>
        <SheetFooter className="shrink-0 px-6 py-4 border-t flex-row gap-2 justify-end">
          <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
          <LoadingButton className="flex-1" onClick={handleSave} disabled={!title.trim()} isPending={isPending} loadingText="Saving…">
            {isEdit ? "Save Changes" : "Create Entry"}
          </LoadingButton>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
