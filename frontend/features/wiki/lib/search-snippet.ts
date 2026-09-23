const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
};

function decodeEntities(value: string): string {
  return value.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, (_, entity: string) => {
    if (entity[0] === "#") {
      const code =
        entity[1] === "x" || entity[1] === "X"
          ? Number.parseInt(entity.slice(2), 16)
          : Number.parseInt(entity.slice(1), 10);
      if (!Number.isFinite(code) || code < 0) return "";
      return String.fromCodePoint(code);
    }
    return NAMED_ENTITIES[entity] ?? "";
  });
}

function stripTags(value: string): string {
  return decodeEntities(value.replace(/<\/?[^>]+>/g, "")).replace(/\s+/g, " ");
}

export interface SearchSnippetPart {
  text: string;
  highlight: boolean;
}

export function searchSnippetPlainText(snippet: string): string {
  return stripTags(snippet).trim();
}

export function parseSearchSnippet(snippet: string): SearchSnippetPart[] {
  const parts: SearchSnippetPart[] = [];
  const marked = /<b>(.*?)<\/b>/gi;
  let cursor = 0;
  let match = marked.exec(snippet);
  while (match) {
    if (match.index > cursor) {
      const text = stripTags(snippet.slice(cursor, match.index));
      if (text) parts.push({ text, highlight: false });
    }
    const highlighted = stripTags(match[1] ?? "");
    if (highlighted) parts.push({ text: highlighted, highlight: true });
    cursor = marked.lastIndex;
    match = marked.exec(snippet);
  }
  if (cursor < snippet.length) {
    const text = stripTags(snippet.slice(cursor));
    if (text) parts.push({ text, highlight: false });
  }
  if (parts.length === 0) {
    const text = searchSnippetPlainText(snippet);
    return text ? [{ text, highlight: false }] : [];
  }
  return parts;
}
