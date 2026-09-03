"use client";

import { createContext, useContext, useState, useCallback, useMemo } from "react";

interface CommandPaletteContextValue {
  paletteOpen: boolean;
  setPaletteOpen: (open: boolean) => void;
  helpOpen: boolean;
  setHelpOpen: (open: boolean) => void;
  createTicketOpen: boolean;
  createTicketProjectId: number | null;
  openCreateTicket: (projectId?: number | null) => void;
  closeCreateTicket: () => void;
}

export const CommandPaletteContext = createContext<CommandPaletteContextValue | null>(null);

export function useCommandPalette(): CommandPaletteContextValue {
  const ctx = useContext(CommandPaletteContext);
  if (!ctx) throw new Error("useCommandPalette must be used inside CommandPaletteProvider");
  return ctx;
}

export function useCommandPaletteState(): CommandPaletteContextValue {
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [createTicketOpen, setCreateTicketOpen] = useState(false);
  const [createTicketProjectId, setCreateTicketProjectId] = useState<number | null>(null);

  const openCreateTicket = useCallback((projectId?: number | null) => {
    setCreateTicketProjectId(projectId ?? null);
    setCreateTicketOpen(true);
  }, []);

  const closeCreateTicket = useCallback(() => {
    setCreateTicketOpen(false);
    setCreateTicketProjectId(null);
  }, []);

  return useMemo(
    () => ({
      paletteOpen,
      setPaletteOpen,
      helpOpen,
      setHelpOpen,
      createTicketOpen,
      createTicketProjectId,
      openCreateTicket,
      closeCreateTicket,
    }),
    [paletteOpen, helpOpen, createTicketOpen, createTicketProjectId, openCreateTicket, closeCreateTicket],
  );
}
