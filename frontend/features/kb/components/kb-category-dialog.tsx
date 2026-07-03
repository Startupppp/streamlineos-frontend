"use client";

import { useState, type ChangeEvent } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  useCreateKbCategory,
  useUpdateKbCategory,
  type KbCategory,
} from "@/hooks/api/support/kb";
import { getApiError } from "@/lib/api-client";
import { toast } from "sonner";

export interface KbCategoryDialogProps {
  category?: KbCategory;
  onClose: () => void;
}

export function KbCategoryDialog({ category, onClose }: KbCategoryDialogProps) {
  const isEdit = !!category;
  const [name, setName] = useState(category?.name ?? "");
  const [description, setDescription] = useState(category?.description ?? "");
  const [icon, setIcon] = useState(category?.icon ?? "");
  const [isPublished, setIsPublished] = useState(category?.isPublished ?? false);

  const create = useCreateKbCategory();
  const update = useUpdateKbCategory();
  const isPending = create.isPending || update.isPending;

  function handleNameChange(event: ChangeEvent<HTMLInputElement>) {
    setName(event.target.value);
  }

  function handleDescriptionChange(event: ChangeEvent<HTMLTextAreaElement>) {
    setDescription(event.target.value);
  }

  function handleIconChange(event: ChangeEvent<HTMLInputElement>) {
    setIcon(event.target.value);
  }

  function handleSave() {
    if (!name.trim()) return;
    const payload = {
      name: name.trim(),
      description: description.trim() || undefined,
      icon: icon.trim() || undefined,
      isPublished,
    };
    if (isEdit) {
      update.mutate(
        { id: category.id, ...payload, description: description.trim() || null, icon: icon.trim() || null },
        {
          onSuccess: () => {
            toast.success("Category updated");
            onClose();
          },
          onError: (e) => toast.error(getApiError(e)),
        },
      );
    } else {
      create.mutate(payload, {
        onSuccess: () => {
          toast.success("Category created");
          onClose();
        },
        onError: (e) => toast.error(getApiError(e)),
      });
    }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Category" : "New Category"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1">
            <Label>Name *</Label>
            <Input
              placeholder="e.g. Getting Started"
              value={name}
              onChange={handleNameChange}
            />
          </div>
          <div className="space-y-1">
            <Label>Description</Label>
            <Textarea rows={2} value={description} onChange={handleDescriptionChange} />
          </div>
          <div className="space-y-1">
            <Label>Icon name</Label>
            <Input
              placeholder="Optional lucide icon name"
              value={icon}
              onChange={handleIconChange}
            />
          </div>
          <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
            <div>
              <p className="text-sm font-medium">Published to help center</p>
              <p className="text-xs text-muted-foreground">
                Show this category on the public help center
              </p>
            </div>
            <Switch checked={isPublished} onCheckedChange={setIsPublished} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isPending || !name.trim()}>
            {isPending ? "Saving…" : isEdit ? "Save Changes" : "Create Category"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
