"use client";

import { Fragment } from "react";

type TipTapMark = { type: string; attrs?: Record<string, unknown> };
type TipTapNode = {
  type: string;
  text?: string;
  content?: TipTapNode[];
  marks?: TipTapMark[];
  attrs?: Record<string, unknown>;
};
type SlateLeaf = {
  text: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strikethrough?: boolean;
  code?: boolean;
};
type SlateElement = {
  type?: string;
  children?: SlateNode[];
  [k: string]: unknown;
};
type SlateNode = SlateLeaf | SlateElement;

function isTipTapDoc(
  content: Record<string, unknown>,
): content is { type: string; content: TipTapNode[] } {
  return content.type === "doc" && Array.isArray(content.content);
}

function isSlateLeaf(node: unknown): node is SlateLeaf {
  return (
    typeof node === "object" &&
    node !== null &&
    "text" in node &&
    typeof (node as Record<string, unknown>).text === "string"
  );
}

function renderTipTapText(node: TipTapNode): React.ReactNode {
  if (node.text === undefined) return null;
  let el: React.ReactNode = node.text;
  for (const mark of node.marks ?? []) {
    if (mark.type === "bold") el = <strong>{el}</strong>;
    else if (mark.type === "italic") el = <em>{el}</em>;
    else if (mark.type === "code")
      el = (
        <code className="bg-muted px-1 py-0.5 rounded text-[0.85em] font-mono">{el}</code>
      );
    else if (mark.type === "strike") el = <s>{el}</s>;
    else if (mark.type === "underline") el = <u>{el}</u>;
    else if (mark.type === "link")
      el = <span className="text-blue-600 underline">{el}</span>;
  }
  return el;
}

function renderTipTapNode(node: TipTapNode, idx: number): React.ReactNode {
  const children = (node.content ?? []).map((c, i) => renderTipTapNode(c, i));
  switch (node.type) {
    case "text":
      return <Fragment key={idx}>{renderTipTapText(node)}</Fragment>;
    case "paragraph":
      return (
        <p key={idx} className="mb-4 text-sm leading-relaxed">
          {children}
        </p>
      );
    case "heading": {
      const level = typeof node.attrs?.level === "number" ? node.attrs.level : 1;
      const clamped = Math.min(Math.max(level, 1), 6) as 1 | 2 | 3 | 4 | 5 | 6;
      const Tag = `h${clamped}` as const;
      const cls =
        clamped === 1
          ? "text-2xl font-bold mb-3 mt-6"
          : clamped === 2
            ? "text-xl font-semibold mb-2 mt-5"
            : "text-lg font-medium mb-2 mt-4";
      return (
        <Tag key={idx} className={cls}>
          {children}
        </Tag>
      );
    }
    case "bulletList":
      return (
        <ul key={idx} className="list-disc pl-5 mb-4 space-y-1">
          {children}
        </ul>
      );
    case "orderedList":
      return (
        <ol key={idx} className="list-decimal pl-5 mb-4 space-y-1">
          {children}
        </ol>
      );
    case "listItem":
      return (
        <li key={idx} className="text-sm">
          {children}
        </li>
      );
    case "blockquote":
      return (
        <blockquote
          key={idx}
          className="border-l-4 border-border pl-4 italic text-muted-foreground mb-4"
        >
          {children}
        </blockquote>
      );
    case "codeBlock":
      return (
        <pre key={idx} className="bg-muted rounded-md p-4 mb-4 overflow-x-auto text-xs font-mono">
          <code>{children}</code>
        </pre>
      );
    case "hardBreak":
      return <br key={idx} />;
    case "horizontalRule":
      return <hr key={idx} className="my-6 border-border" />;
    default:
      return children.length > 0 ? <div key={idx}>{children}</div> : null;
  }
}

function renderSlateLeafNode(node: SlateLeaf, idx: number): React.ReactNode {
  let el: React.ReactNode = node.text || " ";
  if (node.bold) el = <strong>{el}</strong>;
  if (node.italic) el = <em>{el}</em>;
  if (node.underline) el = <u>{el}</u>;
  if (node.strikethrough) el = <s>{el}</s>;
  if (node.code)
    el = (
      <code className="bg-muted px-1 py-0.5 rounded text-[0.85em] font-mono">{el}</code>
    );
  return <Fragment key={idx}>{el}</Fragment>;
}

