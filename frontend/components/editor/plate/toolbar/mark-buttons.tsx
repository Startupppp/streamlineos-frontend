'use client';

import React from 'react';
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Code,
} from 'lucide-react';
import {
  useMarkToolbarButtonState,
  useMarkToolbarButton,
} from 'platejs/react';
import { ToolbarButton } from './toolbar-button';

function MarkButton({
  nodeType,
  tooltip,
  children,
}: {
  nodeType: string;
  tooltip: string;
  children: React.ReactNode;
}) {
  const state = useMarkToolbarButtonState({ nodeType });
  const { props } = useMarkToolbarButton(state);
  return (
    <ToolbarButton
      tooltip={tooltip}
      isActive={props.pressed}
      onClick={props.onClick}
      aria-label={tooltip}
    >
      {children}
    </ToolbarButton>
  );
}

export function MarkButtons() {
  return (
    <>
      <MarkButton nodeType="bold" tooltip="Bold">
        <Bold className="size-4" />
      </MarkButton>
      <MarkButton nodeType="italic" tooltip="Italic">
        <Italic className="size-4" />
      </MarkButton>
      <MarkButton nodeType="underline" tooltip="Underline">
        <Underline className="size-4" />
      </MarkButton>
      <MarkButton nodeType="strikethrough" tooltip="Strikethrough">
        <Strikethrough className="size-4" />
      </MarkButton>
      <MarkButton nodeType="code" tooltip="Inline code">
        <Code className="size-4" />
      </MarkButton>
    </>
  );
}
