"use client";

import { useCallback } from "react";
import {
  useRouter,
  useSearchParams,
  type ReadonlyURLSearchParams,
} from "next/navigation";
import {
  readChatSearchScope,
  type ChatSearchScope,
} from "@/features/chat/chat-search-scope";

type UrlWrite = "push" | "replace";

export type ChatCreateDialog = "dm" | "channel";

function dropActionParams(next: URLSearchParams) {
  next.delete("search");
  next.delete("dm");
  next.delete("dialog");
}

function dropConversationParams(next: URLSearchParams) {
  next.delete("channel");
  next.delete("message");
}

function readPositiveIntParam(
  params: ReadonlyURLSearchParams,
  name: string,
): number | null {
  const raw = params.get(name);
  const parsed = raw ? Number(raw) : NaN;
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

export function useChatHomeUrl() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeChannelId = readPositiveIntParam(searchParams, "channel");
  const messageId =
    activeChannelId === null ? null : readPositiveIntParam(searchParams, "message");
  const searchScope = readChatSearchScope(searchParams.get("search"));
  const dmRequested = searchParams.get("dm") === "1";
  const joinHuddleRequested = searchParams.get("joinHuddle") === "1";
  const dialogParam = searchParams.get("dialog");
  const createDialog: ChatCreateDialog | null =
    dialogParam === "dm" || dialogParam === "channel"
      ? dialogParam
      : dmRequested
        ? "dm"
        : null;

  const writeUrl = useCallback(
    (mode: UrlWrite, update: (next: URLSearchParams) => void) => {
      const next = new URLSearchParams(searchParams.toString());
      update(next);
      const query = next.toString();
      const href = query ? `/chat?${query}` : "/chat";
      if (mode === "push") router.push(href, { scroll: false });
      else router.replace(href, { scroll: false });
    },
    [searchParams, router],
  );

  const navigateToConversation = useCallback(
    (channelId: number, targetMessageId: number | null) => {
      const hasActionParams =
        searchParams.has("search") || searchParams.has("dm") || searchParams.has("dialog");
      if (hasActionParams) writeUrl("replace", dropActionParams);
      const unchanged =
        channelId === activeChannelId &&
        targetMessageId === null &&
        !searchParams.has("message");
      if (unchanged) return;
      writeUrl("push", (next) => {
        dropActionParams(next);
        next.set("channel", String(channelId));
        if (targetMessageId === null) next.delete("message");
        else next.set("message", String(targetMessageId));
      });
    },
    [activeChannelId, searchParams, writeUrl],
  );

  const setSearchScope = useCallback(
    (scope: ChatSearchScope | null) => {
      writeUrl("replace", (next) => {
        if (scope === null) next.delete("search");
        else next.set("search", scope);
      });
    },
    [writeUrl],
  );

  const clearDmParam = useCallback(() => {
    writeUrl("replace", (next) => next.delete("dm"));
  }, [writeUrl]);

  const openDialog = useCallback(
    (dialog: ChatCreateDialog) => {
      writeUrl("replace", (next) => {
        next.delete("dm");
        next.set("dialog", dialog);
      });
    },
    [writeUrl],
  );

  const closeDialog = useCallback(() => {
    writeUrl("replace", (next) => {
      next.delete("dialog");
    });
  }, [writeUrl]);

  const clearJoinHuddleParam = useCallback(() => {
    writeUrl("replace", (next) => next.delete("joinHuddle"));
  }, [writeUrl]);

  const closeConversation = useCallback(
    (mode: UrlWrite) => writeUrl(mode, dropConversationParams),
    [writeUrl],
  );

  const leaveMessage = useCallback(() => {
    writeUrl("replace", (next) => next.delete("message"));
  }, [writeUrl]);

  return {
    activeChannelId,
    messageId,
    searchScope,
    dmRequested,
    joinHuddleRequested,
    createDialog,
    navigateToConversation,
    setSearchScope,
    clearDmParam,
    clearJoinHuddleParam,
    closeConversation,
    leaveMessage,
    openDialog,
    closeDialog,
  };
}
