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
  useCreateRoadmapItem,
  useUpdateRoadmapItem,
} from "@/hooks/api/projects/roadmap";
import type { RoadmapItem, RoadmapStatus } from "@/types/projects";
import { ROADMAP_STATUS_OPTIONS } from "./roadmap-constants";

interface RoadmapItemSheetProps {
  item?: RoadmapItem;
  onClose: () => void;
}

export function RoadmapItemSheet({ item, onClose }: RoadmapItemSheetProps) {
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
    const found = ROADMAP_STATUS_OPTIONS.find((o) => o.value === v);
    if (found) setStatus(found.value);
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
          onSuccess: () => { toast.success("Roadmap item updated"); onClose(); },
          onError: () => toast.error("Failed to update item"),
        },
      );
    } else {
      create.mutate(payload, {
        onSuccess: () => { toast.success("Roadmap item created"); onClose(); },
        onError: () => toast.error("Failed to create item"),
      });
    }
  }

  return (
    <Sheet open onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-lg p-0 flex flex-col gap-0">
        <SheetHeader className="shrink-0 px-6 py-4 border-b text-left gap-1">
          <SheetTitle>{isEdit ? "Edit Roadmap Item" : "New Roadmap Item"}</SheetTitle>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          <div className="space-y-1">
            <Label>Title *</Label>
            <Input placeholder="e.g. Dark mode support" value={title} onChange={handleTitleChange} />
          </div>
          <div className="space-y-1">
            <Label>Description</Label>
            <Textarea rows={4} value={description} onChange={handleDescriptionChange} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Status</Label>
              <Select value={status} onValueChange={handleStatusChange}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ROADMAP_STATUS_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Target Quarter</Label>
              <Input placeholder="e.g. Q3 2026" value={targetQuarter} onChange={handleTargetQuarterChange} />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Category</Label>
            <Input placeholder="e.g. Integrations" value={category} onChange={handleCategoryChange} />
          </div>
          <div className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2.5">
            <div>
              <p className="text-sm font-medium">Public</p>
              <p className="text-xs text-muted-foreground">Show this item on the public board</p>
            </div>
            <Switch checked={isPublic} onCheckedChange={setIsPublic} />
          </div>
        </div>
        <SheetFooter className="shrink-0 px-6 py-4 border-t flex-row gap-2 justify-end">
          <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
          <LoadingButton className="flex-1" onClick={handleSave} disabled={!title.trim()} isPending={isPending} loadingText="Saving…">
            {isEdit ? "Save Changes" : "Create Item"}
          </LoadingButton>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
