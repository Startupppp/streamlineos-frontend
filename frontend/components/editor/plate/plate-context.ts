'use client';

import { createContext, useContext } from 'react';

export interface EditorPageContextValue {
  fetchMentionUsers?: (q: string) => Promise<Array<{ id: string; label: string }>>;
  fetchPageLinks?: (q: string) => Promise<Array<{ id: number; label: string }>>;
  onNavigateToPage?: (pageId: number) => void;
}

export const EditorPageContext = createContext<EditorPageContextValue>({});

export function useEditorPageContext(): EditorPageContextValue {
  return useContext(EditorPageContext);
}
