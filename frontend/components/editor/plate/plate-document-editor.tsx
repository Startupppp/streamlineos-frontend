'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import ReactDOM from 'react-dom';
import { Plate, PlateContent, usePlateEditor, createPlatePlugin, ParagraphPlugin } from 'platejs/react';
import type { PlateEditor } from 'platejs/react';
import { NodeApi } from 'platejs';
import type { Value, TElement, Path } from 'platejs';
import {
  H1Plugin,
  H2Plugin,
  H3Plugin,
  BlockquotePlugin,
  HorizontalRulePlugin,
  BoldPlugin,
  ItalicPlugin,
  UnderlinePlugin,
  StrikethroughPlugin,
  CodePlugin,
} from '@platejs/basic-nodes/react';
import {
  HeadingRules,
  BlockquoteRules,
  HorizontalRuleRules,
  BoldRules,
  ItalicRules,
  UnderlineRules,
  StrikethroughRules,
  CodeRules,
} from '@platejs/basic-nodes';
import { ListPlugin } from '@platejs/list/react';
import { BulletedListRules, OrderedListRules, TaskListRules } from '@platejs/list';
import { IndentPlugin } from '@platejs/indent/react';
import { CodeBlockPlugin, CodeLinePlugin, CodeSyntaxPlugin } from '@platejs/code-block/react';
import { CodeBlockRules } from '@platejs/code-block';
import { ImagePlugin } from '@platejs/media/react';
import { LinkPlugin } from '@platejs/link/react';
import { TablePlugin, TableRowPlugin, TableCellPlugin, TableCellHeaderPlugin } from '@platejs/table/react';
import { CalloutPlugin } from '@platejs/callout/react';
import { TogglePlugin } from '@platejs/toggle/react';
import { MentionPlugin, MentionInputPlugin } from '@platejs/mention/react';
import { SlashPlugin, SlashInputPlugin } from '@platejs/slash-command/react';
import { createLowlight } from 'lowlight';
import { common } from 'lowlight';
import { EditorPageContext, useEditorPageContext, EditorPageContextValue } from './plate-context';
import { normalizePlateValue, getPlainText } from './plate-value-convert';
import {
  ParagraphElement,
  HeadingElement,
  BlockquoteElement,
  HrElement,
  CodeBlockElement,
  CodeLineElement,
  CodeSyntaxLeaf,
  TableElement,
  TableRowElement,
  TableCellElement,
  TableCellHeaderElement,
  ImageElement,
  LinkElement,
  CalloutElement,
  ToggleElement,
  MentionElement,
  PageLinkElement,
} from './plate-elements';
import { BoldLeaf, ItalicLeaf, UnderlineLeaf, StrikethroughLeaf, CodeLeaf } from './plate-leaves';
import { MentionInputElement, SlashInputElement } from './plate-combobox-elements';

export { EditorPageContext, useEditorPageContext };
export type { EditorPageContextValue };

export interface PlateDocumentEditorProps {
  value?: unknown;
  onChange?: (value: unknown, plainText: string) => void;
  editable?: boolean;
  placeholder?: string;
  fetchMentionUsers?: (q: string) => Promise<Array<{ id: string; label: string }>>;
  fetchPageLinks?: (q: string) => Promise<Array<{ id: number; label: string }>>;
  onNavigateToPage?: (pageId: number) => void;
  contentKey?: string | number;
}

type PageLinkItem = { id: number; label: string };

type PickerState = {
  query: string;
  top: number;
  left: number;
  triggerOffset: number;
  triggerPath: Path;
};

