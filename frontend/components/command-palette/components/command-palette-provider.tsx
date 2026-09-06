"use client";

import { memo } from "react";
import dynamic from "next/dynamic";

import {
  CommandPaletteActionsContext,
  CommandPaletteStateContext,
  useCommandPaletteState,
} from "../hooks/use-command-palette";
import { useKeyboardShortcuts } from "../hooks/use-keyboard-shortcuts";

const ShortcutsHelpDialog = dynamic(
  () =>
    import("./shortcuts-help-dialog").then((module) =>
      module.ShortcutsHelpDialog,
    ),
  { ssr: false },
);

interface Props {
  children: React.ReactNode;
  createTicketDialog?: React.ReactNode;
}

function KeyboardShortcutsRegistrar() {
  useKeyboardShortcuts();
  return null;
}

const MemoizedKeyboardShortcutsRegistrar = memo(KeyboardShortcutsRegistrar);

export function CommandPaletteProvider({ children, createTicketDialog }: Props) {
  const { state, actions } = useCommandPaletteState();

  return (
    <CommandPaletteActionsContext.Provider value={actions}>
      <CommandPaletteStateContext.Provider value={state}>
        <MemoizedKeyboardShortcutsRegistrar />
        {state.helpOpen ? <ShortcutsHelpDialog /> : null}
        {createTicketDialog}
        {children}
      </CommandPaletteStateContext.Provider>
    </CommandPaletteActionsContext.Provider>
  );
}
