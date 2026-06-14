"use client";

import { useMemo, useState, type ChangeEvent } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { LoadingState } from "@/components/shared/loading-state";
import { ErrorState } from "@/components/shared/error-state";
import { EmptyState } from "@/components/ui/empty-state";
import { BookOpen, Search, FileText, FolderTree, ArrowRight } from "lucide-react";
import { usePublicKb } from "@/lib/api/hooks/support/kb";
import { getApiError } from "@/lib/api-client";

const CATEGORY_ALL = "all";

export default function PublicHelpCenterPage() {
  const params = useParams<{ orgId: string }>();
  const orgId = params.orgId;

  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>(CATEGORY_ALL);

  const queryParams = useMemo(
    () => ({
      categoryId: activeCategory === CATEGORY_ALL ? undefined : Number(activeCategory),
      search: search.trim() || undefined,
    }),
    [activeCategory, search],
  );

  const { data, isLoading, error, refetch } = usePublicKb(orgId, queryParams);

  const categories = data?.categories ?? [];
  const articles = data?.articles ?? [];

  function handleSearchChange(event: ChangeEvent<HTMLInputElement>) {
    setSearch(event.target.value);
  }

  return (
    <main className="min-h-screen bg-background">
      <section className="gradient-brand text-white">
        <div className="mx-auto max-w-4xl px-4 py-12 sm:py-16 text-center">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15 mb-4">
            <BookOpen className="h-6 w-6" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">How can we help?</h1>
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
        {isLoading ? (
          <LoadingState variant="cards" />
        ) : error ? (
          <ErrorState description={getApiError(error)} onRetry={() => refetch()} />
        ) : (
          <>
            {categories.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-6">
                <Button
                  variant={activeCategory === CATEGORY_ALL ? "default" : "outline"}
                  size="sm"
                  onClick={() => setActiveCategory(CATEGORY_ALL)}
                >
                  All
                </Button>
                {categories.map((category) => (
                  <Button
                    key={category.id}
                    variant={activeCategory === String(category.id) ? "default" : "outline"}
                    size="sm"
                    onClick={() => setActiveCategory(String(category.id))}
                  >
                    <FolderTree className="h-3.5 w-3.5 mr-1" />
                    {category.name}
                  </Button>
                ))}
              </div>
            )}

            {articles.length === 0 ? (
              <EmptyState
                icon={FileText}
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
                  <Link key={article.id} href={`/help/${orgId}/${article.slug}`} className="block">
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
