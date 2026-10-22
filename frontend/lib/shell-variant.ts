export type ShellVariant = "mobile" | "desktop";

export function resolveShellVariant(
  requestHeaders: Pick<Headers, "get">,
): ShellVariant {
  const mobileHint = requestHeaders.get("sec-ch-ua-mobile");
  if (mobileHint !== null)
    return mobileHint === "?1" ? "mobile" : "desktop";
  const ua = requestHeaders.get("user-agent") ?? "";
  if (/Mobile|Android|iPhone|iPod/i.test(ua) && !/iPad/i.test(ua))
    return "mobile";
  return "desktop";
}
