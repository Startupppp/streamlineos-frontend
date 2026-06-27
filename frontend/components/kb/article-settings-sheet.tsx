"use client";

import { useCallback, useMemo } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
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
import { useUpdateKbArticle, useKbCategories } from "@/lib/api/hooks/kb";
import { getErrorMessage } from "@/lib/get-error-message";
import type { KbArticle } from "@/types/kb";

const CATEGORY_NONE = "none";

const settingsSchema = z.object({
  categoryId: z.string(),
  tags: z.string().max(500, "Tags must be at most 500 characters"),
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

  const defaultValues = useMemo<SettingsForm>(
    () => ({
      categoryId: article.categoryId ? String(article.categoryId) : CATEGORY_NONE,
      tags: (article.tags ?? []).join(", "),
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
      const tags = data.tags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean);
      updateArticle.mutate(
        {
          articleId: article.id,
          categoryId: data.categoryId === CATEGORY_NONE ? null : Number(data.categoryId),
          tags: tags.length > 0 ? tags : null,
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
    [updateArticle, article.id, onOpenChange],
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
      isSubmitting={updateArticle.isPending}
      submitLabel={updateArticle.isPending ? "Saving…" : "Save settings"}
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

          <FormField
            control={form.control}
            name="tags"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tags</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Comma separated, e.g. billing, setup" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

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
