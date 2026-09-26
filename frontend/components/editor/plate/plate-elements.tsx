'use client';

import React from 'react';
import Image from 'next/image';
import { PlateElement, PlateLeaf, useEditorRef, useReadOnly } from 'platejs/react';
import type { PlateElementProps, PlateLeafProps } from 'platejs/react';
import type { TElement } from 'platejs';
import { useTodoListElement, useTodoListElementState } from '@platejs/list/react';
import { useLinkPreview } from '@/hooks/api/chat-entities';
import { useEditorPageContext } from './plate-context';
import {
  citationSourceState,
  linkPreviewDisplayTitle,
  linkPreviewHasMeta,
} from './plate-citation-link-model';
import {
  LIST_STYLE_DECIMAL,
  LIST_STYLE_DISC,
  LIST_STYLE_TODO,
  isListItemChecked,
  listOrdinalLabel,
  listPaddingRem,
  listStyleTypeOf,
} from './plate-list-model';
import { activationProps } from '@/lib/keyboard-activation';

type ListElement = TElement & { listStyleType?: string; indent?: number; checked?: boolean; textAlign?: string };

export function ParagraphElement({ element, children, ...props }: PlateElementProps) {
  const el = element as ListElement;
  const readOnly = useReadOnly();
  const listStyle = listStyleTypeOf(element);

  if (listStyle === LIST_STYLE_DISC || listStyle === LIST_STYLE_DECIMAL) {
    const marker =
      listStyle === LIST_STYLE_DECIMAL ? listOrdinalLabel(element) : '•';
    return (
      <PlateElement
        {...props}
        element={element}
        as="div"
        className="flex items-start my-0.5 leading-7"
        style={{ paddingLeft: listPaddingRem(element) }}
      >
        <span
          className="mr-2 shrink-0 mt-1 text-foreground tabular-nums"
          contentEditable={false}
        >
          {marker}
        </span>
        <span className="flex-1 min-w-0">{children}</span>
      </PlateElement>
    );
  }

  if (listStyle === LIST_STYLE_TODO) {
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
  const checked = checkboxProps.checked ?? isListItemChecked(element);

  function handleCheckedChange(e: React.ChangeEvent<HTMLInputElement>) {
    checkboxProps.onCheckedChange(e.target.checked);
  }

  return (
    <PlateElement
      {...props}
      element={element}
      as="div"
      className="flex items-start my-0.5 leading-7"
      style={{ paddingLeft: listPaddingRem(element) }}
    >
      <span className="mr-2 shrink-0 mt-1" contentEditable={false}>
        <input
          type="checkbox"
          aria-label="Toggle task item"
          checked={checked}
          onChange={handleCheckedChange}
          onMouseDown={checkboxProps.onMouseDown}
          disabled={readOnly}
          className="cursor-pointer accent-primary"
        />
      </span>
      <span className={`flex-1 min-w-0 ${checked ? 'line-through text-muted-foreground' : ''}`}>
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

export function LinkElement({ element, children, ...props }: PlateElementProps) {
  return (
    <PlateElement {...props} element={element}>
      <a
        href={element['url'] as string}
        className="text-primary hover:text-primary/80 underline underline-offset-2 cursor-pointer"
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

export function CitationElement({ element, children, ...props }: PlateElementProps) {
  const editor = useEditorRef();
  const sourceTitle = (element['sourceTitle'] as string | null) ?? null;
  const sourceUrl = (element['sourceUrl'] as string | null) ?? null;
  const state = citationSourceState(sourceTitle, sourceUrl);

  function handleEditSource(e: React.MouseEvent<HTMLButtonElement>) {
    e.preventDefault();
    const nextTitle = window.prompt('Source title:', sourceTitle ?? '');
    if (nextTitle === null) return;
    const nextUrl = window.prompt('Source URL (optional):', sourceUrl ?? '');
    const path = editor.api.findPath(element);
    if (!path) return;
    editor.tf.setNodes(
      { sourceTitle: nextTitle || null, sourceUrl: nextUrl || null } as Partial<TElement>,
      { at: path },
    );
  }

  return (
    <PlateElement
      {...props}
      element={element}
      className="my-3 rounded-lg border-l-4 border-primary/40 bg-muted/30 pl-4 pr-3 py-3"
    >
      <div className="text-sm italic text-foreground">{children}</div>
      <div
        contentEditable={false}
        className="mt-2 flex items-center gap-2 text-xs text-muted-foreground"
      >
        {state.hasSource ? (
          sourceUrl ? (
            <a
              href={sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-foreground"
            >
              {state.display}
            </a>
          ) : (
            <span>{state.display}</span>
          )
        ) : (
          <span className="italic">No source</span>
        )}
        <button
          type="button"
          onMouseDown={handleEditSource}
          className="font-medium text-primary hover:underline"
        >
          {state.buttonLabel}
        </button>
      </div>
    </PlateElement>
  );
}

export function LinkPreviewElement({ element, children, ...props }: PlateElementProps) {
  const url = (element['url'] as string | null) ?? null;
  const { data, isLoading } = useLinkPreview(url);
  const hasMeta = linkPreviewHasMeta(data);
  const displayTitle = linkPreviewDisplayTitle(data, url);

  return (
    <PlateElement {...props} element={element} className="my-3">
      <a
        href={url ?? undefined}
        target="_blank"
        rel="noopener noreferrer"
        contentEditable={false}
        className="flex max-w-[420px] gap-3 overflow-hidden rounded-xl border border-border transition-colors hover:bg-muted/40"
      >
        {data?.image && (
          <Image
            src={data.image}
            alt={data.title ?? ''}
            width={64}
            height={64}
            unoptimized
            className="h-16 w-16 shrink-0 object-cover"
          />
        )}
        <div className="min-w-0 flex-1 p-2.5">
          {isLoading && (
            <span className="text-xs text-muted-foreground">Loading preview…</span>
          )}
          {!isLoading && data?.siteName && (
            <p className="truncate text-xs font-medium text-muted-foreground">{data.siteName}</p>
          )}
          {!isLoading && (
            <p className="truncate text-sm font-semibold text-foreground">
              {displayTitle}
            </p>
          )}
          {!isLoading && data?.description && (
            <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
              {data.description}
            </p>
          )}
          {!isLoading && !hasMeta && (
            <p className="text-xs text-muted-foreground">No preview available</p>
          )}
        </div>
      </a>
      {children}
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
      className="inline-flex items-center rounded bg-primary/10 border border-primary/30 px-1.5 py-0.5 text-xs font-medium text-foreground select-none mx-0.5"
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
        className="inline-flex items-center rounded border border-border bg-muted/50 px-1.5 py-0.5 text-xs font-medium text-foreground cursor-pointer hover:bg-muted select-none mx-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        {...activationProps(handleClick, `Open page ${value}`)}
      >
        📄 {value}
        {children}
      </span>
    </PlateElement>
  );
}
