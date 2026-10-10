"use client";

import { useReducer, useCallback } from "react";
import { useIsBelowLg } from "@/hooks/common/use-mobile";
import { cn } from "@/lib/utils";
import type { MailComposeMode } from "./mail-compose-schema";

type MailPane = "list" | "detail";

interface MailPresentationState {
  pane: MailPane;
  composeOpen: boolean;
  composeMode: MailComposeMode;
  accountsSheetOpen: boolean;
  accountsSheetDismissed: boolean;
  summarySheetOpen: boolean;
  recentDrawerOpen: boolean;
}

type MailPresentationAction =
  | { type: "SELECT_MESSAGE" }
  | { type: "BACK_TO_LIST" }
  | { type: "OPEN_COMPOSE"; mode: MailComposeMode }
  | { type: "CLOSE_COMPOSE" }
  | { type: "OPEN_ACCOUNTS_SHEET" }
  | { type: "CLOSE_ACCOUNTS_SHEET" }
  | { type: "OPEN_SUMMARY_SHEET" }
  | { type: "CLOSE_SUMMARY_SHEET" }
  | { type: "OPEN_RECENT_DRAWER" }
  | { type: "CLOSE_RECENT_DRAWER" };

export const MAIL_COMPOSE_FAB_CLASS =
  "fixed right-3 bottom-[calc(4rem+0.375rem+env(safe-area-inset-bottom))] z-50 size-12 rounded-full shadow-lg md:hidden";

export const MAIL_LIST_BOTTOM_PADDING_CLASS = "max-md:pb-14";

const LIST_PANE_BASE =
  "flex flex-col h-full min-w-0 shrink-0 border-r border-border bg-card w-full lg:w-96 xl:w-1/3";
const DETAIL_PANE_BASE =
  "flex w-0 max-w-full flex-1 min-h-0 min-w-0 overflow-hidden bg-muted/15";
const MOBILE_HIDE = "hidden lg:flex";

const DEFAULT_COMPOSE_MODE: MailComposeMode = { type: "compose" };

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
      return { ...state, composeOpen: true, composeMode: action.mode };
    case "CLOSE_COMPOSE":
      return { ...state, composeOpen: false };
    case "OPEN_ACCOUNTS_SHEET":
      return { ...state, accountsSheetOpen: true, accountsSheetDismissed: false };
    case "CLOSE_ACCOUNTS_SHEET":
      return { ...state, accountsSheetOpen: false, accountsSheetDismissed: true };
    case "OPEN_SUMMARY_SHEET":
      return { ...state, summarySheetOpen: true };
    case "CLOSE_SUMMARY_SHEET":
      return { ...state, summarySheetOpen: false };
    case "OPEN_RECENT_DRAWER":
      return { ...state, recentDrawerOpen: true };
    case "CLOSE_RECENT_DRAWER":
      return { ...state, recentDrawerOpen: false };
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
    composeMode: DEFAULT_COMPOSE_MODE,
    accountsSheetOpen: false,
    accountsSheetDismissed: false,
    summarySheetOpen: false,
    recentDrawerOpen: false,
  };
}

export function useMailOverflowMode(): "inline" | "collapse" {
  return useIsBelowLg() ? "collapse" : "inline";
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
    (mode: MailComposeMode = DEFAULT_COMPOSE_MODE) =>
      dispatch({ type: "OPEN_COMPOSE", mode }),
    [],
  );
  const closeCompose = useCallback(
    () => dispatch({ type: "CLOSE_COMPOSE" }),
    [],
  );
  const openAccountsSheet = useCallback(
    () => dispatch({ type: "OPEN_ACCOUNTS_SHEET" }),
    [],
  );
  const closeAccountsSheet = useCallback(
    () => dispatch({ type: "CLOSE_ACCOUNTS_SHEET" }),
    [],
  );
  const openSummarySheet = useCallback(
    () => dispatch({ type: "OPEN_SUMMARY_SHEET" }),
    [],
  );
  const closeSummarySheet = useCallback(
    () => dispatch({ type: "CLOSE_SUMMARY_SHEET" }),
    [],
  );
  const openRecentDrawer = useCallback(
    () => dispatch({ type: "OPEN_RECENT_DRAWER" }),
    [],
  );
  const closeRecentDrawer = useCallback(
    () => dispatch({ type: "CLOSE_RECENT_DRAWER" }),
    [],
  );

  return {
    pane: state.pane,
    composeOpen: state.composeOpen,
    composeMode: state.composeMode,
    accountsSheetOpen: state.accountsSheetOpen,
    accountsSheetDismissed: state.accountsSheetDismissed,
    summarySheetOpen: state.summarySheetOpen,
    recentDrawerOpen: state.recentDrawerOpen,
    listPaneClass,
    detailPaneClass,
    selectMessage,
    backToList,
    openCompose,
    closeCompose,
    openAccountsSheet,
    closeAccountsSheet,
    openSummarySheet,
    closeSummarySheet,
    openRecentDrawer,
    closeRecentDrawer,
  };
}
