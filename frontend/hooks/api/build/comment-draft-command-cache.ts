import type { InfiniteData, QueryClient } from "@tanstack/react-query";
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

export async function beginCommentDraftDeletion(
  client: QueryClient,
  ticketId: number,
  canApply: () => boolean,
) {
  const listKey = buildWorkQueryKeys.projects.commentDrafts.mine();
  if (!canApply()) return undefined;
  await client.cancelQueries({ queryKey: listKey, exact: true });
  if (!canApply()) return undefined;
  const previous = client.getQueryData<DraftPages>(listKey);
  if (previous && "pages" in previous && Array.isArray(previous.pages)) {
    client.setQueryData<DraftPages>(
      listKey,
      mapPages(previous, (items) =>
        items.filter((d) => d.ticketId !== ticketId),
      ),
    );
  }
  return previous;
}

export function restoreCommentDraftDeletion(
  client: QueryClient,
  ticketId: number,
  previous: DraftPages,
) {
  if (!previous || !("pages" in previous) || !Array.isArray(previous.pages))
    return;
  const listKey = buildWorkQueryKeys.projects.commentDrafts.mine();
  const current = client.getQueryData<DraftPages>(listKey);
  const restoredItem = previous.pages
    .flatMap((p) => p.data)
    .find((d) => d.ticketId === ticketId);
  if (!restoredItem) return;
  if (!current || !("pages" in current) || !Array.isArray(current.pages)) {
    client.setQueryData<DraftPages>(listKey, () => previous);
    return;
  }
  const alreadyPresent = current.pages
    .flatMap((p) => p.data)
    .some((d) => d.ticketId === ticketId);
  if (alreadyPresent) return;
  client.setQueryData<DraftPages>(listKey, {
    ...current,
    pages: current.pages.map((page, i) =>
      i === 0 ? { ...page, data: [restoredItem, ...page.data] } : page,
    ),
  });
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
      updated.pages = updated.pages.map((page, index) => index === 0
        ? page.data.length < page.pagination.limit ? { ...page, data: [merged, ...page.data] } : page
        : page);
    }
    client.setQueryData(key, updated);
    if (!found) void client.invalidateQueries({ queryKey: key, exact: true, refetchType: "none" });
  }
}
