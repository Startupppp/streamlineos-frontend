"use client";

import { useMemo } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { CheckCircle2, Loader2, ShieldCheck } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
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
import {
  useKbVerificationQueue,
  useKbSpaces,
  useVerifyKbArticle,
} from "@/lib/api/hooks/kb";
import { queryKeys } from "@/lib/query-keys";
import { getApiError } from "@/lib/api-client";
import type { KbVerificationItem } from "@/types/kb";

function formatDate(value: string | null): string {
  if (!value) return "Never";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Never" : format(date, "MMM d, yyyy");
}

interface VerificationRowProps {
  item: KbVerificationItem;
  spaceName: string | null;
  isVerifying: boolean;
  onVerify: (id: number) => void;
}

function VerificationRow({ item, spaceName, isVerifying, onVerify }: VerificationRowProps) {
  function handleVerifyClick() {
    onVerify(item.id);
  }

  return (
    <TableRow>
      <TableCell>
        {item.spaceId !== null ? (
          <Link
            href={`/knowledge-base/spaces/${item.spaceId}/articles/${item.id}`}
            title={item.title}
            className="block truncate font-medium text-foreground hover:text-primary hover:underline"
          >
            {item.title}
          </Link>
        ) : (
          <span title={item.title} className="block truncate font-medium text-foreground">
            {item.title}
          </span>
        )}
      </TableCell>
      <TableCell className="truncate text-muted-foreground">{spaceName ?? "—"}</TableCell>
      <TableCell className="truncate text-muted-foreground" title={item.ownerId ?? undefined}>
        {item.ownerId ?? "—"}
      </TableCell>
      <TableCell className="text-muted-foreground">{formatDate(item.lastVerifiedAt)}</TableCell>
      <TableCell className="tabular-nums text-muted-foreground">
        {item.reviewIntervalDays != null ? `${item.reviewIntervalDays} days` : "—"}
      </TableCell>
      <TableCell className="text-right">
        <Button size="sm" variant="outline" onClick={handleVerifyClick} disabled={isVerifying}>
          {isVerifying ? (
            <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
          ) : (
            <ShieldCheck className="mr-1 h-3.5 w-3.5" />
          )}
          Verify
        </Button>
      </TableCell>
    </TableRow>
  );
}

export default function KnowledgeBaseVerificationPage() {
  const qc = useQueryClient();
  const queueQuery = useKbVerificationQueue();
  const spacesQuery = useKbSpaces();
  const verify = useVerifyKbArticle();

  const items = queueQuery.data ?? [];

  const spaceNames = useMemo(() => {
    const map = new Map<number, string>();
    for (const space of spacesQuery.data ?? []) map.set(space.id, space.name);
    return map;
  }, [spacesQuery.data]);

  function handleVerify(articleId: number) {
    verify.mutate(
      { articleId },
      {
        onSuccess: () => {
          toast.success("Article marked as verified");
          qc.invalidateQueries({ queryKey: queryKeys.kb.verificationQueue() });
        },
        onError: (error) => toast.error(getApiError(error)),
      },
    );
  }

  function handleRetry() {
    queueQuery.refetch();
  }

  return (
    <PageWrapper
      eyebrow="Knowledge Base"
      title="Verification queue"
      subtitle="Articles due for a freshness review. Verify each once you've confirmed it's still accurate."
    >
      {queueQuery.isLoading ? (
        <LoadingState variant="table" className="p-0" />
      ) : queueQuery.error ? (
        <ErrorState
          description={getApiError(queueQuery.error)}
          onRetry={handleRetry}
          className="min-h-[55vh]"
        />
      ) : items.length === 0 ? (
        <EmptyState
          illustration={<CheckCircle2 className="text-emerald-500" />}
          title="Everything is up to date 🎉"
          description="No articles are due for verification right now."
          className="min-h-[60vh]"
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table className="min-w-[760px] table-fixed">
              <TableHeader>
                <TableRow>
                  <TableHead>Article</TableHead>
                  <TableHead className="w-32">Space</TableHead>
                  <TableHead className="w-40">Owner</TableHead>
                  <TableHead className="w-32">Last verified</TableHead>
                  <TableHead className="w-24">Interval</TableHead>
                  <TableHead className="w-28 text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <VerificationRow
                    key={item.id}
                    item={item}
                    spaceName={item.spaceId !== null ? spaceNames.get(item.spaceId) ?? null : null}
                    isVerifying={verify.isPending && verify.variables?.articleId === item.id}
                    onVerify={handleVerify}
                  />
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </PageWrapper>
  );
}
