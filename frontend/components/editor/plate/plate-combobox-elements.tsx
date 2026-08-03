'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { PlateElement, useEditorRef } from 'platejs/react';
import type { PlateElementProps, PlateEditor } from 'platejs/react';
import { NodeApi } from 'platejs';
import type { TElement, Path } from 'platejs';
import { getMentionOnSelectItem } from '@platejs/mention';
import emojiData from '@emoji-mart/data';
import type { EmojiMartData } from '@emoji-mart/data';
import { useEditorPageContext } from './plate-context';

type EmojiItem = { id: string; native: string; name: string };

const EMOJI_LIST: EmojiItem[] = Object.values((emojiData as EmojiMartData).emojis)
  .map((e) => ({ id: e.id, native: e.skins[0]?.native ?? '', name: e.name }))
  .filter((e) => e.native.length > 0);

type UserItem = { id: string; label: string };
type CommandItem = { key: string; label: string; description: string };

const SLASH_COMMANDS: CommandItem[] = [
  { key: 'p', label: 'Text', description: 'Plain text paragraph' },
  { key: 'h1', label: 'Heading 1', description: 'Large header' },
  { key: 'h2', label: 'Heading 2', description: 'Medium header' },
  { key: 'h3', label: 'Heading 3', description: 'Small header' },
  { key: 'ul', label: 'Bullet List', description: 'Bulleted list item' },
  { key: 'ol', label: 'Numbered List', description: 'Numbered list item' },
  { key: 'todo', label: 'To-do List', description: 'Checkable list item' },
  { key: 'blockquote', label: 'Quote', description: 'Block quotation' },
  { key: 'code_block', label: 'Code', description: 'Code block' },
  { key: 'callout', label: 'Callout', description: 'Highlighted callout' },
  { key: 'hr', label: 'Divider', description: 'Horizontal rule' },
  { key: 'table', label: 'Table', description: 'Table with rows and columns' },
  { key: 'img', label: 'Image', description: 'Image from URL' },
  { key: 'toggle', label: 'Toggle', description: 'Collapsible section' },
];

function applySlashCommand(editor: PlateEditor, key: string, path: Path) {
  const blockEntry = editor.api.above({ at: path, match: { type: 'p' } }) as [TElement, Path] | undefined;
  if (!blockEntry) return;
  const [, blockPath] = blockEntry;

  editor.tf.removeNodes({ at: path });

  const nextPath = [...blockPath.slice(0, -1), blockPath[blockPath.length - 1]! + 1];

  switch (key) {
    case 'h1':
    case 'h2':
    case 'h3':
      editor.tf.setNodes({ type: key }, { at: blockPath });
      break;
    case 'blockquote':
      editor.tf.setNodes({ type: 'blockquote' }, { at: blockPath });
      break;
    case 'ul':
      editor.tf.setNodes({ listStyleType: 'disc', indent: 1 } as Partial<TElement>, { at: blockPath });
      break;
    case 'ol':
      editor.tf.setNodes({ listStyleType: 'decimal', indent: 1 } as Partial<TElement>, { at: blockPath });
      break;
    case 'todo':
      editor.tf.setNodes({ listStyleType: 'todo', indent: 1, checked: false } as Partial<TElement>, { at: blockPath });
      break;
    case 'code_block':
      editor.tf.setNodes({ type: 'code_block' }, { at: blockPath });
      editor.tf.setNodes({ type: 'code_line' }, { at: [...blockPath, 0] });
      break;
    case 'callout':
      editor.tf.setNodes({ type: 'callout', icon: '💡' } as Partial<TElement>, { at: blockPath });
      break;
    case 'hr':
      editor.tf.setNodes({ type: 'hr' }, { at: blockPath });
      break;
    case 'table':
      editor.tf.insertNodes(
        {
          type: 'table',
          children: [
            { type: 'tr', children: [
              { type: 'th', children: [{ type: 'p', children: [{ text: '' }] }] },
              { type: 'th', children: [{ type: 'p', children: [{ text: '' }] }] },
            ] },
            { type: 'tr', children: [
              { type: 'td', children: [{ type: 'p', children: [{ text: '' }] }] },
              { type: 'td', children: [{ type: 'p', children: [{ text: '' }] }] },
            ] },
          ],
        } as TElement,
        { at: blockPath }
      );
      editor.tf.removeNodes({ at: nextPath });
      break;
    case 'img': {
      const url = window.prompt('Image URL:');
      if (url) {
        editor.tf.insertNodes(
          { type: 'img', url, children: [{ text: '' }] } as TElement,
          { at: blockPath }
        );
        editor.tf.removeNodes({ at: nextPath });
      }
      break;
    }
    case 'toggle':
      editor.tf.setNodes({ type: 'toggle' }, { at: blockPath });
      break;
    default:
      editor.tf.setNodes({ type: 'p' }, { at: blockPath });
  }
}

