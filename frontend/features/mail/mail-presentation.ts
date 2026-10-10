"use client";

import { useReducer, useCallback } from "react";
import { useIsMobile } from "@/hooks/common/use-mobile";
import { cn } from "@/lib/utils";

type MailPane = "list" | "detail";

interface MailPresentationState {
  pane: MailPane;
  composeOpen: boolean;
}

type MailPresentationAction =
  | { type: "SELECT_MESSAGE" }
  | { type: "BACK_TO_LIST" }
  | { type: "OPEN_COMPOSE" }
  | { type: "CLOSE_COMPOSE" };

export const MAIL_COMPOSE_FAB_CLASS =
  "fixed right-3 bottom-[calc(4rem+0.375rem+env(safe-area-inset-bottom))] z-50 size-12 rounded-full shadow-lg md:hidden";

export const MAIL_LIST_BOTTOM_PADDING_CLASS = "max-md:pb-14";

const LIST_PANE_BASE =
  "flex flex-col h-full min-w-0 shrink-0 border-r border-border bg-card w-full lg:w-96 xl:w-1/3";
const DETAIL_PANE_BASE =
  "flex w-0 max-w-full flex-1 min-h-0 min-w-0 overflow-hidden bg-muted/15";
const MOBILE_HIDE = "hidden lg:flex";

function mailPresentationReducer(
  state: MailPresentationState,
  action: MailPresentationAction,
): MailPresentationState {
  switch (action.type) {
    case "SELECT_MESSAGE":
      return { ...state, pane: "detail" };
    case "BACK_TO_LIST":
      return { ...state, pane: "list" };
    case "OPEN_COMPOSE":
      return { ...state, composeOpen: true };
    case "CLOSE_COMPOSE":
      return { ...state, composeOpen: false };
    default:
      return state;
  }
}

function buildInitialState(
  startOnDetail: boolean,
  startWithCompose: boolean,
): MailPresentationState {
  return {
    pane: startOnDetail ? "detail" : "list",
    composeOpen: startWithCompose,
  };
}

export function useMailOverflowMode(): "inline" | "collapse" {
  return useIsMobile() ? "collapse" : "inline";
}

export function useMailPresentation(
  startOnDetail: boolean,
  startWithCompose: boolean,
) {
  const [state, dispatch] = useReducer(
    mailPresentationReducer,
    null,
    () => buildInitialState(startOnDetail, startWithCompose),
  );

  const listPaneClass = cn(
    LIST_PANE_BASE,
    state.pane === "detail" && MOBILE_HIDE,
  );
  const detailPaneClass = cn(
    DETAIL_PANE_BASE,
    state.pane === "list" && MOBILE_HIDE,
  );

  const selectMessage = useCallback(
    () => dispatch({ type: "SELECT_MESSAGE" }),
    [],
  );
  const backToList = useCallback(
    () => dispatch({ type: "BACK_TO_LIST" }),
    [],
  );
  const openCompose = useCallback(
    () => dispatch({ type: "OPEN_COMPOSE" }),
    [],
  );
  const closeCompose = useCallback(
    () => dispatch({ type: "CLOSE_COMPOSE" }),
    [],
  );

  return {
    pane: state.pane,
    composeOpen: state.composeOpen,
    listPaneClass,
    detailPaneClass,
    selectMessage,
    backToList,
    openCompose,
    closeCompose,
  };
}
