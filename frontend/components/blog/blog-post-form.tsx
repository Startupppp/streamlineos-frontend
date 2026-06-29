"use client";

import { useRef } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BlogContentEditor } from "./blog-content-editor";
import { CoverImageUpload } from "./cover-image-upload";
import { useCreatePost, useUpdatePost } from "@/hooks/api/blog";
import type { PostPayload } from "@/types/blog";

const formSchema = z.object({
  title: z.string().min(1, "Title is required").max(256),
  slug: z.string().max(256).optional(),
  excerpt: z.string().min(1, "Excerpt is required").max(500),
  content: z.string().min(1, "Content is required"),
  coverImage: z.string().min(1, "A cover image is required"),
  categoryId: z.string(),
  status: z.enum(["draft", "published", "archived"]),
  isFeatured: z.boolean(),
  tags: z.string().optional(),
  metaTitle: z.string().max(256).optional(),
  metaDescription: z.string().max(320).optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface Option {
  id: string;
  name: string;
}

interface BlogPostFormProps {
  mode: "create" | "edit";
  postId?: string;
  initial?: {
    title: string;
    slug: string | null;
    excerpt: string;
    content: string;
    contentJson: Record<string, unknown> | null;
    coverImage: string;
    categoryId: string | null;
    status: "draft" | "published" | "archived";
    isFeatured: boolean;
    tags: string[] | null;
    metaTitle: string | null;
    metaDescription: string | null;
  };
  categories: Option[];
}

const NONE = "none";

export function BlogPostForm({
  mode,
  postId,
  initial,
  categories,
}: BlogPostFormProps) {
  const router = useRouter();
  const createPost = useCreatePost();
  const updatePost = useUpdatePost();
  const jsonRef = useRef<Record<string, unknown> | null>(initial?.contentJson ?? null);

  const {
    register,
    handleSubmit,
    control,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: initial?.title ?? "",
      slug: initial?.slug ?? "",
      excerpt: initial?.excerpt ?? "",
      content: initial?.content ?? "",
      coverImage: initial?.coverImage ?? "",
      categoryId: initial?.categoryId ?? NONE,
      status: initial?.status ?? "draft",
      isFeatured: initial?.isFeatured ?? false,
      tags: (initial?.tags ?? []).join(", "),
      metaTitle: initial?.metaTitle ?? "",
      metaDescription: initial?.metaDescription ?? "",
    },
  });

  const coverImage = watch("coverImage");
  const saving = createPost.isPending || updatePost.isPending;

  async function onSubmit(values: FormValues) {
    const payload: PostPayload = {
      title: values.title,
      excerpt: values.excerpt,
      content: values.content,
      contentJson: jsonRef.current,
      coverImage: values.coverImage,
      slug: values.slug?.trim() || undefined,
      categoryId: values.categoryId === NONE ? null : values.categoryId,
      status: values.status,
      isFeatured: values.isFeatured,
      tags: (values.tags ?? "")
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      metaTitle: values.metaTitle?.trim() || null,
      metaDescription: values.metaDescription?.trim() || null,
    };

    try {
      if (mode === "create") {
        await createPost.mutateAsync(payload);
        toast.success("Post created");
      } else if (postId) {
        await updatePost.mutateAsync({ id: postId, ...payload });
        toast.success("Post updated");
      }
      router.push("/blogs/admin");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save post");
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="grid gap-6 lg:grid-cols-[1fr_320px]">

      <div className="space-y-5">
        <Field label="Title" error={errors.title?.message}>
          <Input {...register("title")} placeholder="An engaging post title" />
        </Field>

        <Field label="Excerpt" error={errors.excerpt?.message} hint="A 1-2 sentence summary shown on cards and in search results.">
          <Textarea {...register("excerpt")} rows={3} placeholder="What is this post about?" />
        </Field>

        <Field label="Content" error={errors.content?.message}>
          <BlogContentEditor
            initialHtml={initial?.content}
            onChange={(html, json) => {
              jsonRef.current = json;
              setValue("content", html, { shouldValidate: true });
            }}
          />
        </Field>
      </div>

      <aside className="space-y-5">
        <div className="space-y-5 rounded-xl border border-border bg-card p-5">
          <div className="flex flex-wrap items-center gap-3">
            <Controller
              control={control}
              name="status"
              render={({ field }) => (
                <div className="flex-1">
                  <Label className="mb-1.5">Status</Label>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="published">Published</SelectItem>
                      <SelectItem value="archived">Archived</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            />
          </div>

          <Controller
            control={control}
            name="isFeatured"
            render={({ field }) => (
              <label className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium">Featured post</span>
                <Switch checked={field.value} onCheckedChange={field.onChange} />
              </label>
            )}
          />

          <div className="flex flex-col gap-2 pt-1">
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : mode === "create" ? "Create post" : "Save changes"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => router.push("/blogs/admin")}
              disabled={saving}
            >
              Cancel
            </Button>
          </div>
        </div>

        <div className="space-y-5 rounded-xl border border-border bg-card p-5">
          <Field label="Cover image" error={errors.coverImage?.message}>
            <CoverImageUpload
              value={coverImage}
              onChange={(url) => setValue("coverImage", url, { shouldValidate: true })}
            />
          </Field>

          <Controller
            control={control}
            name="categoryId"
            render={({ field }) => (
              <div>
                <Label className="mb-1.5">Category</Label>
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>No category</SelectItem>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          />

          <Field label="Tags" hint="Comma-separated, e.g. react, performance">
            <Input {...register("tags")} placeholder="react, performance, web" />
          </Field>

          <Field label="Slug" hint="Auto-generated from the title if left blank.">
            <Input {...register("slug")} placeholder="my-post-slug" />
          </Field>
        </div>

        <div className="space-y-4 rounded-xl border border-border bg-card p-5">
          <p className="text-sm font-semibold">SEO</p>
          <Field label="Meta title" error={errors.metaTitle?.message}>
            <Input {...register("metaTitle")} placeholder="Defaults to the post title" />
          </Field>
          <Field label="Meta description" error={errors.metaDescription?.message}>
            <Textarea {...register("metaDescription")} rows={3} placeholder="Defaults to the excerpt" />
          </Field>
        </div>
      </aside>
    </form>
  );
}

function Field({
  label,
  error,
  hint,
  children,
}: {
  label: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
      {hint && !error && <p className="text-xs text-muted-foreground">{hint}</p>}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
