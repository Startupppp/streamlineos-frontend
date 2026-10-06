const INVITE_PATH =
  /(?:https?:\/\/[^\s"'<>]+)?\/invitation\/([A-Za-z0-9._~-]+)/i;

export function extractInvitationTokenFromMail(body: string): string | null {
  const match = INVITE_PATH.exec(body);
  return match?.[1] ?? null;
}

export function buildInvitationAcceptPath(token: string): string {
  return `/invitation/${encodeURIComponent(token)}`;
}
