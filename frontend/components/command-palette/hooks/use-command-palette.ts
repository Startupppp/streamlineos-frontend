"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";

interface CommandPaletteState {
  paletteOpen: boolean;
  helpOpen: boolean;
  createTicketOpen: boolean;
  createTicketProjectId: number | null;
}

interface CommandPaletteActions {
  setPaletteOpen: (open: boolean) => void;
  setHelpOpen: (open: boolean) => void;
  openCreateTicket: (projectId?: number | null) => void;
  closeCreateTicket: () => void;
}

type CommandPaletteContextValue = CommandPaletteState & CommandPaletteActions;

export const CommandPaletteStateContext =
  createContext<CommandPaletteState | null>(null);

export const CommandPaletteActionsContext =
  createContext<CommandPaletteActions | null>(null);

export function useCommandPalette(): CommandPaletteContextValue {
  const state = useContext(CommandPaletteStateContext);
  const actions = useContext(CommandPaletteActionsContext);
  if (!state || !actions)
    throw new Error("useCommandPalette must be used inside CommandPaletteProvider");
  return useMemo(() => ({ ...state, ...actions }), [state, actions]);
}

export function useCommandPaletteActions(): CommandPaletteActions {
  const actions = useContext(CommandPaletteActionsContext);
  if (!actions)
    throw new Error(
      "useCommandPaletteActions must be used inside CommandPaletteProvider",
    );
  return actions;
}

export function useCommandPaletteState(): {
  state: CommandPaletteState;
  actions: CommandPaletteActions;
} {
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [createTicketOpen, setCreateTicketOpen] = useState(false);
  const [createTicketProjectId, setCreateTicketProjectId] = useState<
    number | null
  >(null);

  const openCreateTicket = useCallback((projectId?: number | null) => {
    setCreateTicketProjectId(projectId ?? null);
    setCreateTicketOpen(true);
  }, []);

  const closeCreateTicket = useCallback(() => {
    setCreateTicketOpen(false);
    setCreateTicketProjectId(null);
  }, []);

  const actions = useMemo<CommandPaletteActions>(
    () => ({ setPaletteOpen, setHelpOpen, openCreateTicket, closeCreateTicket }),
    [setPaletteOpen, setHelpOpen, openCreateTicket, closeCreateTicket],
  );

  const state = useMemo<CommandPaletteState>(
    () => ({ paletteOpen, helpOpen, createTicketOpen, createTicketProjectId }),
    [paletteOpen, helpOpen, createTicketOpen, createTicketProjectId],
  );

  return { state, actions };
}
