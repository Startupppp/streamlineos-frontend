'use client';

import { List, ListOrdered, CheckSquare, Outdent, Indent } from 'lucide-react';
import { useEditorRef } from 'platejs/react';
import type { TElement } from 'platejs';
import { ToolbarButton } from './toolbar-button';

export function ListButtons() {
  const editor = useEditorRef();

  function setListType(listStyleType: string) {
    const block = editor.api.block() ?? editor.api.block({ at: [0] });
    if (!block) return;
    const [, path] = block;
    editor.tf.setNodes(
      { type: 'p', listStyleType, indent: 1 } as Partial<TElement>,
      { at: path },
    );
    editor.tf.focus();
  }

  function handleBullet() {
    setListType('disc');
  }

  function handleOrdered() {
    setListType('decimal');
  }

  function handleTodo() {
    setListType('todo');
  }

  function handleOutdent() {
    const block = editor.api.block();
    if (!block) return;
    const [node, path] = block;
    const currentIndent =
      typeof (node as TElement)['indent'] === 'number'
        ? (node as TElement)['indent'] as number
        : 1;
    if (currentIndent <= 1) {
      editor.tf.setNodes(
        { indent: undefined, listStyleType: undefined } as Partial<TElement>,
        { at: path },
      );
    } else {
      editor.tf.setNodes(
        { indent: currentIndent - 1 } as Partial<TElement>,
        { at: path },
      );
    }
  }

  function handleIndent() {
    const block = editor.api.block();
    if (!block) return;
    const [node, path] = block;
    const currentIndent =
      typeof (node as TElement)['indent'] === 'number'
        ? (node as TElement)['indent'] as number
        : 0;
    editor.tf.setNodes(
      { indent: currentIndent + 1 } as Partial<TElement>,
      { at: path },
    );
  }

  return (
    <>
      <ToolbarButton tooltip="Bullet list" onClick={handleBullet}>
        <List className="size-4" />
      </ToolbarButton>
      <ToolbarButton tooltip="Numbered list" onClick={handleOrdered}>
        <ListOrdered className="size-4" />
      </ToolbarButton>
      <ToolbarButton tooltip="To-do list" onClick={handleTodo}>
        <CheckSquare className="size-4" />
      </ToolbarButton>
      <ToolbarButton tooltip="Outdent" onClick={handleOutdent}>
        <Outdent className="size-4" />
      </ToolbarButton>
      <ToolbarButton tooltip="Indent" onClick={handleIndent}>
        <Indent className="size-4" />
      </ToolbarButton>
    </>
  );
}
