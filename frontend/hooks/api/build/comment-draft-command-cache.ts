import type { InfiniteData, QueryClient, QueryKey } from "@tanstack/react-query";
import { buildWorkQueryKeys } from "@/lib/query-keys/build-work";
import type {
  CommentDraftsListMineResponse,
  CommentDraftsUpsertResponse,
} from "@/contracts/build-contracts.generated";

export type CommentDraftListItem =
  CommentDraftsListMineResponse["data"][number];
type CommentDraftTicket = CommentDraftListItem["ticket"];
export type CommentDraft = CommentDraftsUpsertResponse & {
  ticket?: CommentDraftTicket;
};

type DraftPages = InfiniteData<CommentDraftsListMineResponse>;

function mapPages(
  pages: DraftPages,
  fn: (items: CommentDraftListItem[]) => CommentDraftListItem[],
): DraftPages {
  return {
    ...pages,
    pages: pages.pages.map((page) => ({
      ...page,
      data: fn(page.data),
    })),
  };
}

type DraftPageSnapshot = { key: QueryKey; data: DraftPages };

export async function beginCommentDraftDeletion(
  client: QueryClient,
  ticketId: number,
  canApply: () => boolean,
): Promise<DraftPageSnapshot[] | undefined> {
  const listKey = buildWorkQueryKeys.projects.commentDrafts.mine();
  if (!canApply()) return undefined;
  await client.cancelQueries({ queryKey: listKey });
  if (!canApply()) return undefined;
  const entries = client.getQueriesData<DraftPages>({ queryKey: listKey });
  const snapshots: DraftPageSnapshot[] = [];
  for (const [key, data] of entries) {
    if (!data || !("pages" in data) || !Array.isArray(data.pages)) continue;
    snapshots.push({ key, data });
    client.setQueryData<DraftPages>(
      key,
      mapPages(data, (items) => items.filter((d) => d.ticketId !== ticketId)),
    );
  }
  return snapshots.length ? snapshots : undefined;
}

export function restoreCommentDraftDeletion(
  client: QueryClient,
  ticketId: number,
  snapshots: DraftPageSnapshot[],
) {
  for (const { key, data: previous } of snapshots) {
    const restoredItem = previous.pages
      .flatMap((p) => p.data)
      .find((d) => d.ticketId === ticketId);
    if (!restoredItem) continue;
    const current = client.getQueryData<DraftPages>(key);
    if (!current || !("pages" in current) || !Array.isArray(current.pages)) {
      client.setQueryData<DraftPages>(key, () => previous);
      continue;
    }
    const alreadyPresent = current.pages
      .flatMap((p) => p.data)
      .some((d) => d.ticketId === ticketId);
    if (alreadyPresent) continue;
    client.setQueryData<DraftPages>(key, {
      ...current,
      pages: current.pages.map((page, i) =>
        i === 0 ? { ...page, data: [restoredItem, ...page.data] } : page,
      ),
    });
  }
}

export function applyCommentDraftReceipt(
  client: QueryClient,
  ticketId: number,
  draft: CommentDraft | null,
  ownerKey?: string,
) {
  const ticketDraftKey = buildWorkQueryKeys.projects.commentDrafts.byTicket(ticketId);
  if (ownerKey === undefined)
    void client.invalidateQueries({ queryKey: ticketDraftKey, exact: true });
  else client.setQueryData(ticketDraftKey, { draft, ownerKey });
  void client.invalidateQueries({
    queryKey: buildWorkQueryKeys.projects.agentPulseAll(),
    refetchType: "none",
  });
  const listKey = buildWorkQueryKeys.projects.commentDrafts.mine();
  if (!draft) {
      client.setQueriesData<DraftPages>(
        { queryKey: listKey },
        (pages) => pages && "pages" in pages && Array.isArray(pages.pages) ? mapPages(pages, (items) =>
          items.filter((item) => item.ticketId !== ticketId),
        ) : pages,
      );
    return;
  }
  const cached = client.getQueriesData<DraftPages>({ queryKey: listKey })
    .flatMap(([, pages]) => pages && "pages" in pages && Array.isArray(pages.pages) ? pages.pages.flatMap((page) => page.data) : [])
    .find((item) => item.ticketId === ticketId);
  const ticket = draft.ticket ?? cached?.ticket;
  if (!ticket) {
    for (const [key] of client.getQueriesData({ queryKey: listKey }))
      void client.invalidateQueries({ queryKey: key, exact: true, refetchType: "none" });
    return;
  }
  const merged: CommentDraftListItem = {
    id: draft.id,
    orgId: draft.orgId,
    membershipId: draft.membershipId,
    ticketId: draft.ticketId,
    body: draft.body,
    createdAt: draft.createdAt,
    updatedAt: draft.updatedAt,
    ticket,
  };
  for (const [key, pages] of client.getQueriesData<DraftPages>({ queryKey: listKey })) {
    if (!pages || !("pages" in pages) || !Array.isArray(pages.pages)) continue;
    const firstPage = key.length === listKey.length;
    let found = false;
    const updated = mapPages(pages, (items) => items.map((item) => {
      if (item.ticketId !== ticketId) return item;
      found = true;
      return merged;
    }));
    if (!found && firstPage && !cached) {
      updated.pages = updated.pages.map((page, index) => {
        if (index !== 0 || page.data.length >= page.pagination.limit) return page;
        found = true;
        return { ...page, data: [merged, ...page.data] };
      });
    }
    client.setQueryData(key, updated);
    if (!found) void client.invalidateQueries({ queryKey: key, exact: true, refetchType: "none" });
  }
}
