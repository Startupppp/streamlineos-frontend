/** @jest-environment node */

jest.mock("server-only", () => ({}));
jest.mock("@/lib/public-fetch", () => ({ publicGet: jest.fn() }));

import { PHASE_PRODUCTION_BUILD } from "next/constants";
import { publicGet } from "@/lib/public-fetch";
import { getCurrentSubprocessors } from "./subprocessors";

const mockedGet = publicGet as jest.Mock;
const ORIGINAL_PHASE = process.env.NEXT_PHASE;

afterEach(() => {
  mockedGet.mockReset();
  process.env.NEXT_PHASE = ORIGINAL_PHASE;
});

const entry = (name: string, retiredAt: string | null) => ({
  name,
  purpose: "p",
  location: "l",
  url: null,
  effectiveFrom: "2026-01-01T00:00:00.000Z",
  retiredAt,
});

describe("getCurrentSubprocessors", () => {
  it("renders the live register, asks for current entries and drops any retired one", async () => {
    mockedGet.mockResolvedValue({ data: [entry("Neon", null), entry("Old", "2026-02-01T00:00:00.000Z")] });

    const rows = await getCurrentSubprocessors();

    expect(rows.map((row) => row.name)).toEqual(["Neon"]);
    expect(mockedGet).toHaveBeenCalledWith("/compliance/subprocessors", { includeRetired: "false" }, expect.anything());
  });

  it("falls back to the static register only while the page is being built", async () => {
    mockedGet.mockRejectedValue(new Error("ECONNREFUSED"));
    process.env.NEXT_PHASE = PHASE_PRODUCTION_BUILD;

    expect((await getCurrentSubprocessors()).length).toBeGreaterThan(0);
  });

  it("throws at runtime so ISR keeps the last good page instead of caching the fallback", async () => {
    mockedGet.mockRejectedValue(new Error("ECONNREFUSED"));
    delete process.env.NEXT_PHASE;

    await expect(getCurrentSubprocessors()).rejects.toThrow("ECONNREFUSED");
  });
});
