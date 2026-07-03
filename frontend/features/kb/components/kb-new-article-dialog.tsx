"use client";

import { useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useCreateKbArticle,
  type KbCategory,
  type KbArticleVisibility,
} from "@/hooks/api/support/kb";
import { getApiError } from "@/lib/api-client";
import { toast } from "sonner";

const CATEGORY_ALL = "all";

function isKbArticleVisibility(v: string): v is KbArticleVisibility {
  return v === "public" || v === "internal";
}

export interface KbNewArticleDialogProps {
  categories: KbCategory[];
  onClose: () => void;
}

export function KbNewArticleDialog({ categories, onClose }: KbNewArticleDialogProps) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [categoryId, setCategoryId] = useState<string>(CATEGORY_ALL);
  const [visibility, setVisibility] = useState<KbArticleVisibility>("internal");
  const create = useCreateKbArticle();

  function handleTitleChange(event: ChangeEvent<HTMLInputElement>) {
    setTitle(event.target.value);
  }

  function handleVisibilityChange(v: string) {
    if (isKbArticleVisibility(v)) setVisibility(v);
  }

  function handleCreate() {
    if (!title.trim()) return;
    create.mutate(
      {
        title: title.trim(),
        categoryId: categoryId === CATEGORY_ALL ? null : Number(categoryId),
        visibility,
      },
      {
        onSuccess: (article) => {
          toast.success("Article created");
          onClose();
          router.push(`/kb/${article.id}`);
        },
        onError: (e) => toast.error(getApiError(e)),
      },
    );
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>New Article</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1">
            <Label>Title *</Label>
            <Input
              placeholder="e.g. How to reset your password"
              value={title}
              onChange={handleTitleChange}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Category</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={CATEGORY_ALL}>Uncategorized</SelectItem>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Visibility</Label>
              <Select value={visibility} onValueChange={handleVisibilityChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="internal">Internal</SelectItem>
                  <SelectItem value="public">Public</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={create.isPending || !title.trim()}>
            {create.isPending ? "Creating…" : "Create & Edit"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
