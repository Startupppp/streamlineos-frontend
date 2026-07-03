'use client';

import { NodeApi } from 'platejs';
import type { Value } from 'platejs';

type TiptapNode = { type?: string; content?: TiptapNode[]; text?: string };

function tiptapText(node: TiptapNode): string {
  if (node.text) return node.text;
  if (!node.content) return '';
  return node.content.map(tiptapText).join('');
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
  return value.map((node) => NodeApi.string(node)).join('\n');
}
