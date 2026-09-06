export type ShellVariant = "mobile" | "desktop";

/**
 * Resolves which shell variant to render based on the incoming request headers.
 *
 * Preference order:
 *  1. `Sec-CH-UA-Mobile` client hint — `?1` = mobile, `?0` = desktop.
 *     Requires the server to have sent `Accept-CH: Sec-CH-UA-Mobile` on a
 *     prior response so the browser populates it.
 *  2. `User-Agent` fallback — conservative pattern that matches phones but not
 *     tablets (iPad is excluded so that an iPad with a touch UA is given the
 *     desktop shell, which matches its typical form factor).
 *  3. Default: `"desktop"`.
 *
 * Caveat: a desktop browser resized to a narrow window still sends a desktop UA
 * and client hint, so it receives the desktop shell. CSS breakpoints remain the
 * safety net for that scenario. This is intentional and documented.
 */
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
