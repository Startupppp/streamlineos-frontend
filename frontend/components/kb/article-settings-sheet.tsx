"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { X } from "lucide-react";
import { EntityFormSheet } from "@/components/shared";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useUpdateKbArticle, useKbCategories } from "@/hooks/api/kb";
import {
  useKbTags,
  useCreateKbTag,
  useKbArticleTags,
  useSetKbArticleTags,
} from "@/hooks/api/kb/tags";
import { getErrorMessage } from "@/lib/get-error-message";
import type { KbArticle } from "@/types/kb";

const CATEGORY_NONE = "none";

const settingsSchema = z.object({
  categoryId: z.string(),
  excerpt: z.string().max(500, "Excerpt must be at most 500 characters"),
  visibility: z.enum(["public", "internal"]),
  seoTitle: z.string().max(120, "SEO title must be at most 120 characters"),
  seoDescription: z.string().max(320, "SEO description must be at most 320 characters"),
  reviewIntervalDays: z
    .string()
    .refine(
      (value) =>
        value === "" ||
        (/^\d+$/.test(value) && Number(value) >= 1 && Number(value) <= 3650),
      "Enter a number of days between 1 and 3650",
    ),
});

type SettingsForm = z.infer<typeof settingsSchema>;

interface ArticleSettingsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  spaceId: number;
  article: KbArticle;
}

