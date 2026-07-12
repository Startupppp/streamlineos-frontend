"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, MoreHorizontal, ExternalLink } from "lucide-react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/shared/error-state";
import { IllustrationImage } from "@/components/illustrations/illustration-image";
import { useSignEnvelopes } from "@/hooks/api/sign/envelopes";
import { EnvelopeStatusBadge } from "../components/envelope-status-badge";
import { CreateEnvelopeDialog } from "../components/create-envelope-dialog";

const STATUS_FILTERS = [
  { value: "all", label: "All" },
  { value: "draft", label: "Draft" },
  { value: "sent", label: "Sent" },
  { value: "partially_completed", label: "Partially signed" },
  { value: "completed", label: "Completed" },
  { value: "voided", label: "Voided" },
  { value: "expired", label: "Expired" },
] as const;

export function EnvelopeList() {
  const router = useRouter();
  const [status, setStatus] = useState<string>("all");
  const [createOpen, setCreateOpen] = useState(false);
  const { data: envelopes, isLoading, isError, refetch } = useSignEnvelopes(status === "all" ? undefined : { status });

  return (
    <PageWrapper
      title="Envelopes"
      subtitle="Every signing request you've sent, organized by status"
      actions={
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="size-4" />
          New envelope
        </Button>
      }
      filters={
        <Tabs value={status} onValueChange={setStatus}>
          <TabsList>
            {STATUS_FILTERS.map((f) => (
              <TabsTrigger key={f.value} value={f.value}>
                {f.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      }
    >
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : isError ? (
        <ErrorState title="Failed to load envelopes" onRetry={() => void refetch()} />
      ) : !envelopes || envelopes.length === 0 ? (
        <div className="flex flex-1 h-full min-h-[50vh] flex-col items-center justify-center gap-4 text-center">
          <IllustrationImage name="empty-upload" className="h-40 w-40" />
          <div>
            <p className="font-medium text-foreground">No envelopes yet</p>
            <p className="text-sm text-muted-foreground mt-1">Upload a PDF and send it for signature to get started.</p>
          </div>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="size-4" />
            New envelope
          </Button>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Sent</TableHead>
              <TableHead>Expires</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {envelopes.map((envelope) => (
              <TableRow
                key={envelope.id}
                className="cursor-pointer"
                onClick={() => router.push(`/sign/envelopes/${envelope.id}`)}
              >
                <TableCell className="font-medium">{envelope.title}</TableCell>
                <TableCell>
                  <EnvelopeStatusBadge status={envelope.status} />
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {envelope.sentAt ? new Date(envelope.sentAt).toLocaleDateString() : "—"}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {envelope.expiresAt ? new Date(envelope.expiresAt).toLocaleDateString() : "—"}
                </TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="size-8">
                        <MoreHorizontal className="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => router.push(`/sign/envelopes/${envelope.id}`)}>
                        <ExternalLink className="size-4" />
                        Open
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <CreateEnvelopeDialog open={createOpen} onOpenChange={setCreateOpen} />
    </PageWrapper>
  );
}
