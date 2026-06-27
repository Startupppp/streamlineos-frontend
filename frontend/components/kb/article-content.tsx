"use client";

import { useMemo } from "react";
import DOMPurify from "isomorphic-dompurify";
import { generateHTML } from "@tiptap/html";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import TextAlign from "@tiptap/extension-text-align";
import Underline from "@tiptap/extension-underline";

export interface ArticleHeading {
  id: string;
  text: string;
  level: number;
}

export interface PreparedArticle {
  html: string;
  headings: ArticleHeading[];
}

interface ArticleContentProps {
  content: string;
}

const HEADING_PATTERN = /<h([1-3])\b([^>]*)>([\s\S]*?)<\/h\1>/gi;
const INLINE_TAG_PATTERN = /<[^>]+>/g;
const ID_ATTR_PATTERN = /\s+id\s*=\s*("[^"]*"|'[^']*')/gi;
const ENTITY_PATTERN = /&amp;|&lt;|&gt;|&quot;|&#39;|&nbsp;/g;

const ENTITY_MAP: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
  "&nbsp;": " ",
};

function decodeEntities(value: string): string {
  return value.replace(ENTITY_PATTERN, (match) => ENTITY_MAP[match] ?? match);
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function uniqueId(base: string, used: Set<string>): string {
  const seed = base || "section";
  let candidate = seed;
  let counter = 1;
  while (used.has(candidate)) {
    candidate = `${seed}-${counter}`;
    counter += 1;
  }
  used.add(candidate);
  return candidate;
}

function toHtml(content: string): string {
  const trimmed = content.trim();
  if (!trimmed) return "";
  if (!trimmed.startsWith("{")) return trimmed;
  try {
    return generateHTML(JSON.parse(trimmed), [
      StarterKit,
      Link.configure({ openOnClick: false }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Underline,
    ]);
  } catch {
    return trimmed;
  }
}

export function prepareArticle(content: string): PreparedArticle {
  const sanitized = DOMPurify.sanitize(toHtml(content));
  const headings: ArticleHeading[] = [];
  const used = new Set<string>();

  const html = sanitized.replace(
    HEADING_PATTERN,
    (_match, levelValue: string, attributes: string, inner: string) => {
      const level = Number(levelValue);
      const text = decodeEntities(inner.replace(INLINE_TAG_PATTERN, ""))
        .replace(/\s+/g, " ")
        .trim();
      const cleanAttributes = attributes.replace(ID_ATTR_PATTERN, "");
      if (!text) {
        return `<h${level}${cleanAttributes}>${inner}</h${level}>`;
      }
      const id = uniqueId(slugify(text), used);
      headings.push({ id, text, level });
      return `<h${level}${cleanAttributes} id="${id}">${inner}</h${level}>`;
    },
  );

  return { html, headings };
}

export function ArticleContent({ content }: ArticleContentProps) {
  const { html } = useMemo(() => prepareArticle(content), [content]);

  if (!html.trim()) {
    return (
      <p className="text-sm text-muted-foreground">
        This article doesn&apos;t have any content yet.
      </p>
    );
  }

  return (
    <div
      className="prose prose-sm sm:prose-base dark:prose-invert max-w-none break-words [&_h1]:scroll-mt-6 [&_h2]:scroll-mt-6 [&_h3]:scroll-mt-6"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
