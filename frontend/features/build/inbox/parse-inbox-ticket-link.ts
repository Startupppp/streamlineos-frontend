import {
  normalizeBuildDeepLink,
  toBuildPath,
} from "@/lib/build/normalize-build-deep-link";
import { parseTicketKey } from "@/components/shared/format-ticket-key";

export interface InboxTicketLinkTarget {
  projectId: number;
  ticketId: number | null;
  ticketKey: string | null;
  commentId: number | null;
  href: string;
}

export { normalizeBuildDeepLink };

function toAbsoluteUrl(raw: string): URL | null {
  try {
    return new URL(raw, "http://local.invalid");
  } catch {
    return null;
  }
}

function parsePositiveId(value: string | null | undefined): number | null {
  if (!value || !/^[1-9]\d*$/.test(value)) return null;
  const id = Number(value);
  return Number.isSafeInteger(id) && id <= 2147483647 ? id : null;
}

function parseTicketSegment(
  projectId: number,
  ticketKeyRaw: string,
  search: string,
  commentId: number | null,
): InboxTicketLinkTarget | null {
  let ticketKey: string;
  try {
    ticketKey = decodeURIComponent(ticketKeyRaw);
  } catch {
    return null;
  }
  const parsed = parseTicketKey(ticketKey);
  if (!parsed) return null;
  const ticketId = parsed.projectKey === undefined ? parsed.ticketNumber : null;
  return {
    projectId,
    ticketId,
    ticketKey: ticketId == null ? ticketKey : null,
    commentId,
    href: `/build/${projectId}/tickets/${encodeURIComponent(ticketKey)}${search}`,
  };
}

export function extractBuildProjectId(link: string | null | undefined): number | null {
  if (!link) return null;
  const url = toAbsoluteUrl(link);
  if (!url) return null;
  const pathname = toBuildPath(url.pathname);
  const match = pathname.match(/^\/build\/(\d+)(?:\/|$)/);
  return parsePositiveId(match?.[1]);
}

export function parseInboxTicketLink(link: string | null | undefined): InboxTicketLinkTarget | null {
  if (!link) return null;
  const url = toAbsoluteUrl(link);
  if (!url) return null;

  const pathname = toBuildPath(url.pathname);
  const commentParam = url.searchParams.get("comment");
  const commentId = parsePositiveId(commentParam);
  if (commentParam !== null && commentId === null) return null;
  const search = url.search;

  const ticketPath = pathname.match(/^\/build\/(\d+)\/tickets\/([^/]+)\/?$/);
  if (ticketPath) {
    const projectId = parsePositiveId(ticketPath[1]);
    const ticketKeyRaw = ticketPath[2];
    if (projectId === null || !ticketKeyRaw) return null;
    return parseTicketSegment(projectId, ticketKeyRaw, search, commentId);
  }

  const projectPath = pathname.match(/^\/build\/(\d+)(?:\/issues)?\/?$/);
  if (projectPath) {
    const projectId = parsePositiveId(projectPath[1]);
    const ticketId = parsePositiveId(url.searchParams.get("ticket"));
    if (projectId === null || ticketId === null) return null;
    return {
      projectId,
      ticketId,
      ticketKey: null,
      commentId,
      href: `/build/${projectId}/issues?ticket=${ticketId}${
        commentId != null ? `&comment=${commentId}` : ""
      }`,
    };
  }

  return null;
}