export function MentionInputElement({ element, children, ...props }: PlateElementProps) {
  const editor = useEditorRef();
  const { fetchMentionUsers } = useEditorPageContext();
  const spanRef = useRef<HTMLSpanElement>(null);
  const query = NodeApi.string(element);
  const [items, setItems] = useState<UserItem[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    if (spanRef.current) setRect(spanRef.current.getBoundingClientRect());
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (fetchMentionUsers) {
      fetchMentionUsers(query)
        .then((results) => { if (!cancelled) { setItems(results); setActiveIndex(0); } })
        .catch(() => {});
    }
    return () => { cancelled = true; };
  }, [query, fetchMentionUsers]);

  const handleSelect = useCallback((item: UserItem) => {
    getMentionOnSelectItem()(editor, { text: item.label, key: item.id }, query);
  }, [editor, query]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'ArrowDown') {
        e.preventDefault(); e.stopPropagation();
        setActiveIndex((i) => Math.min(i + 1, items.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault(); e.stopPropagation();
        setActiveIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === 'Enter' && items[activeIndex]) {
        e.preventDefault(); e.stopPropagation();
        handleSelect(items[activeIndex]!);
      }
    }
    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [items, activeIndex, handleSelect]);

  return (
    <PlateElement {...props} element={element} as="span">
      <span ref={spanRef} className="text-primary">@{children}</span>
      {rect && ReactDOM.createPortal(
        <div
          style={{ position: 'fixed', top: rect.bottom + 4, left: rect.left, zIndex: 9999 }}
          className="min-w-[200px] max-w-[280px] rounded-md border border-border bg-popover shadow-lg p-1"
        >
          {items.length === 0 ? (
            <div className="px-3 py-2 text-xs text-muted-foreground">No users found</div>
          ) : items.map((item, idx) => (
            <button
              key={item.id}
              type="button"
              className={`w-full text-left px-3 py-1.5 text-sm rounded-sm ${idx === activeIndex ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/50'}`}
              onMouseDown={(e) => { e.preventDefault(); handleSelect(item); }}
            >
              @{item.label}
            </button>
          ))}
        </div>,
        document.body
      )}
    </PlateElement>
  );
}

