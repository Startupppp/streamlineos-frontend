"use client";

import dynamic from "next/dynamic";

import {
  CommandPaletteContext,
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

export function CommandPaletteProvider({ children, createTicketDialog }: Props) {
  const state = useCommandPaletteState();

  return (
    <CommandPaletteContext.Provider value={state}>
      <KeyboardShortcutsRegistrar />
      {state.helpOpen ? <ShortcutsHelpDialog /> : null}
      {createTicketDialog}
      {children}
    </CommandPaletteContext.Provider>
  );
}
