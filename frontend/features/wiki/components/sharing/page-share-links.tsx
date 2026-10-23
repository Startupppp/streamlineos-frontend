"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { LoadingButton } from "@/components/ui/loading-button";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { InfiniteScrollSentinel } from "@/components/ui/infinite-scroll-sentinel";
import { getErrorMessage } from "@/lib/get-error-message";
import {
  useKbPageShareLinks,
  useCreateKbShareLink,
  useRevokeKbShareLink,
  useRotateKbShareLink,
} from "@/hooks/api/kb/sharing";
import type { ShareLinkItem } from "@/hooks/api/kb/sharing";

const linkSchema = z.object({
  expiresAt: z.string().min(1, "Choose an expiry date"),
  allowDownload: z.boolean(),
});

type LinkFormValues = z.infer<typeof linkSchema>;

interface PageShareLinksProps {
  pageId: number;
  externalSharingEnabled: boolean;
}

interface ShareLinkRowProps {
  link: ShareLinkItem;
  pageId: number;
  onRevealToken: (token: string) => void;
}

function ShareLinkRow({ link, pageId, onRevealToken }: ShareLinkRowProps) {
  const revokeLink = useRevokeKbShareLink();
  const rotateLink = useRotateKbShareLink();
  const [revokeOpen, setRevokeOpen] = useState(false);

  function handleRevokeOpenChange(open: boolean) {
    setRevokeOpen(open);
  }

  function handleOpenRevoke() {
    setRevokeOpen(true);
  }

  function handleConfirmRevoke() {
    revokeLink.mutate(
      { pageId, linkId: link.id },
      {
        onSuccess: () => {
          toast.success("Link revoked");
          setRevokeOpen(false);
        },
        onError: (err) => toast.error(getErrorMessage(err)),
      },
    );
  }

  function handleRotate() {
    rotateLink.mutate(
      { pageId, linkId: link.id },
      {
        onSuccess: (rotated) => {
          onRevealToken(rotated.token);
          toast.success("Link rotated — copy the new URL before it disappears");
        },
        onError: (err) => toast.error(getErrorMessage(err)),
      },
    );
  }

  const expiresLabel = link.isExpired
    ? "Expired"
    : link.isRevoked
      ? "Revoked"
      : `Expires ${link.expiresAt.slice(0, 10)}`;

  return (
    <div className="flex items-center justify-between gap-2 rounded-md border border-border px-2 py-1.5 text-xs">
      <span className="text-muted-foreground">{expiresLabel}</span>
      <div className="flex items-center gap-1">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 text-xs px-2"
          onClick={handleRotate}
          disabled={rotateLink.isPending || link.isRevoked}
        >
          Rotate
        </Button>
        <ConfirmDialog
          title="Revoke link?"
          description="Anyone with this link will lose access immediately."
          confirmLabel="Revoke"
          destructive
          isPending={revokeLink.isPending}
          open={revokeOpen}
          onOpenChange={handleRevokeOpenChange}
          onConfirm={handleConfirmRevoke}
        />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 text-xs px-2"
          onClick={handleOpenRevoke}
          disabled={link.isRevoked}
        >
          Revoke
        </Button>
      </div>
    </div>
  );
}

export function PageShareLinks({ pageId, externalSharingEnabled }: PageShareLinksProps) {
  const {
    data: links,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = useKbPageShareLinks(pageId);
  const createLink = useCreateKbShareLink();
  const [revealedToken, setRevealedToken] = useState<string | null>(null);
  const form = useForm<LinkFormValues>({
    resolver: zodResolver(linkSchema),
    defaultValues: { expiresAt: "", allowDownload: false },
  });

  function handleSubmit(values: LinkFormValues) {
    createLink.mutate(
      { pageId, ...values },
      {
        onSuccess: (created) => {
          setRevealedToken(created.token);
          toast.success("Link created — copy the URL before it disappears");
          form.reset();
        },
        onError: (err) => toast.error(getErrorMessage(err)),
      },
    );
  }

  function handleLoadMore() {
    void fetchNextPage();
  }

  function handleRevealToken(token: string) {
    setRevealedToken(token);
  }

  if (!externalSharingEnabled) {
    return (
      <p className="text-xs text-muted-foreground">
        Link sharing is disabled for this page.
      </p>
    );
  }

  const origin = typeof window !== "undefined" ? window.location.origin : "";

  return (
    <div className="flex flex-col gap-2">
      {revealedToken && (
        <div className="rounded-md border border-primary/30 bg-primary/5 px-2 py-1.5 text-xs break-all">
          <p className="font-medium text-foreground mb-1">Copy this link — it won&#39;t be shown again</p>
          <span className="text-muted-foreground">{`${origin}/share/${revealedToken}`}</span>
        </div>
      )}
      <div className="flex flex-col gap-1">
        {(links ?? []).map((link) => (
          <ShareLinkRow
            key={link.id}
            link={link}
            pageId={pageId}
            onRevealToken={handleRevealToken}
          />
        ))}
        <InfiniteScrollSentinel
          hasNextPage={hasNextPage ?? false}
          isFetchingNextPage={isFetchingNextPage}
          onLoadMore={handleLoadMore}
          label="Loading more links"
        />
      </div>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="flex flex-col gap-2 border-t border-border pt-2">
          <FormField
            control={form.control}
            name="expiresAt"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs">Expires</FormLabel>
                <FormControl>
                  <DatePicker
                    value={field.value}
                    onChange={field.onChange}
                    placeholder="Pick a date"
                    dateFormat="dd MMM yyyy"
                    className="h-8 text-xs"
                    compactCalendar
                    ariaLabel="Expires"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="allowDownload"
            render={({ field }) => (
              <FormItem className="flex items-center gap-2">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <FormLabel className="text-xs font-normal">Allow download</FormLabel>
              </FormItem>
            )}
          />
          <LoadingButton
            type="submit"
            size="sm"
            className="h-8 text-xs"
            isPending={createLink.isPending}
          >
            Create link
          </LoadingButton>
        </form>
      </Form>
    </div>
  );
}
