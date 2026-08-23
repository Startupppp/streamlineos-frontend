import { redact } from "./redact";

describe("redact", () => {
  it("leaves ordinary values untouched", () => {
    expect(redact({ orgId: "org-1", count: 3 })).toEqual({ orgId: "org-1", count: 3 });
  });

  it("redacts credential-bearing keys regardless of casing", () => {
    const out = redact({
      password: "hunter2",
      accessToken: "a",
      Authorization: "Bearer x",
      API_KEY: "k",
    }) as Record<string, unknown>;

    for (const value of Object.values(out)) expect(value).toBe("[redacted]");
  });

  it("redacts nested secrets", () => {
    expect(redact({ user: { name: "Ada", token: "t" } })).toEqual({
      user: { name: "Ada", token: "[redacted]" },
    });
  });

  it("summarises an Error rather than emitting an empty object", () => {
    const out = redact(new Error("boom")) as Record<string, unknown>;
    expect(out).toMatchObject({ name: "Error", message: "boom" });
  });

  it("truncates a very long string", () => {
    const out = redact({ note: "x".repeat(5000) }) as { note: string };
    expect(out.note.length).toBeLessThan(5000);
    expect(out.note).toContain("truncated");
  });

  it("survives a circular structure", () => {
    const node: Record<string, unknown> = { name: "root" };
    node.self = node;
    expect(redact(node)).toEqual({ name: "root", self: "[circular]" });
  });

  it("stops at the depth limit", () => {
    const deep = { a: { b: { c: { d: { e: { f: "bottom" } } } } } };
    expect(JSON.stringify(redact(deep))).toContain("[depth-limit]");
  });
});
