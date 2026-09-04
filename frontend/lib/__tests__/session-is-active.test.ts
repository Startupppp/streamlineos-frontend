import { resolveSessionIsActive } from "@/lib/auth-is-active";

/**
 * A negative/runtime contract test for the one seam in the NextAuth `session`
 * callback where a JWT claim is read as a boolean.
 *
 * The defect this pins is not hypothetical arithmetic on types. `lib/auth.ts`
 * resolved the flag twice, differently: the happy path wrote
 * `fresh?.isActive ?? (token.isActive as boolean)` and the catch path wrote
 * `(token.isActive as boolean | undefined) ?? true`. A token minted before the
 * claim existed therefore produced `undefined` when the backend ANSWERED and
 * `true` when the backend THREW — a successful session resolution was strictly
 * more likely to present a live user as deactivated than a failed one, and the
 * `as boolean` is what let the declared type keep saying otherwise.
 */
describe("resolveSessionIsActive", () => {
  it("returns a real boolean, never undefined, when the token claim is absent", () => {
    const result = resolveSessionIsActive(null, undefined);
    expect(typeof result).toBe("boolean");
    expect(result).toBe(true);
  });

  it("resolves the two session-callback branches identically for the same token", () => {
    for (const claim of [undefined, null, true, false, "true", 1, {}]) {
      expect(resolveSessionIsActive(null, claim)).toBe(
        resolveSessionIsActive(undefined, claim),
      );
    }
  });

  it("treats a non-boolean claim as unreadable rather than coercing it", () => {
    expect(resolveSessionIsActive(null, "false")).toBe(true);
    expect(resolveSessionIsActive(null, 0)).toBe(true);
    expect(resolveSessionIsActive(null, null)).toBe(true);
  });

  it("honours a deactivation the backend actually reports", () => {
    expect(resolveSessionIsActive({ isActive: false }, true)).toBe(false);
    expect(resolveSessionIsActive({ isActive: true }, false)).toBe(true);
  });

  it("honours a boolean claim when the backend did not answer", () => {
    expect(resolveSessionIsActive(null, false)).toBe(false);
    expect(resolveSessionIsActive(null, true)).toBe(true);
  });

  it("never returns a value require-permission.ts would read as neither active nor inactive", () => {
    for (const fresh of [null, undefined, { isActive: true }, { isActive: false }]) {
      for (const claim of [undefined, null, true, false, "x", 0]) {
        const result = resolveSessionIsActive(fresh, claim);
        expect(result === true || result === false).toBe(true);
      }
    }
  });
});
