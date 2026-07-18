export function getAuthSessionCookieNames(
  nodeEnv: string | undefined,
): readonly string[] {
  if (nodeEnv !== "production") return ["authjs.session-token"];

  return ["__Secure-authjs.session-token", "authjs.session-token"];
}