function renderSlateNode(node: unknown, idx: number): React.ReactNode {
  if (isSlateLeaf(node)) return renderSlateLeafNode(node, idx);
  if (typeof node !== "object" || node === null) return null;
  const el = node as SlateElement;
  const children = Array.isArray(el.children)
    ? el.children.map((c, i) => renderSlateNode(c, i))
    : [];
  const type = typeof el.type === "string" ? el.type : "p";
  const style: React.CSSProperties = {};
  if (typeof el.textAlign === "string") {
    style.textAlign = el.textAlign as React.CSSProperties["textAlign"];
  }
  if (typeof el.indent === "number") {
    style.marginLeft = `${el.indent * 24}px`;
  }
  switch (type) {
    case "p":
    case "paragraph":
      return (
        <p key={idx} className="mb-4 text-sm leading-relaxed" style={style}>
          {children}
        </p>
      );
    case "h1":
      return (
        <h1 key={idx} className="text-2xl font-bold mb-3 mt-6" style={style}>
          {children}
        </h1>
      );
    case "h2":
      return (
        <h2 key={idx} className="text-xl font-semibold mb-2 mt-5" style={style}>
          {children}
        </h2>
      );
    case "h3":
      return (
        <h3 key={idx} className="text-lg font-medium mb-2 mt-4" style={style}>
          {children}
        </h3>
      );
    case "ul":
    case "bulleted-list":
      return (
        <ul key={idx} className="list-disc pl-5 mb-4 space-y-1">
          {children}
        </ul>
      );
    case "ol":
    case "numbered-list":
      return (
        <ol key={idx} className="list-decimal pl-5 mb-4 space-y-1">
          {children}
        </ol>
      );
    case "li":
    case "list-item":
      return (
        <li key={idx} className="text-sm">
          {children}
        </li>
      );
    case "blockquote":
      return (
        <blockquote
          key={idx}
          className="border-l-4 border-border pl-4 italic text-muted-foreground mb-4"
        >
          {children}
        </blockquote>
      );
    case "code_block":
    case "code-block":
      return (
        <pre
          key={idx}
          className="bg-muted rounded-md p-4 mb-4 overflow-x-auto text-xs font-mono"
        >
          <code>{children}</code>
        </pre>
      );
    case "callout":
      return (
        <div key={idx} className="bg-muted/50 rounded-lg px-4 py-3 mb-4 text-sm">
          {children}
        </div>
      );
    case "table":
      return (
        <table key={idx} className="w-full border-collapse mb-4 text-sm">
          <tbody>{children}</tbody>
        </table>
      );
    case "tr":
      return <tr key={idx}>{children}</tr>;
    case "td":
    case "th":
      return (
        <td key={idx} className="border border-border px-2 py-1">
          {children}
        </td>
      );
    case "img": {
      const src = typeof el.url === "string" ? el.url : undefined;
      return src ? (
        <img key={idx} src={src} alt={typeof el.name === "string" ? el.name : ""} className="max-w-full h-auto rounded-md my-3" />
      ) : null;
    }
    case "video": {
      const src = typeof el.url === "string" ? el.url : undefined;
      return src ? (
        <video key={idx} src={src} controls className="max-w-full rounded-lg my-3" />
      ) : null;
    }
    case "audio": {
      const src = typeof el.url === "string" ? el.url : undefined;
      return src ? (
        <audio key={idx} src={src} controls className="w-full my-2" />
      ) : null;
    }
    case "file": {
      const href = typeof el.url === "string" ? el.url : "#";
      const name = typeof el.name === "string" ? el.name : "File";
      return (
        <a key={idx} href={href} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-3 text-sm hover:bg-muted my-2">
          {name}
        </a>
      );
    }
    case "mention":
    case "page_link":
      return (
        <span key={idx} className="text-blue-600 font-medium">
          {children}
        </span>
      );
    default:
      return children.length > 0 ? <span key={idx}>{children}</span> : null;
  }
}

interface PublicPageContentProps {
  content: Record<string, unknown> | Record<string, unknown>[] | null;
}

export default function PublicPageContent({ content }: PublicPageContentProps) {
  if (!content) {
    return <p className="text-sm text-muted-foreground">No content.</p>;
  }

  if (Array.isArray(content)) {
    return <div>{content.map((node, i) => renderSlateNode(node, i))}</div>;
  }

  if (isTipTapDoc(content)) {
    return (
      <div>
        {content.content.map((node, i) => renderTipTapNode(node, i))}
      </div>
    );
  }

  const rootNodes: unknown[] = Array.isArray(content.children)
    ? (content.children as unknown[])
    : Array.isArray(content.nodes)
      ? (content.nodes as unknown[])
      : Array.isArray(content.root)
        ? (content.root as unknown[])
        : [];

  if (rootNodes.length > 0) {
    return <div>{rootNodes.map((node, i) => renderSlateNode(node, i))}</div>;
  }

  return <p className="text-sm text-muted-foreground">Unable to render content.</p>;
}
