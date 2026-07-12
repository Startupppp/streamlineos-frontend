"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import type { SignFieldType } from "@/types/sign";

interface BuilderState {
  selectedRecipientId: number | null;
  setSelectedRecipientId: (id: number | null) => void;
  selectedFieldId: number | null;
  setSelectedFieldId: (id: number | null) => void;
  placingFieldType: SignFieldType | null;
  setPlacingFieldType: (type: SignFieldType | null) => void;
  currentPage: number;
  setCurrentPage: (page: number) => void;
  selectedDocumentId: number | null;
  setSelectedDocumentId: (id: number | null) => void;
}

const BuilderContext = createContext<BuilderState | null>(null);

export function BuilderProvider({ children }: { children: ReactNode }) {
  const [selectedRecipientId, setSelectedRecipientId] = useState<number | null>(null);
  const [selectedFieldId, setSelectedFieldId] = useState<number | null>(null);
  const [placingFieldType, setPlacingFieldType] = useState<SignFieldType | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedDocumentId, setSelectedDocumentId] = useState<number | null>(null);

  const value = useMemo(
    () => ({
      selectedRecipientId,
      setSelectedRecipientId,
      selectedFieldId,
      setSelectedFieldId,
      placingFieldType,
      setPlacingFieldType,
      currentPage,
      setCurrentPage,
      selectedDocumentId,
      setSelectedDocumentId,
    }),
    [selectedRecipientId, selectedFieldId, placingFieldType, currentPage, selectedDocumentId],
  );

  return <BuilderContext.Provider value={value}>{children}</BuilderContext.Provider>;
}

export function useBuilder(): BuilderState {
  const ctx = useContext(BuilderContext);
  if (!ctx) throw new Error("useBuilder must be used within BuilderProvider");
  return ctx;
}
