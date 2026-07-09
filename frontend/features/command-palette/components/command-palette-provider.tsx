"use client";

import { useMemo } from "react";
import {
  CommandPaletteContext,
  useCommandPaletteState,
} from "../hooks/use-command-palette";
import { useKeyboardShortcuts } from "../hooks/use-keyboard-shortcuts";
import { ShortcutsHelpDialog } from "./shortcuts-help-dialog";

interface Props {
  children: React.ReactNode;
}

function KeyboardShortcutsRegistrar() {
  useKeyboardShortcuts();
  return null;
}

export function CommandPaletteProvider({ children }: Props) {
  const state = useCommandPaletteState();
  const ctx = useMemo(() => state, [state]);

  return (
    <CommandPaletteContext.Provider value={ctx}>
      <KeyboardShortcutsRegistrar />
      <ShortcutsHelpDialog />
      {children}
    </CommandPaletteContext.Provider>
  );
}
