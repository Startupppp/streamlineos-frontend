import { getAuthSessionCookieNames } from "../auth-session-cookies";

describe("Auth.js session cookie detection", () => {
  it("checks the secure cookie first in production", () => {
    expect(getAuthSessionCookieNames("production")).toEqual([
      "__Secure-authjs.session-token",
      "authjs.session-token",
    ]);
  });

  it("checks only the development cookie outside production", () => {
    expect(getAuthSessionCookieNames("development")).toEqual([
      "authjs.session-token",
    ]);
  });
});
