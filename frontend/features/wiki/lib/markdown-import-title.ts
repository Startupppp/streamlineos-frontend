const FRONT_MATTER = /^---\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/;
const FRONT_MATTER_TITLE = /^title:[ \t]*(.+?)[ \t]*$/m;
const H1 = /^#[ \t]+(.+?)[ \t]*#*[ \t]*$/m;
const MAX_TITLE = 500;

function unquote(value: string): string {
  return value.replace(/^(["'])(.*)\1$/, "$2").trim();
}

/**
 * Title and body for an imported Markdown file: front-matter `title:`, else the
 * first `# H1`, else the file name. Front-matter is dropped from the body, and
 * an H1 that opens the document is dropped too since it became the title.
 */
export function markdownImportItem(text: string, fileName: string): { title: string; contentText: string } {
  const fallback = fileName.replace(/\.(md|markdown|txt)$/i, "");
  const frontMatter = FRONT_MATTER.exec(text);
  const body = frontMatter ? text.slice(frontMatter[0].length) : text;
  const metaTitle = frontMatter ? FRONT_MATTER_TITLE.exec(frontMatter[1] ?? "") : null;
  if (metaTitle?.[1]) {
    return { title: unquote(metaTitle[1]).slice(0, MAX_TITLE) || fallback, contentText: body };
  }
  const h1 = H1.exec(body);
  if (!h1?.[1]) return { title: fallback, contentText: body };
  const opensDocument = body.slice(0, h1.index).trim() === "";
  return {
    title: h1[1].slice(0, MAX_TITLE),
    contentText: opensDocument ? body.slice(h1.index + h1[0].length).replace(/^\r?\n/, "") : body,
  };
}
