import { consoleReporter } from "./console-reporter";
import { ApiError } from "@/lib/api-envelope";
import {
  reportError,
  resetErrorReporter,
  setErrorReporter,
} from "./error-reporter";

function firstLogged(logged: string[]): string {
  const entry = logged.at(0);
  if (entry === undefined) throw new Error("expected console.error to have been called");
  return entry;
}

describe("consoleReporter", () => {
  let logged: string[];
  let origConsoleError: typeof console.error;

  beforeEach(() => {
    logged = [];
    origConsoleError = console.error;
    console.error = (...args: unknown[]): void => {
      const msg = args.at(0);
      if (typeof msg === "string") logged.push(msg);
    };
    setErrorReporter(consoleReporter);
  });

  afterEach(() => {
    resetErrorReporter();
    console.error = origConsoleError;
  });

  it("writes valid JSON to console.error", () => {
    reportError(new Error("boom"));
    expect(logged).toHaveLength(1);
    expect(() => JSON.parse(firstLogged(logged))).not.toThrow();
  });

  it("includes required fields in the log entry", () => {
    reportError(new Error("payload"));
    const entry = JSON.parse(firstLogged(logged)) as Record<string, unknown>;
    expect(entry.level).toBe("error");
    expect(entry.source).toBe("browser");
    expect(typeof entry.timestamp).toBe("string");
    expect(entry.error).toMatchObject({ name: "Error", message: "payload" });
  });

  it("strips a token from extra before it reaches the log", () => {
    reportError(new Error("x"), { token: "secret-bearer-token", route: "/dashboard" });
    const raw = firstLogged(logged);
    expect(raw).not.toContain("secret-bearer-token");
    expect(raw).toContain("[redacted]");
    expect(raw).toContain("/dashboard");
  });

  it("strips an authorization header from extra before it reaches the log", () => {
    reportError(new Error("x"), {
      authorization: "Bearer eyJhbGciOiJIUzI1NiJ9.xxx",
      apiKey: "key-abc-123",
    });
    const raw = firstLogged(logged);
    expect(raw).not.toContain("eyJhbGciOiJIUzI1NiJ9");
    expect(raw).not.toContain("key-abc-123");
  });

  it("strips a cookie value from extra before it reaches the log", () => {
    reportError(new Error("x"), { cookie: "session=abc; Path=/" });
    expect(firstLogged(logged)).not.toContain("session=abc");
  });

  it("strips a password from extra before it reaches the log", () => {
    reportError(new Error("x"), { password: "hunter2" });
    expect(firstLogged(logged)).not.toContain("hunter2");
  });

  it("includes the context for tracing back to the backend", () => {
    reportError(new Error("x"));
    const entry = JSON.parse(firstLogged(logged)) as Record<string, unknown>;
    expect(entry).toHaveProperty("context");
  });

  it("never throws even when the error itself is not an Error instance", () => {
    expect(() => reportError(undefined)).not.toThrow();
    expect(() => reportError(null)).not.toThrow();
    expect(() => reportError(42)).not.toThrow();
  });

  it("never throws when console.error itself throws", () => {
    console.error = (): void => {
      throw new Error("console broke");
    };
    expect(() => reportError(new Error("x"))).not.toThrow();
  });
});

describe("an ApiError reports the fields that identify what actually failed", () => {
  it("surfaces status, code and endpoint so a pasted browser log names the failing request", () => {
    const spy = jest.spyOn(console, "error").mockImplementation(() => undefined);
    const error = new ApiError(
      "Network error contacting api.example.test (PATCH /access/org-modules/crm). Check your connection and try again.",
      undefined,
      "NETWORK_ERROR",
      { method: "PATCH", path: "/access/org-modules/crm", host: "api.example.test", cause: "Failed to fetch" },
      "/access/org-modules/crm",
    );

    consoleReporter.report({ error, context: {} });

    const payload = JSON.parse(spy.mock.calls[0]?.[0] as string) as {
      error: { code?: string; endpoint?: string; details?: { cause?: string } };
    };
    expect(payload.error.code).toBe("NETWORK_ERROR");
    expect(payload.error.endpoint).toBe("/access/org-modules/crm");
    expect(payload.error.details?.cause).toBe("Failed to fetch");
    spy.mockRestore();
  });

  it("redacts a secret carried in details rather than printing it into the log", () => {
    const spy = jest.spyOn(console, "error").mockImplementation(() => undefined);
    const error = new ApiError("boom", 500, "OOPS", { authorization: "Bearer super-secret" });

    consoleReporter.report({ error, context: {} });

    const raw = spy.mock.calls[0]?.[0] as string;
    expect(raw).not.toContain("super-secret");
    spy.mockRestore();
  });

  it("adds no diagnostic keys to an ordinary Error, so unrelated reports keep their shape", () => {
    const spy = jest.spyOn(console, "error").mockImplementation(() => undefined);

    consoleReporter.report({ error: new Error("plain"), context: {} });

    const payload = JSON.parse(spy.mock.calls[0]?.[0] as string) as { error: Record<string, unknown> };
    expect(Object.keys(payload.error).sort()).toEqual(["message", "name", "stack"]);
    spy.mockRestore();
  });
});
