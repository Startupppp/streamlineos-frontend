'use client';

import { NodeApi } from 'platejs';
import type { Value, TNode, TElement } from 'platejs';

type TiptapNode = { type?: string; content?: TiptapNode[]; text?: string };

const MEDIA_NODE_TYPES = new Set(['img', 'video', 'audio', 'file', 'placeholder']);

function tiptapText(node: TiptapNode): string {
  if (node.text) return node.text;
  if (!node.content) return '';
  return node.content.map(tiptapText).join('');
}

function nodeToText(node: TNode): string {
  const el = node as TElement;
  if (typeof el.type === 'string' && MEDIA_NODE_TYPES.has(el.type)) {
    return typeof el.name === 'string' ? el.name : '';
  }
  return NodeApi.string(node);
}

export function normalizePlateValue(value: unknown): Value {
  if (Array.isArray(value) && value.length > 0) {
    return value as Value;
  }
  if (
    value !== null &&
    value !== undefined &&
    typeof value === 'object' &&
    !Array.isArray(value)
  ) {
    const doc = value as TiptapNode;
    if (doc.type === 'doc' && Array.isArray(doc.content)) {
      const blocks = doc.content
        .map(tiptapText)
        .filter(Boolean)
        .map((text) => ({ type: 'p', children: [{ text }] }));
      if (blocks.length > 0) return blocks as Value;
    }
  }
  return [{ type: 'p', children: [{ text: '' }] }] as Value;
}

export function getPlainText(value: Value): string {
  return value.map(nodeToText).join('\n');
}
