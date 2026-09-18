export function distinctNotificationBody(
  title: string,
  message: string | null,
): string | null {
  if (!message) return null;
  const body = message.trim();
  if (!body) return null;
  if (body.toLowerCase() === title.trim().toLowerCase()) return null;
  return body;
}
