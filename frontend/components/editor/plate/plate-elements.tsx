'use client';

import React from 'react';
import Image from 'next/image';
import { PlateElement, PlateLeaf, useReadOnly } from 'platejs/react';
import type { PlateElementProps, PlateLeafProps } from 'platejs/react';
import type { TElement } from 'platejs';
import { useTodoListElement, useTodoListElementState } from '@platejs/list/react';
import { useEditorPageContext } from './plate-context';

type ListElement = TElement & { listStyleType?: string; indent?: number; checked?: boolean; textAlign?: string };

export function ParagraphElement({ element, children, ...props }: PlateElementProps) {
  const el = element as ListElement;
  const readOnly = useReadOnly();
  const todoState = useTodoListElementState({ element: el });
  useTodoListElement(todoState);

  if (el.listStyleType === 'disc') {
    return (
      <PlateElement
        {...props}
        element={element}
        as="div"
        className="flex items-start my-0.5 leading-7"
        style={{ paddingLeft: `${(el.indent ?? 1) * 1.5}rem` }}
      >
        <span className="mr-2 shrink-0 mt-1 text-foreground" contentEditable={false}>•</span>
        <span className="flex-1 min-w-0">{children}</span>
      </PlateElement>
    );
  }

  if (el.listStyleType === 'decimal') {
    return (
      <PlateElement
        {...props}
        element={element}
        as="div"
        className="flex items-start my-0.5 leading-7"
        style={{ paddingLeft: `${(el.indent ?? 1) * 1.5}rem` }}
      >
        <span className="mr-2 shrink-0 mt-1 text-foreground tabular-nums" contentEditable={false}>1.</span>
        <span className="flex-1 min-w-0">{children}</span>
      </PlateElement>
    );
  }

  if (el.listStyleType === 'todo') {
    return (
      <TodoListItemElement {...props} element={element} readOnly={readOnly}>
        {children}
      </TodoListItemElement>
    );
  }

  const style: React.CSSProperties = {};
  if (el.textAlign) style.textAlign = el.textAlign as React.CSSProperties['textAlign'];
  if (typeof el.indent === 'number') style.marginLeft = `${el.indent * 24}px`;
  return (
    <PlateElement {...props} element={element} as="p" className="my-1 leading-7" style={style}>
      {children}
    </PlateElement>
  );
}

function TodoListItemElement({
  element,
  children,
  readOnly,
  ...props
}: PlateElementProps & { readOnly: boolean }) {
  const el = element as ListElement;
  const state = useTodoListElementState({ element: el });
  const { checkboxProps } = useTodoListElement(state);

  function handleCheckedChange(e: React.ChangeEvent<HTMLInputElement>) {
    checkboxProps.onCheckedChange(e.target.checked);
  }

  return (
    <PlateElement
      {...props}
      element={element}
      as="div"
      className="flex items-start my-0.5 leading-7"
      style={{ paddingLeft: `${(el.indent ?? 1) * 1.5}rem` }}
    >
      <span className="mr-2 shrink-0 mt-1" contentEditable={false}>
        <input
          type="checkbox"
          checked={checkboxProps.checked ?? false}
          onChange={handleCheckedChange}
          onMouseDown={checkboxProps.onMouseDown}
          disabled={readOnly}
          className="cursor-pointer accent-primary"
        />
      </span>
      <span className={`flex-1 min-w-0 ${checkboxProps.checked ? 'line-through text-muted-foreground' : ''}`}>
        {children}
      </span>
    </PlateElement>
  );
}

export function HeadingElement({ element, children, ...props }: PlateElementProps) {
  const tag = element.type as 'h1' | 'h2' | 'h3';
  const styles: Record<string, string> = {
    h1: 'text-3xl font-bold tracking-tight mt-6 mb-2',
    h2: 'text-2xl font-semibold tracking-tight mt-5 mb-2',
    h3: 'text-xl font-semibold mt-4 mb-1',
  };
  const el = element as ListElement;
  const style: React.CSSProperties = {};
  if (el.textAlign) style.textAlign = el.textAlign as React.CSSProperties['textAlign'];
  if (typeof el.indent === 'number') style.marginLeft = `${el.indent * 24}px`;
  return (
    <PlateElement {...props} element={element} as={tag} className={styles[tag] ?? styles['h3']!} style={style}>
      {children}
    </PlateElement>
  );
}

export function BlockquoteElement({ element, children, ...props }: PlateElementProps) {
  return (
    <PlateElement
      {...props}
      element={element}
      as="blockquote"
      className="border-l-4 border-border pl-4 italic text-muted-foreground my-3"
    >
      {children}
    </PlateElement>
  );
}