function usePageLinkPicker(
  editor: PlateEditor,
  fetchPageLinks?: (q: string) => Promise<PageLinkItem[]>
) {
  const [picker, setPicker] = useState<PickerState | null>(null);

  const checkTrigger = useCallback(() => {
    const { selection } = editor;
    if (!selection) { setPicker(null); return; }

    const blockEntry = editor.api.block() as [TElement, Path] | undefined;
    if (!blockEntry) { setPicker(null); return; }

    const [blockNode] = blockEntry;
    const cursorOffset = selection.focus.offset;
    const blockText = NodeApi.string(blockNode);
    const textBefore = blockText.slice(0, cursorOffset);

    const match = /\[\[([^\[\]]*)$/.exec(textBefore);
    if (match) {
      const query = match[1] ?? '';
      const domSel = window.getSelection();
      if (!domSel || domSel.rangeCount === 0) return;
      const range = domSel.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      const triggerOffset = cursorOffset - match[0].length;
      setPicker({
        query,
        top: rect.bottom + 4 + window.scrollY,
        left: rect.left + window.scrollX,
        triggerOffset,
        triggerPath: selection.focus.path,
      });
    } else {
      setPicker(null);
    }
  }, [editor]);

  const selectPageLink = useCallback(
    (item: PageLinkItem) => {
      if (!picker) return;
      const { triggerOffset, triggerPath } = picker;
      const anchor = { path: triggerPath, offset: triggerOffset };
      const focus = editor.selection?.focus ?? anchor;
      editor.tf.select({ anchor, focus });
      editor.tf.delete();
      editor.tf.insertNodes({
        type: 'page_link',
        pageId: item.id,
        value: item.label,
        children: [{ text: '' }],
      } as TElement);
      editor.tf.move({ unit: 'offset' });
      setPicker(null);
    },
    [editor, picker]
  );

  const dismissPicker = useCallback(() => setPicker(null), []);

  return { picker, checkTrigger, selectPageLink, dismissPicker };
}

interface PageLinkPickerDropdownProps {
  picker: PickerState;
  fetchPageLinks?: (q: string) => Promise<PageLinkItem[]>;
  onSelect: (item: PageLinkItem) => void;
  onDismiss: () => void;
}

function PageLinkPickerDropdown({ picker, fetchPageLinks, onSelect, onDismiss }: PageLinkPickerDropdownProps) {
  const [items, setItems] = useState<PageLinkItem[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    let cancelled = false;
    fetchPageLinks?.(picker.query)
      .then((r) => { if (!cancelled) { setItems(r); setActiveIndex(0); } })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [picker.query, fetchPageLinks]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'ArrowDown') {
        e.preventDefault(); setActiveIndex((i) => Math.min(i + 1, items.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault(); setActiveIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === 'Enter' && items[activeIndex]) {
        e.preventDefault(); onSelect(items[activeIndex]!);
      } else if (e.key === 'Escape') {
        e.preventDefault(); onDismiss();
      }
    }
    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [items, activeIndex, onSelect, onDismiss]);

  return ReactDOM.createPortal(
    <div
      style={{ position: 'fixed', top: picker.top, left: picker.left, zIndex: 9999 }}
      className="min-w-[200px] max-w-[300px] rounded-md border border-border bg-popover shadow-lg p-1"
    >
      {items.length === 0 ? (
        <div className="px-3 py-2 text-xs text-muted-foreground">
          {picker.query ? 'No pages found' : 'Search pages...'}
        </div>
      ) : items.map((item, idx) => (
        <button
          key={item.id}
          type="button"
          className={`w-full text-left px-3 py-1.5 text-sm rounded-sm ${idx === activeIndex ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/50'}`}
          onMouseDown={(e) => { e.preventDefault(); onSelect(item); }}
        >
          📄 {item.label}
        </button>
      ))}
    </div>,
    document.body
  );
}

const lowlight = createLowlight(common);

function buildPlugins() {
  return [
    ParagraphPlugin.withComponent(ParagraphElement),
    H1Plugin.configure({ inputRules: [HeadingRules.markdown()] }).withComponent(HeadingElement),
    H2Plugin.configure({ inputRules: [HeadingRules.markdown()] }).withComponent(HeadingElement),
    H3Plugin.configure({ inputRules: [HeadingRules.markdown()] }).withComponent(HeadingElement),
    BlockquotePlugin.configure({ inputRules: [BlockquoteRules.markdown()] }).withComponent(BlockquoteElement),
    HorizontalRulePlugin.configure({ inputRules: [HorizontalRuleRules.markdown({ variant: '-' })] }).withComponent(HrElement),
    BoldPlugin.configure({ inputRules: [BoldRules.markdown({ variant: '*' })] }).withComponent(BoldLeaf),
    ItalicPlugin.configure({ inputRules: [ItalicRules.markdown({ variant: '*' })] }).withComponent(ItalicLeaf),
    UnderlinePlugin.withComponent(UnderlineLeaf),
    StrikethroughPlugin.configure({ inputRules: [StrikethroughRules.markdown()] }).withComponent(StrikethroughLeaf),
    CodePlugin.configure({ inputRules: [CodeRules.markdown()] }).withComponent(CodeLeaf),
    IndentPlugin,
    ListPlugin.configure({
      inputRules: [
        BulletedListRules.markdown({ variant: '-' }),
        OrderedListRules.markdown({ variant: '.' }),
        TaskListRules.markdown({ checked: false }),
      ],
    }),
    CodeBlockPlugin.configure({
      options: { lowlight },
      inputRules: [CodeBlockRules.markdown({ on: 'match' })],
    }).withComponent(CodeBlockElement),
    CodeLinePlugin.withComponent(CodeLineElement),
    CodeSyntaxPlugin.withComponent(CodeSyntaxLeaf),
    ImagePlugin.withComponent(ImageElement),
    LinkPlugin.withComponent(LinkElement),
    TablePlugin.withComponent(TableElement),
    TableRowPlugin.withComponent(TableRowElement),
    TableCellPlugin.withComponent(TableCellElement),
    TableCellHeaderPlugin.withComponent(TableCellHeaderElement),
    CalloutPlugin.withComponent(CalloutElement),
    TogglePlugin.withComponent(ToggleElement),
    MentionPlugin.configure({ options: { trigger: '@', triggerPreviousCharPattern: /^\s?$/ } }).withComponent(MentionElement),
    MentionInputPlugin.withComponent(MentionInputElement),
    createPlatePlugin({
      key: 'page_link',
      node: { isElement: true, isInline: true, isVoid: true },
    }).withComponent(PageLinkElement),
    SlashPlugin.configure({ options: { trigger: '/', triggerPreviousCharPattern: /^\s?$/ } }),
    SlashInputPlugin.withComponent(SlashInputElement),
  ];
}

export default function PlateDocumentEditor({
  value,
  onChange,
  editable = true,
  placeholder = 'Start writing...',
  fetchMentionUsers,
  fetchPageLinks,
  onNavigateToPage,
  contentKey,
}: PlateDocumentEditorProps) {
  const initialValue = useMemo(() => normalizePlateValue(value), []);

  const editor = usePlateEditor({
    plugins: buildPlugins(),
    value: initialValue,
  });

  const prevKeyRef = useRef<string | number | undefined>(contentKey);

  useEffect(() => {
    if (prevKeyRef.current !== contentKey && contentKey !== undefined) {
      prevKeyRef.current = contentKey;
      const next = normalizePlateValue(value);
      editor.tf.reset();
      editor.tf.insertNodes(next);
    }
  }, [contentKey]);

  const { picker, checkTrigger, selectPageLink, dismissPicker } = usePageLinkPicker(editor, fetchPageLinks);

  function handleChange({ value: v }: { value: Value }) {
    const plainText = getPlainText(v);
    onChange?.(v, plainText);
    setTimeout(checkTrigger, 0);
  }

  const contextValue = useMemo<EditorPageContextValue>(
    () => ({ fetchMentionUsers, fetchPageLinks, onNavigateToPage }),
    [fetchMentionUsers, fetchPageLinks, onNavigateToPage]
  );

  return (
    <EditorPageContext.Provider value={contextValue}>
      <Plate editor={editor} onChange={handleChange}>
        <PlateContent
          placeholder={placeholder}
          readOnly={!editable}
          className="plate-editor min-h-[150px] outline-none px-1 py-2"
        />
        {picker && (
          <PageLinkPickerDropdown
            picker={picker}
            fetchPageLinks={fetchPageLinks}
            onSelect={selectPageLink}
            onDismiss={dismissPicker}
          />
        )}
      </Plate>
    </EditorPageContext.Provider>
  );
}
