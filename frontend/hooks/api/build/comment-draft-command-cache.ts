import type { QueryClient } from "@tanstack/react-query";
import { buildWorkQueryKeys } from "@/lib/query-keys/build-work";

export interface CommentDraftAssignee {
  id: string;
  name: string | null;
  firstName: string | null;
  lastName: string | null;
  image: string | null;
}
export interface CommentDraftTicket {
  id: number;
  ticketNumber: number;
  title: string;
  status: string;
  priority: string | null;
  type: string;
  projectId: number | null;
  projectKey: string | null;
  projectName: string | null;
  assignee: CommentDraftAssignee | null;
}
export interface CommentDraft {
  id: number;
  ticketId: number;
  body: string;
  createdAt: string;
  updatedAt: string;
  ticket?: CommentDraftTicket;
}
export interface CommentDraftListItem extends CommentDraft {
  ticket: CommentDraftTicket;
}

export async function beginCommentDraftDeletion(client: QueryClient, ticketId: number, canApply: () => boolean) {
  const listKey = buildWorkQueryKeys.projects.commentDrafts.mine();
  if (!canApply()) return undefined;
  await client.cancelQueries({ queryKey: listKey, exact: true });
  if (!canApply()) return undefined;
  const previous = client.getQueryData<CommentDraftListItem[]>(listKey);
  if (previous) client.setQueryData(listKey, previous.filter((draft) => draft.ticketId !== ticketId));
  return previous;
}

export function restoreCommentDraftDeletion(client: QueryClient, ticketId: number, previous: CommentDraftListItem[]) {
  const priorIndex = previous.findIndex((draft) => draft.ticketId === ticketId);
  const prior = previous[priorIndex];
  if (!prior) return;
  client.setQueryData<CommentDraftListItem[]>(buildWorkQueryKeys.projects.commentDrafts.mine(), (current) => {
    if (!current || current.some((draft) => draft.ticketId === ticketId)) return current;
    const next = [...current];
    next.splice(Math.min(priorIndex, next.length), 0, prior);
    return next;
  });
}

export function applyCommentDraftReceipt(client: QueryClient, ticketId: number, draft: CommentDraft | null) {
  void client.invalidateQueries({ queryKey: buildWorkQueryKeys.projects.commentDrafts.byTicket(ticketId), exact: true });
  void client.invalidateQueries({ queryKey: buildWorkQueryKeys.projects.agentPulseAll() });
  const listKey = buildWorkQueryKeys.projects.commentDrafts.mine();
  const list = client.getQueryData<CommentDraftListItem[]>(listKey);
  if (!draft) {
    if (list) client.setQueryData(listKey, list.filter((item) => item.ticketId !== ticketId));
    void client.invalidateQueries({ queryKey: listKey });
    return;
  }
  const index = list?.findIndex((item) => item.ticketId === draft.ticketId) ?? -1;
  const cached = index === -1 ? undefined : list?.[index];
  const ticket = draft.ticket ?? cached?.ticket;
  if (!list || !ticket) { void client.invalidateQueries({ queryKey: listKey }); return; }
  const merged: CommentDraftListItem = { ...cached, ...draft, ticket };
  const next = [...list];
  if (index === -1) next.unshift(merged);
  else next[index] = merged;
  client.setQueryData(listKey, next);
}
