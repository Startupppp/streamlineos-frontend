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
  });
  const listKey = buildWorkQueryKeys.projects.commentDrafts.mine();
  const pages = client.getQueryData<DraftPages>(listKey);
  if (!draft) {
    if (pages && "pages" in pages && Array.isArray(pages.pages)) {
      client.setQueryData<DraftPages>(
        listKey,
        mapPages(pages, (items) =>
          items.filter((item) => item.ticketId !== ticketId),
        ),
      );
    }
    void client.invalidateQueries({ queryKey: listKey });
    return;
  }
  if (!pages || !("pages" in pages) || !Array.isArray(pages.pages)) {
    void client.invalidateQueries({ queryKey: listKey });
    return;
  }
  const firstPage = pages.pages[0];
  const list = firstPage?.data;
  const index =
    list?.findIndex((item) => item.ticketId === draft.ticketId) ?? -1;
  const cached = index === -1 ? undefined : list?.[index];
  const ticket = draft.ticket ?? cached?.ticket;
  if (!ticket) {
    void client.invalidateQueries({ queryKey: listKey });
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
  client.setQueryData<DraftPages>(
    listKey,
    mapPages(pages, (items) => {
      const next = [...items];
      if (index === -1) next.unshift(merged);
      else next[index] = merged;
      return next;
    }),
  );
}
