"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { ArrowLeft, Globe, Trash2, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { getApiError } from "@/lib/api-client";
import {
  useKbTranslations,
  useUpsertKbTranslation,
  useDeleteKbTranslation,
} from "@/hooks/api/kb/translations";
import type { KbTranslation } from "@/types/kb";

type StatusVariant = "default" | "secondary" | "outline" | "destructive";

const STATUS_META: Record<KbTranslation["status"], { label: string; variant: StatusVariant }> = {
  draft: { label: "Draft", variant: "secondary" },
  in_progress: { label: "In Progress", variant: "outline" },
  translated: { label: "Translated", variant: "default" },
  published: { label: "Published", variant: "default" },
  outdated: { label: "Outdated", variant: "destructive" },
};

interface AddTranslationFormProps {
  articleId: number;
}

function AddTranslationForm({ articleId }: AddTranslationFormProps) {
  const [locale, setLocale] = useState("");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const upsert = useUpsertKbTranslation();

  function handleLocaleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setLocale(e.target.value);
  }

  function handleTitleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setTitle(e.target.value);
  }

  function handleContentChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setContent(e.target.value);
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!locale.trim() || !title.trim()) return;
    upsert.mutate(
      { articleId, locale: locale.trim(), title: title.trim(), contentText: content, content },
      {
        onSuccess: () => {
          toast.success(`Translation for "${locale.trim()}" saved`);
          setLocale("");
          setTitle("");
          setContent("");
        },
        onError: (err) => toast.error(getApiError(err)),
      },
    );
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-lg border border-border bg-card p-4 space-y-3">
      <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
        <Plus className="h-4 w-4" /> Add translation
      </h2>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <label htmlFor="locale" className="text-xs font-medium text-muted-foreground">
            Locale
          </label>
          <Input
            id="locale"
            placeholder="e.g. fr, es-MX, de"
            value={locale}
            onChange={handleLocaleChange}
            className="h-8 text-sm"
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="trans-title" className="text-xs font-medium text-muted-foreground">
            Title
          </label>
          <Input
            id="trans-title"
            placeholder="Translated title"
            value={title}
            onChange={handleTitleChange}
            className="h-8 text-sm"
          />
        </div>
      </div>
      <div className="space-y-1">
        <label htmlFor="trans-content" className="text-xs font-medium text-muted-foreground">
          Content (plaintext)
        </label>
        <Textarea
          id="trans-content"
          placeholder="Translated content…"
          value={content}
          onChange={handleContentChange}
          rows={4}
          className="text-sm resize-none"
        />
      </div>
      <Button type="submit" size="sm" disabled={upsert.isPending || !locale.trim() || !title.trim()}>
        Save translation
      </Button>
    </form>
  );
}

interface TranslationRowProps {
  translation: KbTranslation;
  onDelete: (locale: string) => void;
  isDeleting: boolean;
}

function TranslationRow({ translation, onDelete, isDeleting }: TranslationRowProps) {
  const meta = STATUS_META[translation.status];

  function handleDelete() {
    onDelete(translation.locale);
  }

  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-border bg-card px-4 py-3">
      <div className="flex min-w-0 items-center gap-3">
        <Globe className="h-4 w-4 shrink-0 text-muted-foreground" />
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-semibold text-foreground uppercase">
              {translation.locale}
            </span>
            <Badge variant={meta.variant} className="text-[11px]">
              {meta.label}
            </Badge>
          </div>
          <p className="mt-0.5 truncate text-sm text-muted-foreground">{translation.title}</p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <span className="hidden text-xs text-muted-foreground sm:block">
          {format(new Date(translation.updatedAt), "MMM d, yyyy")}
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-muted-foreground hover:text-destructive"
          onClick={handleDelete}
          disabled={isDeleting}
          aria-label={`Delete ${translation.locale} translation`}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

function TranslationListSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 3 }).map((_, i) => (
        <Skeleton key={i} className="h-14 w-full rounded-lg" />
      ))}
    </div>
  );
}

export default function KbTranslationsPage() {
  const params = useParams<{ spaceId: string; articleId: string }>();
  const spaceId = params.spaceId;
  const articleId = Number(params.articleId);

  const translationsQuery = useKbTranslations(articleId);
  const deleteTranslation = useDeleteKbTranslation();
  const [deletingLocale, setDeletingLocale] = useState<string | null>(null);

  function handleDelete(locale: string) {
    setDeletingLocale(locale);
    deleteTranslation.mutate(
      { articleId, locale },
      {
        onSuccess: () => toast.success(`Translation "${locale}" deleted`),
        onError: (err) => toast.error(getApiError(err)),
        onSettled: () => setDeletingLocale(null),
      },
    );
  }

  function handleRetryTranslations() {
    void translationsQuery.refetch();
  }

  const translations = translationsQuery.data ?? [];

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto scrollbar-thin">
        <div className="mx-auto w-full max-w-3xl px-4 py-4 sm:px-6 sm:py-6 space-y-6">
          <div className="flex items-center gap-3">
            <Button asChild variant="ghost" size="icon" className="h-8 w-8 shrink-0">
              <Link
                href={`/knowledge-base/spaces/${spaceId}/articles/${articleId}`}
                aria-label="Back to article"
              >
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-foreground">Translations</h1>
              <p className="text-xs text-muted-foreground">
                Manage localised versions of this article
              </p>
            </div>
          </div>

          {translationsQuery.isLoading ? (
            <TranslationListSkeleton />
          ) : translationsQuery.error ? (
            <ErrorState
              title="Couldn't load translations"
              description={getApiError(translationsQuery.error)}
              onRetry={handleRetryTranslations}
            />
          ) : translations.length === 0 ? (
            <EmptyState
              illustration={<Globe className="h-10 w-10 text-muted-foreground/40" />}
              title="No translations yet"
              description="Add a translation below to localise this article."
            />
          ) : (
            <div className="space-y-2">
              {translations.map((t) => (
                <TranslationRow
                  key={t.locale}
                  translation={t}
                  onDelete={handleDelete}
                  isDeleting={deletingLocale === t.locale}
                />
              ))}
            </div>
          )}

          <AddTranslationForm articleId={articleId} />
        </div>
      </div>
    </div>
  );
}
