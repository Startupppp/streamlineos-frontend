import { generateHTML } from "@tiptap/html";
import { buildDocumentExtensions } from "@/components/editor/document-extensions";

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function exportPageToHtml(title: string, content: Record<string, unknown> | null): void {
  const extensions = buildDocumentExtensions({});

  let bodyHtml = "";
  if (content) {
    try {
      bodyHtml = generateHTML(content, extensions);
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
