'use client';

import type { Value, TNode, TElement } from 'platejs';

type TiptapNode = { type?: string; content?: TiptapNode[]; text?: string };

const MEDIA_NODE_TYPES = new Set(['img', 'video', 'audio', 'file', 'placeholder']);

const EMPTY_PARAGRAPH: Value = [{ type: 'p', children: [{ text: '' }] }];

function tiptapText(node: TiptapNode): string {
  if (node.text) return node.text;
  if (!node.content) return '';
  return node.content.map(tiptapText).join('');
}

function isTiptapDoc(value: unknown): value is TiptapNode & { content: TiptapNode[] } {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  if (!('type' in value) || value.type !== 'doc') return false;
  return 'content' in value && Array.isArray(value.content);
}

function isElement(value: unknown): value is TElement {
  if (typeof value !== 'object' || value === null) return false;
  if ('apply' in value && typeof value.apply === 'function') return false;
  return 'children' in value && Array.isArray(value.children);
}

function isElementList(value: unknown): value is Value {
  return Array.isArray(value) && value.every(isElement);
}

function nodeString(node: unknown): string {
  if (typeof node !== 'object' || node === null) return '';
  if ('text' in node && typeof node.text === 'string') return node.text;
  if ('children' in node && Array.isArray(node.children)) return node.children.map(nodeString).join('');
  return '';
}

function nodeToText(node: TNode): string {
  if (isElement(node) && MEDIA_NODE_TYPES.has(node.type)) {
    return typeof node.name === 'string' ? node.name : '';
  }
  return nodeString(node);
}

export function normalizePlateValue(value: unknown): Value {
  if (isElementList(value) && value.length > 0) {
    return value;
  }
  if (isTiptapDoc(value)) {
    const blocks: Value = value.content
      .map(tiptapText)
      .filter(Boolean)
      .map((text) => ({ type: 'p', children: [{ text }] }));
    if (blocks.length > 0) return blocks;
  }
  return EMPTY_PARAGRAPH;
}

export function plainTextToPlateValue(text: string): Value {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const blocks: Value = lines.map((line) => ({
    type: "p",
    children: [{ text: line }],
  }));
  if (blocks.length === 0) return EMPTY_PARAGRAPH;
  return blocks;
}

export function prependPlateValue(prefix: Value, body: Value): Value {
  if (prefix.length === 0) return body;
  if (body.length === 0) return prefix;
  return [...prefix, ...body];
}

export function getPlainText(value: Value): string {
  return value.map(nodeToText).join('\n');
}