export function HrElement({ element, children, ...props }: PlateElementProps) {
  return (
    <PlateElement {...props} element={element}>
      <hr className="border-border my-4" contentEditable={false} />
      {children}
    </PlateElement>
  );
}

export function CodeBlockElement({ element, children, ...props }: PlateElementProps) {
  return (
    <PlateElement
      {...props}
      element={element}
      as="pre"
      className="bg-muted border border-border rounded-md p-4 my-3 overflow-x-auto font-mono text-sm leading-relaxed"
    >
      {children}
    </PlateElement>
  );
}

export function CodeLineElement({ element, children, ...props }: PlateElementProps) {
  return (
    <PlateElement {...props} element={element} as="div">
      {children}
    </PlateElement>
  );
}

export function CodeSyntaxLeaf({ children, ...props }: PlateLeafProps) {
  const token = (props.leaf as Record<string, unknown>)['token'] as string | undefined;
  return (
    <PlateLeaf {...props}>
      <span className={token ? `hljs-${token}` : ''}>{children}</span>
    </PlateLeaf>
  );
}

export function TableElement({ element, children, ...props }: PlateElementProps) {
  return (
    <PlateElement {...props} element={element} as="table" className="w-full border-collapse my-4 text-sm">
      <tbody>{children}</tbody>
    </PlateElement>
  );
}

export function TableRowElement({ element, children, ...props }: PlateElementProps) {
  return (
    <PlateElement {...props} element={element} as="tr">
      {children}
    </PlateElement>
  );
}

export function TableCellElement({ element, children, ...props }: PlateElementProps) {
  return (
    <PlateElement
      {...props}
      element={element}
      as="td"
      className="border border-border px-3 py-2 align-top"
    >
      {children}
    </PlateElement>
  );
}

export function TableCellHeaderElement({ element, children, ...props }: PlateElementProps) {
  return (
    <PlateElement
      {...props}
      element={element}
      as="th"
      className="border border-border px-3 py-2 align-top bg-muted font-semibold text-left"
    >
      {children}
    </PlateElement>
  );
}

export function ImageElement({ element, children, ...props }: PlateElementProps) {
  const url = element['url'] as string | undefined;
  return (
    <PlateElement {...props} element={element} className="my-3">
      {url ? (
        <Image
          src={url}
          alt=""
          unoptimized
          width={800}
          height={600}
          style={{ width: '100%', height: 'auto' }}
          className="rounded-md border border-border"
          contentEditable={false}
        />
      ) : (
        <div
          className="border-2 border-dashed border-border rounded-md p-8 text-center text-muted-foreground text-sm"
          contentEditable={false}
        >
          No image URL
        </div>
      )}
      {children}
    </PlateElement>
  );
}

export function LinkElement({ element, children, ...props }: PlateElementProps) {
  return (
    <PlateElement {...props} element={element}>
      <a
        href={element['url'] as string}
        className="text-blue-600 dark:text-blue-400 underline underline-offset-2 cursor-pointer"
      >
        {children}
      </a>
    </PlateElement>
  );
}

export function CalloutElement({ element, children, ...props }: PlateElementProps) {
  const icon = (element['icon'] as string | undefined) ?? '💡';
  return (
    <PlateElement
      {...props}
      element={element}
      className="flex gap-3 rounded-lg border border-border bg-muted px-4 py-3 my-3"
    >
      <span className="text-lg shrink-0 mt-0.5" contentEditable={false}>{icon}</span>
      <div className="flex-1 min-w-0">{children}</div>
    </PlateElement>
  );
}

export function ToggleElement({ element, children, ...props }: PlateElementProps) {
  return (
    <PlateElement {...props} element={element} className="my-1">
      {children}
    </PlateElement>
  );
}

export function MentionElement({ element, children, ...props }: PlateElementProps) {
  const value = element['value'] as string;
  return (
    <PlateElement
      {...props}
      element={element}
      as="span"
      className="inline-flex items-center rounded bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 px-1.5 py-0.5 text-xs font-medium text-blue-700 dark:text-blue-300 select-none mx-0.5"
    >
      @{value}
      {children}
    </PlateElement>
  );
}

export function PageLinkElement({ element, children, ...props }: PlateElementProps) {
  const { onNavigateToPage } = useEditorPageContext();
  const pageId = element['pageId'] as number;
  const value = element['value'] as string;

  function handleClick() {
    onNavigateToPage?.(pageId);
  }

  return (
    <PlateElement {...props} element={element}>
      <span
        className="inline-flex items-center rounded border border-border bg-muted/50 px-1.5 py-0.5 text-xs font-medium text-foreground cursor-pointer hover:bg-muted select-none mx-0.5"
        onClick={handleClick}
      >
        📄 {value}
        {children}
      </span>
    </PlateElement>
  );
}
