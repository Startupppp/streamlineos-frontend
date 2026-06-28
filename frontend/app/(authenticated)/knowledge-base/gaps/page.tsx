"use client";

import { useMemo } from "react";
import Link from "next/link";
import { FileText, Sparkles } from "lucide-react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { LoadingState, ErrorState } from "@/components/shared";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptySearchIllustration } from "@/components/illustrations";
import { useKbNoResults, useKbSpaces } from "@/lib/api/hooks/kb";
import { getApiError } from "@/lib/api-client";

function formatNumber(value: number): string {
  return value.toLocaleString();
}

export default function KnowledgeBaseGapsPage() {
  const noResultsQuery = useKbNoResults();
  const spacesQuery = useKbSpaces();

  const rows = useMemo(() => {
    const data = noResultsQuery.data ?? [];
    return [...data].sort((a, b) => b.count - a.count);
  }, [noResultsQuery.data]);

  const firstSpace = spacesQuery.data?.[0] ?? null;

  function handleRetry() {
    void noResultsQuery.refetch();
  }

  return (
    <PageWrapper
      eyebrow="Knowledge Base"
      title="Content gaps"
      subtitle="Searches that returned no results — these are questions readers asked that your knowledge base could not answer. Each one is an article waiting to be written."
    >
      {noResultsQuery.isLoading ? (
        <LoadingState variant="table" rows={8} />
      ) : noResultsQuery.error ? (
        <ErrorState
          description={getApiError(noResultsQuery.error)}
          onRetry={handleRetry}
          className="min-h-[55vh]"
        />
      ) : rows.length === 0 ? (
        <EmptyState
          illustration={<EmptySearchIllustration />}
          title="No content gaps detected 🎉"
          description="Every recent search matched at least one article. Check back as readers explore more."
          className="min-h-[55vh]"
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table className="table-fixed">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10 text-right">#</TableHead>
                  <TableHead>Failed search</TableHead>
                  <TableHead className="w-24 text-right">Searches</TableHead>
                  <TableHead className="w-[220px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row, index) => {
                  const query = row.query?.trim() ?? "";
                  const hasQuery = query.length > 0;
                  const draftHref = firstSpace
                    ? `/knowledge-base/spaces/${firstSpace.id}/new?title=${encodeURIComponent(query)}`
                    : "/knowledge-base/spaces";
                  const askHref = `/knowledge-base/ask?q=${encodeURIComponent(query)}`;
                  return (
                    <TableRow key={`${row.query ?? "empty"}-${index}`}>
                      <TableCell className="text-right tabular-nums text-muted-foreground">
                        {index + 1}
                      </TableCell>
                      <TableCell>
                        {hasQuery ? (
                          <span
                            title={query}
                            className="block truncate font-medium text-foreground"
                          >
                            {query}
                          </span>
                        ) : (
                          <span className="italic text-muted-foreground">(empty query)</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">
                        {formatNumber(row.count)}
                      </TableCell>
                      <TableCell>
                        {hasQuery && (
                          <div className="flex items-center justify-end gap-2">
                            <Button asChild size="sm" variant="outline" className="h-7 text-xs">
                              <Link href={askHref}>
                                <Sparkles className="mr-1 h-3.5 w-3.5" /> Ask AI
                              </Link>
                            </Button>
                            <Button asChild size="sm" className="h-7 text-xs">
                              <Link href={draftHref}>
                                <FileText className="mr-1 h-3.5 w-3.5" /> Draft article
                              </Link>
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </PageWrapper>
  );
}
