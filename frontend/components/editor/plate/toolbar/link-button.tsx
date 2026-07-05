'use client';

import React from 'react';
import { Link } from 'lucide-react';
import { useEditorRef } from 'platejs/react';
import { triggerFloatingLink } from '@platejs/link';
import { ToolbarButton } from './toolbar-button';

export function LinkButton() {
  const editor = useEditorRef();

  function handleClick() {
    triggerFloatingLink(editor, { focused: true });
  }

  return (
    <ToolbarButton tooltip="Insert link" onClick={handleClick} aria-label="Insert link">
      <Link className="size-4" />
    </ToolbarButton>
  );
}