export function SlashInputElement({ element, children, ...props }: PlateElementProps) {
  const editor = useEditorRef();
  const spanRef = useRef<HTMLSpanElement>(null);
  const query = NodeApi.string(element);
  const [activeIndex, setActiveIndex] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [prevQuery, setPrevQuery] = useState(query);
  if (query !== prevQuery) { setPrevQuery(query); setActiveIndex(0); }

  const filtered = query
    ? SLASH_COMMANDS.filter(
        (c) =>
          c.label.toLowerCase().includes(query.toLowerCase()) ||
          c.description.toLowerCase().includes(query.toLowerCase())
      )
    : SLASH_COMMANDS;

  useEffect(() => {
    if (spanRef.current) setRect(spanRef.current.getBoundingClientRect());
  }, []);

  const handleSelect = useCallback((cmd: CommandItem) => {
    const path = editor.selection?.focus.path;
    if (!path) return;
    applySlashCommand(editor, cmd.key, path);
  }, [editor]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'ArrowDown') {
        e.preventDefault(); e.stopPropagation();
        setActiveIndex((i) => Math.min(i + 1, filtered.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault(); e.stopPropagation();
        setActiveIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === 'Enter' && filtered[activeIndex]) {
        e.preventDefault(); e.stopPropagation();
        handleSelect(filtered[activeIndex]!);
      }
    }
    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [filtered, activeIndex, handleSelect]);

  return (
    <PlateElement {...props} element={element} as="span">
      <span ref={spanRef} className="text-muted-foreground">/{children}</span>
      {rect && ReactDOM.createPortal(
        <div
          style={{ position: 'fixed', top: rect.bottom + 4, left: rect.left, zIndex: 9999 }}
          className="min-w-[220px] max-w-[320px] rounded-md border border-border bg-popover shadow-lg p-1 max-h-[320px] overflow-y-auto"
        >
          {filtered.length === 0 ? (
            <div className="px-3 py-2 text-xs text-muted-foreground">No commands found</div>
          ) : filtered.map((cmd, idx) => (
            <button
              key={cmd.key}
              type="button"
              className={`w-full text-left px-3 py-2 text-sm rounded-sm flex flex-col gap-0.5 ${idx === activeIndex ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/50'}`}
              onMouseDown={(e) => { e.preventDefault(); handleSelect(cmd); }}
            >
              <span className="font-medium">{cmd.label}</span>
              <span className="text-xs text-muted-foreground">{cmd.description}</span>
            </button>
          ))}
        </div>,
        document.body
      )}
    </PlateElement>
  );
}

export function EmojiInputElement({ element, children, ...props }: PlateElementProps) {
  const editor = useEditorRef();
  const spanRef = useRef<HTMLSpanElement>(null);
  const query = NodeApi.string(element).toLowerCase();
  const [activeIndex, setActiveIndex] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [prevQuery, setPrevQuery] = useState(query);
  if (query !== prevQuery) { setPrevQuery(query); setActiveIndex(0); }

  const filtered = (
    query
      ? EMOJI_LIST.filter((e) => e.id.includes(query) || e.name.toLowerCase().includes(query))
      : EMOJI_LIST
  ).slice(0, 36);

  useEffect(() => {
    if (spanRef.current) setRect(spanRef.current.getBoundingClientRect());
  }, []);

  const handleSelect = useCallback((item: EmojiItem) => {
    const path = editor.api.findPath(element);
    if (!path) return;
    editor.tf.removeNodes({ at: path });
    editor.tf.insertText(item.native);
    editor.tf.focus();
  }, [editor, element]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'ArrowDown') {
        e.preventDefault(); e.stopPropagation();
        setActiveIndex((i) => Math.min(i + 1, filtered.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault(); e.stopPropagation();
        setActiveIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === 'Enter' && filtered[activeIndex]) {
        e.preventDefault(); e.stopPropagation();
        handleSelect(filtered[activeIndex]!);
      }
    }
    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [filtered, activeIndex, handleSelect]);

  return (
    <PlateElement {...props} element={element} as="span">
      <span ref={spanRef} className="text-muted-foreground">:{children}</span>
      {rect && ReactDOM.createPortal(
        <div
          style={{ position: 'fixed', top: rect.bottom + 4, left: rect.left, zIndex: 9999 }}
          className="w-[288px] rounded-md border border-border bg-popover shadow-lg p-1 max-h-[240px] overflow-y-auto"
        >
          {filtered.length === 0 ? (
            <div className="px-3 py-2 text-xs text-muted-foreground">No emojis found</div>
          ) : (
            <div className="grid grid-cols-8 gap-0.5">
              {filtered.map((item, idx) => (
                <button
                  key={item.id}
                  type="button"
                  aria-label={item.name}
                  className={`flex size-8 items-center justify-center rounded text-lg ${idx === activeIndex ? 'bg-accent' : 'hover:bg-accent/50'}`}
                  onMouseDown={(e) => { e.preventDefault(); handleSelect(item); }}
                >
                  {item.native}
                </button>
              ))}
            </div>
          )}
        </div>,
        document.body
      )}
    </PlateElement>
  );
}
