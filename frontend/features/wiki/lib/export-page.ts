function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

type SlateText = {
  text: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strikethrough?: boolean;
  code?: boolean;
};

type SlateNode = {
  type?: string;
  text?: string;
  children?: SlateNode[];
  url?: string;
  value?: string;
  key?: string;
  pageId?: number;
  icon?: string;
  checked?: boolean;
  listStyleType?: string;
  [k: string]: unknown;
};

function serializeLeaf(node: SlateText): string {
  let out = escapeHtml(node.text);
  if (node.code) out = `<code>${out}</code>`;
  if (node.bold) out = `<strong>${out}</strong>`;
  if (node.italic) out = `<em>${out}</em>`;
  if (node.underline) out = `<u>${out}</u>`;
  if (node.strikethrough) out = `<s>${out}</s>`;
  return out;
}

function serializeChildren(nodes: SlateNode[]): string {
  return nodes.map(serializeSlateNode).join("");
}

function serializeSlateNode(node: SlateNode): string {
  if (typeof node.text === "string") return serializeLeaf(node as SlateText);
  const ch = Array.isArray(node.children) ? serializeChildren(node.children) : "";
  switch (node.type) {
    case "h1": return `<h1>${ch}</h1>`;
    case "h2": return `<h2>${ch}</h2>`;
    case "h3": return `<h3>${ch}</h3>`;
    case "blockquote": return `<blockquote>${ch}</blockquote>`;
    case "hr": return "<hr>";
    case "code_block": return `<pre><code>${ch}</code></pre>`;
    case "code_line": return ch + "\n";
    case "img": return `<img src="${escapeHtml(String(node.url ?? ""))}" alt="">`;
    case "a": return `<a href="${escapeHtml(String(node.url ?? ""))}">${ch}</a>`;
    case "table": return `<table>${ch}</table>`;
    case "tr": return `<tr>${ch}</tr>`;
    case "td": return `<td>${ch}</td>`;
    case "th": return `<th>${ch}</th>`;
    case "callout": return `<div class="callout">${escapeHtml(String(node.icon ?? "💡"))} ${ch}</div>`;
    case "mention": return `<span class="mention">@${escapeHtml(String(node.value ?? ""))}</span>`;
    case "page_link": return `<span class="page-link">📄 ${escapeHtml(String(node.value ?? ""))}</span>`;
    default: {
      const listStyle = node.listStyleType;
      if (listStyle === "disc" || listStyle === "decimal" || listStyle === "todo") {
        const check = listStyle === "todo"
          ? `<input type="checkbox"${node.checked ? " checked" : ""} disabled> `
          : "";
        return `<li>${check}${ch}</li>`;
      }
      return `<p>${ch}</p>`;
    }
  }
}

function slateToHtml(nodes: SlateNode[]): string {
  const parts: string[] = [];
  let i = 0;
  while (i < nodes.length) {
    const node = nodes[i];
    const ls = node.listStyleType;
    if (ls === "disc" || ls === "todo") {
      const items: string[] = [];
      while (i < nodes.length && nodes[i].listStyleType === ls) {
        items.push(serializeSlateNode(nodes[i]));
        i++;
      }
      parts.push(`<ul>${items.join("")}</ul>`);
    } else if (ls === "decimal") {
      const items: string[] = [];
      while (i < nodes.length && nodes[i].listStyleType === "decimal") {
        items.push(serializeSlateNode(nodes[i]));
        i++;
      }
      parts.push(`<ol>${items.join("")}</ol>`);
    } else {
      parts.push(serializeSlateNode(node));
      i++;
    }
  }
  return parts.join("\n");
}

export async function exportPageToHtml(title: string, content: unknown): Promise<void> {
  let bodyHtml = "";
  if (content) {
    try {
      if (Array.isArray(content)) {
        bodyHtml = slateToHtml(content as SlateNode[]);
      } else if (
        typeof content === "object" &&
        content !== null &&
        (content as Record<string, unknown>).type === "doc"
      ) {
        const [{ generateHTML }, { default: StarterKit }] = await Promise.all([
          import("@tiptap/html"),
          import("@tiptap/starter-kit"),
        ]);
        bodyHtml = generateHTML(content as Record<string, unknown>, [StarterKit]);
      }
    } catch {
      bodyHtml = "";
    }
  }

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(title || "Untitled")}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 800px; margin: 2rem auto; padding: 0 1rem; color: #0b1220; line-height: 1.6; }
    h1 { font-size: 2rem; font-weight: 700; margin-bottom: 0.5rem; }
    h2 { font-size: 1.5rem; font-weight: 600; margin-top: 1.5rem; }
    h3 { font-size: 1.25rem; font-weight: 600; }
    pre { background: #f1f5f9; padding: 1rem; border-radius: 0.5rem; overflow-x: auto; }
    code { font-family: monospace; background: #f1f5f9; padding: 0.1em 0.3em; border-radius: 0.25rem; }
    pre code { background: none; padding: 0; }
    blockquote { border-left: 4px solid #e2e8f0; margin: 0; padding-left: 1rem; color: #64748b; }
    table { border-collapse: collapse; width: 100%; }
    td, th { border: 1px solid #e2e8f0; padding: 0.5rem 0.75rem; }
    th { background: #f8fafc; font-weight: 600; }
    ul, ol { padding-left: 1.5rem; }
    a { color: #3b82f6; }
    hr { border: none; border-top: 1px solid #e2e8f0; margin: 1.5rem 0; }
    .callout { border: 1px solid #e2e8f0; background: #f8fafc; border-radius: 0.5rem; padding: 0.75rem 1rem; margin: 0.75rem 0; }
    .mention { color: #1d4ed8; font-weight: 500; }
    .page-link { color: #374151; border: 1px solid #e2e8f0; border-radius: 0.25rem; padding: 0.1em 0.35em; }
  </style>
</head>
<body>
  <h1>${escapeHtml(title || "Untitled")}</h1>
  ${bodyHtml}
</body>
</html>`;

  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${(title || "untitled").replace(/[^a-z0-9]/gi, "-").toLowerCase()}.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