export function ArticleSettingsSheet({
  open,
  onOpenChange,
  spaceId,
  article,
}: ArticleSettingsSheetProps) {
  const updateArticle = useUpdateKbArticle();
  const categoriesQuery = useKbCategories(spaceId);
  const categories = categoriesQuery.data ?? [];

  const allTagsQuery = useKbTags();
  const allTags = useMemo(() => allTagsQuery.data ?? [], [allTagsQuery.data]);
  const articleTagsQuery = useKbArticleTags(article.id);
  const createTag = useCreateKbTag();
  const setArticleTags = useSetKbArticleTags();

  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);
  const [tagInput, setTagInput] = useState("");
  const initializedRef = useRef(false);

  useEffect(() => {
    if (articleTagsQuery.data && !initializedRef.current) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedTagIds(articleTagsQuery.data.map((t) => t.id));
      initializedRef.current = true;
    }
  }, [articleTagsQuery.data]);

  useEffect(() => {
    if (!open) {
      initializedRef.current = false;
    }
  }, [open]);

  const selectedTags = useMemo(
    () => allTags.filter((t) => selectedTagIds.includes(t.id)),
    [allTags, selectedTagIds],
  );

  const suggestedTags = useMemo(
    () =>
      allTags.filter(
        (t) =>
          !selectedTagIds.includes(t.id) &&
          (tagInput === "" || t.name.toLowerCase().includes(tagInput.toLowerCase())),
      ),
    [allTags, selectedTagIds, tagInput],
  );

  const handleAddTag = useCallback(
    (tagId: number) => {
      setSelectedTagIds((prev) => (prev.includes(tagId) ? prev : [...prev, tagId]));
      setTagInput("");
    },
    [],
  );

  const handleRemoveTag = useCallback((tagId: number) => {
    setSelectedTagIds((prev) => prev.filter((id) => id !== tagId));
  }, []);

  const handleTagInputKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if ((e.key === "Enter" || e.key === ",") && tagInput.trim()) {
        e.preventDefault();
        const name = tagInput.trim().replace(/,$/, "");
        if (!name) return;
        const existing = allTags.find(
          (t) => t.name.toLowerCase() === name.toLowerCase(),
        );
        if (existing) {
          handleAddTag(existing.id);
          return;
        }
        createTag.mutate(name, {
          onSuccess: (tag) => handleAddTag(tag.id),
          onError: (err) => toast.error(getErrorMessage(err)),
        });
      }
    },
    [tagInput, allTags, createTag, handleAddTag],
  );

  const defaultValues = useMemo<SettingsForm>(
    () => ({
      categoryId: article.categoryId ? String(article.categoryId) : CATEGORY_NONE,
      excerpt: article.excerpt ?? "",
      visibility: article.visibility,
      seoTitle: article.seoTitle ?? "",
      seoDescription: article.seoDescription ?? "",
      reviewIntervalDays:
        article.reviewIntervalDays != null ? String(article.reviewIntervalDays) : "",
    }),
    [article],
  );

  const handleSubmit = useCallback(
    (data: SettingsForm) => {
      setArticleTags.mutate(
        { articleId: article.id, tagIds: selectedTagIds },
        {
          onError: (err) => toast.error(getErrorMessage(err)),
        },
      );
      updateArticle.mutate(
        {
          articleId: article.id,
          categoryId: data.categoryId === CATEGORY_NONE ? null : Number(data.categoryId),
          excerpt: data.excerpt.trim() || null,
          visibility: data.visibility,
          seoTitle: data.seoTitle.trim() || null,
          seoDescription: data.seoDescription.trim() || null,
          reviewIntervalDays: data.reviewIntervalDays
            ? Number(data.reviewIntervalDays)
            : null,
        },
        {
          onSuccess: () => {
            toast.success("Article settings saved");
            onOpenChange(false);
          },
          onError: (error) => toast.error(getErrorMessage(error)),
        },
      );
    },
    [updateArticle, setArticleTags, article.id, selectedTagIds, onOpenChange],
  );

  return (
    <EntityFormSheet<SettingsForm>
      open={open}
      onOpenChange={onOpenChange}
      title="Article settings"
      description="Categorisation, visibility, SEO and review cadence."
      resolver={zodResolver(settingsSchema)}
      defaultValues={defaultValues}
      onSubmit={handleSubmit}
      isSubmitting={updateArticle.isPending || setArticleTags.isPending}
      submitLabel={updateArticle.isPending || setArticleTags.isPending ? "Saving…" : "Save settings"}
      resetOnOpen
    >
      {(form) => (
        <div className="space-y-4">
          <FormField
            control={form.control}
            name="categoryId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Category</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent className="w-[var(--radix-select-trigger-width)]">
                    <SelectItem value={CATEGORY_NONE}>Uncategorized</SelectItem>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={String(category.id)}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="visibility"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Visibility</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent className="w-[var(--radix-select-trigger-width)]">
                    <SelectItem value="internal">Internal</SelectItem>
                    <SelectItem value="public">Public</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="space-y-1.5">
            <span className="text-sm font-medium leading-none">Tags</span>
            {selectedTags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {selectedTags.map((tag) => (
                  <Badge key={tag.id} variant="secondary" className="gap-1 pr-1">
                    {tag.name}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tag.id)}
                      className="ml-0.5 rounded-sm opacity-60 hover:opacity-100 focus:outline-none"
                      aria-label={`Remove tag ${tag.name}`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
            <Input
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={handleTagInputKeyDown}
              placeholder="Type a tag name and press Enter to add"
              disabled={createTag.isPending}
            />
            {suggestedTags.length > 0 && tagInput.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {suggestedTags.slice(0, 8).map((tag) => (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() => handleAddTag(tag.id)}
                    className="rounded-full border px-2 py-0.5 text-xs hover:bg-accent transition-colors"
                  >
                    {tag.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          <FormField
            control={form.control}
            name="excerpt"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Excerpt</FormLabel>
                <FormControl>
                  <Textarea
                    {...field}
                    rows={3}
                    maxLength={500}
                    className="w-full resize-none"
                    placeholder="Short summary shown in listings and search results."
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="seoTitle"
            render={({ field }) => (
              <FormItem>
                <FormLabel>SEO title</FormLabel>
                <FormControl>
                  <Input {...field} maxLength={120} placeholder="Title used by search engines" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="seoDescription"
            render={({ field }) => (
              <FormItem>
                <FormLabel>SEO description</FormLabel>
                <FormControl>
                  <Textarea
                    {...field}
                    rows={2}
                    maxLength={320}
                    className="w-full resize-none"
                    placeholder="Meta description used by search engines."
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="reviewIntervalDays"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Review interval (days)</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    inputMode="numeric"
                    placeholder="e.g. 180"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      )}
    </EntityFormSheet>
  );
}
