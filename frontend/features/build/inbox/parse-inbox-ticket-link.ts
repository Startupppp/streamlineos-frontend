export interface InboxTicketLinkTarget {
  projectId: number;
  ticketId: number | null;
  ticketKey: string | null;
  commentId: number | null;
  href: string;
}

function toAbsoluteUrl(raw: string): URL | null {
  try {
    return new URL(raw, "http://local.invalid");
  } catch {
    return null;
  }
}

function parseCommentId(value: string | null): number | null {
  if (!value) return null;
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) ? n : null;
}

export function parseInboxTicketLink(link: string | null | undefined): InboxTicketLinkTarget | null {
  if (!link) return null;
  const url = toAbsoluteUrl(link);
  if (!url) return null;

  const ticketPath = url.pathname.match(/^\/projects\/(\d+)\/tickets\/([^/]+)\/?$/);
  if (ticketPath) {
    const projectId = Number.parseInt(ticketPath[1] ?? "", 10);
    const ticketKeyRaw = ticketPath[2];
    if (!Number.isFinite(projectId) || !ticketKeyRaw) return null;
    const ticketKey = decodeURIComponent(ticketKeyRaw);
    const numericId = Number.parseInt(ticketKey, 10);
    const ticketId =
      Number.isFinite(numericId) && String(numericId) === ticketKey ? numericId : null;
    return {
      projectId,
      ticketId,
      ticketKey: ticketId == null ? ticketKey : null,
      commentId: parseCommentId(url.searchParams.get("comment")),
      href: `${url.pathname}${url.search}`,
    };
  }

  const projectPath = url.pathname.match(/^\/projects\/(\d+)\/?$/);
  if (projectPath) {
    const projectId = Number.parseInt(projectPath[1] ?? "", 10);
    const ticketParam = url.searchParams.get("ticket");
    if (!Number.isFinite(projectId) || !ticketParam) return null;
    const ticketId = Number.parseInt(ticketParam, 10);
    if (!Number.isFinite(ticketId)) return null;
    return {
      projectId,
      ticketId,
      ticketKey: null,
      commentId: parseCommentId(url.searchParams.get("comment")),
      href: `${url.pathname}${url.search}`,
    };
  }

  return null;
}
