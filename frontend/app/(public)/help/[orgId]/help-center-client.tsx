"use client";

import { useMemo, useState, type ChangeEvent } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { LoadingState } from "@/components/shared/loading-state";
import { ErrorState } from "@/components/shared/error-state";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyPublicDocsIllustration } from "@/components/illustrations";
import {
  BookOpen,
  Search,
  FileText,
  FolderTree,
  ArrowRight,
} from "lucide-react";
import { usePublicKb } from "@/hooks/api/support/kb";
import { KbAskPanel } from "@/components/support/kb-ask-panel";
import { getApiError } from "@/lib/api-client";
import { useDebouncedValue } from "@/hooks/common/use-debounce";

const CATEGORY_ALL = "all";

interface HelpCenterClientProps {
  orgId: string;
}

export function HelpCenterClient({ orgId }: HelpCenterClientProps) {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>(CATEGORY_ALL);
  const debouncedSearch = useDebouncedValue(search.trim(), 300);

  const queryParams = useMemo(
    () => ({
      categoryId:
        activeCategory === CATEGORY_ALL ? undefined : Number(activeCategory),
      search: debouncedSearch || undefined,
    }),
    [activeCategory, debouncedSearch],
  );

  const { data, isLoading, error, refetch } = usePublicKb(orgId, queryParams);

  const categories = data?.categories ?? [];
  const articles = data?.articles ?? [];

  function handleSearchChange(event: ChangeEvent<HTMLInputElement>) {
    setSearch(event.target.value);
  }

  function handleSelectAllCategories() {
    setActiveCategory(CATEGORY_ALL);
  }

  function handleSelectCategory(categoryId: number) {
    setActiveCategory(String(categoryId));
  }

  return (
    <main className="min-h-screen bg-background">
      <section className="gradient-brand text-white">
        <div className="mx-auto max-w-4xl px-4 py-12 sm:py-16 text-center">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15 mb-4">
            <BookOpen className="h-6 w-6" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            How can we help?
          </h1>
          <p className="text-white/80 text-sm mt-2">
            Search our help center or browse articles by category.
          </p>
          <div className="relative mt-6 max-w-xl mx-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={handleSearchChange}
              placeholder="Search articles…"
              className="pl-9 h-11 bg-white text-foreground"
            />
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-4xl px-4 py-8">
        <KbAskPanel mode="public" orgId={orgId} className="mb-6" />
        {isLoading ? (
          <LoadingState variant="cards" />
        ) : error ? (
          <ErrorState
            description={getApiError(error)}
            onRetry={() => refetch()}
          />
        ) : (
          <>
            {categories.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 mb-6">
                <Button
                  variant={
                    activeCategory === CATEGORY_ALL ? "default" : "outline"
                  }
                  size="sm"
                  onClick={handleSelectAllCategories}
                  className="w-full"
                >
                  All
                </Button>
                {categories.map((category) => (
                  <Button
                    key={category.id}
                    variant={
                      activeCategory === String(category.id)
                        ? "default"
                        : "outline"
                    }
                    size="sm"
                    onClick={() => handleSelectCategory(category.id)}
                    className="w-full justify-start min-w-0"
                  >
                    <FolderTree className="h-3.5 w-3.5 mr-1 shrink-0" />
                    <span className="truncate">{category.name}</span>
                  </Button>
                ))}
              </div>
            )}

            {articles.length === 0 ? (
              <EmptyState
                illustration={<EmptyPublicDocsIllustration />}
                title="No articles found"
                description={
                  search.trim()
                    ? "Try a different search term."
                    : "There are no published articles yet."
                }
                className="min-h-[40vh]"
              />
            ) : (
              <div className="space-y-3">
                {articles.map((article) => (
                  <Link
                    key={article.id}
                    href={`/help/${orgId}/${article.slug}`}
                    className="block"
                  >
                    <Card className="hover:border-primary/40 transition-colors">
                      <CardContent className="py-4 flex items-start gap-3">
                        <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
                          <FileText className="h-4.5 w-4.5 text-muted-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm">{article.title}</p>
                          {article.excerpt && (
                            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                              {article.excerpt}
                            </p>
                          )}
                        </div>
                        <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
