import { describe, it, expect } from "vitest";
import { toNumber, toBool, ok, err } from "@/lib/api/helpers";

// api/helpers.ts imports next-auth and next/server — those modules are available
// in the node environment Vitest uses. ok/err just call NextResponse.json which
// is part of the Next.js node export and works fine outside a Request context.

describe("toNumber", () => {
  it("converts a numeric string to a number", () => {
    expect(toNumber("42")).toBe(42);
  });

  it("converts a decimal string to a number", () => {
    expect(toNumber("3.14")).toBeCloseTo(3.14);
  });

  it("converts zero string to 0", () => {
    expect(toNumber("0")).toBe(0);
  });

  it("returns undefined for null", () => {
    expect(toNumber(null)).toBeUndefined();
  });

  it("returns undefined for undefined", () => {
    expect(toNumber(undefined)).toBeUndefined();
  });

  it("returns undefined for empty string", () => {
    expect(toNumber("")).toBeUndefined();
  });

  it("returns undefined for a non-numeric string", () => {
    expect(toNumber("abc")).toBeUndefined();
  });

  it("returns undefined for NaN-producing input", () => {
    expect(toNumber("NaN")).toBeUndefined();
  });

  it("returns undefined for Infinity-producing input", () => {
    expect(toNumber("Infinity")).toBeUndefined();
  });

  it("returns undefined for negative Infinity", () => {
    expect(toNumber("-Infinity")).toBeUndefined();
  });

  it("handles negative numbers", () => {
    expect(toNumber("-10")).toBe(-10);
  });
});

describe("toBool", () => {
  it("returns true for string 'true'", () => {
    expect(toBool("true")).toBe(true);
  });

  it("returns true for string '1'", () => {
    expect(toBool("1")).toBe(true);
  });

  it("returns false for string 'false'", () => {
    expect(toBool("false")).toBe(false);
  });

  it("returns false for string '0'", () => {
    expect(toBool("0")).toBe(false);
  });

  it("returns false for any other truthy string (e.g., 'yes')", () => {
    // Only "true" and "1" are treated as true — everything else is false
    expect(toBool("yes")).toBe(false);
  });

  it("returns false for an empty string", () => {
    expect(toBool("")).toBe(false);
  });

  it("returns undefined for null", () => {
    expect(toBool(null)).toBeUndefined();
  });

  it("returns undefined for undefined", () => {
    expect(toBool(undefined)).toBeUndefined();
  });
});

describe("ok / err response helpers", () => {
  it("ok() produces a Response with status 200 by default", async () => {
    const res = ok({ message: "hello" });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ message: "hello" });
  });

  it("ok() accepts a custom status code", async () => {
    const res = ok({ id: 1 }, 201);
    expect(res.status).toBe(201);
  });

  it("err() produces a Response with status 400 by default", async () => {
    const res = err("Something went wrong");
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body).toEqual({ error: "Something went wrong" });
  });

  it("err() accepts a custom status code", async () => {
    const res = err("Unauthorized", 401);
    expect(res.status).toBe(401);
  });

  it("err() with 403 status code", async () => {
    const res = err("Forbidden", 403);
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body).toEqual({ error: "Forbidden" });
  });
});
