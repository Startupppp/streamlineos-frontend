import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { BookOpen, FileText, ArrowRight, FolderTree } from "lucide-react";
import type { PublicKbListData } from "@/lib/public-fetch";

interface PublicHelpCentreContentProps {
  orgId: string;
  orgName: string;
  data: PublicKbListData;
}

export function PublicHelpCentreContent({
  orgId,
  orgName,
  data,
}: PublicHelpCentreContentProps) {
  const { categories, articles } = data;

  return (
    <main className="min-h-dvh bg-background">
      <section className="gradient-brand text-white">
        <div className="mx-auto max-w-4xl px-4 py-12 sm:py-16 text-center">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15 mb-4">
            <BookOpen className="h-6 w-6" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            {orgName} Help Center
          </h1>
          <p className="text-white/80 text-sm mt-2">
            Browse articles and find answers below.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-4xl px-4 py-8">
        {categories.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-6">
            {categories.map((category) => (
              <span
                key={category.id}
                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-foreground"
              >
                <FolderTree className="h-3 w-3 text-muted-foreground" />
                {category.name}
              </span>
            ))}
          </div>
        )}

        {articles.length === 0 ? (
          <div className="flex min-h-[40dvh] flex-col items-center justify-center text-center">
            <FileText className="h-8 w-8 text-muted-foreground/40 mb-3" />
            <p className="text-sm font-medium text-foreground">No articles published yet</p>
            <p className="text-xs text-muted-foreground mt-1">Check back soon.</p>
          </div>
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
                      <FileText className="h-4 w-4 text-muted-foreground" />
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
      </div>
    </main>
  );
}
