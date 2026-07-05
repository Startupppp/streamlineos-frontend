'use client';

import React from 'react';
import { Undo2, Redo2 } from 'lucide-react';
import { useEditorRef } from 'platejs/react';
import { ToolbarButton } from './toolbar-button';

function useHistoryButtons() {
  const editor = useEditorRef();
  function handleUndo() {
    editor.undo();
  }
  function handleRedo() {
    editor.redo();
  }
  return { handleUndo, handleRedo };
}

export function HistoryButtons() {
  const { handleUndo, handleRedo } = useHistoryButtons();
  return (
    <>
      <ToolbarButton tooltip="Undo" onClick={handleUndo} aria-label="Undo">
        <Undo2 className="size-4" />
      </ToolbarButton>
      <ToolbarButton tooltip="Redo" onClick={handleRedo} aria-label="Redo">
        <Redo2 className="size-4" />
      </ToolbarButton>
    </>
  );
}
