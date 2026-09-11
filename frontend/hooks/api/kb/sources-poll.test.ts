import { kbSourcePollInterval, type KbSource } from "./sources";

const START = Date.parse("2026-09-03T10:00:00.000Z");

function source(status: KbSource["status"], createdAtMs: number): KbSource {
  return {
    id: 1,
    kind: "file",
    title: "handbook.pdf",
    mimeType: "application/pdf",
    fileSize: 20_000_000,
    fileUrl: null,
    status,
    chunkCount: 0,
    errorMessage: null,
    spaceId: null,
    createdAt: new Date(createdAtMs).toISOString(),
  };
}

describe("kbSourcePollInterval", () => {
  it("does not poll when nothing is processing", () => {
    expect(kbSourcePollInterval([source("ready", START)], START + 1_000)).toBe(false);
    expect(kbSourcePollInterval([source("failed", START)], START + 1_000)).toBe(false);
    expect(kbSourcePollInterval([], START)).toBe(false);
    expect(kbSourcePollInterval(undefined, START)).toBe(false);
  });

  it("starts at three seconds, the interval the old flat poll used", () => {
    expect(kbSourcePollInterval([source("processing", START)], START)).toBe(3_000);
  });

  it("backs off geometrically instead of holding three seconds forever", () => {
    const at = (ms: number) => kbSourcePollInterval([source("processing", START)], START + ms);
    expect(at(29_000)).toBe(3_000);
    expect(at(30_000)).toBe(6_000);
    expect(at(60_000)).toBe(12_000);
    expect(at(120_000)).toBe(48_000);
  });

  it("never exceeds the one-minute ceiling", () => {
    const at = (ms: number) => kbSourcePollInterval([source("processing", START)], START + ms);
    expect(at(150_000)).toBe(60_000);
    expect(at(9 * 60_000)).toBe(60_000);
  });

  it("stops entirely once the row has been stuck for ten minutes", () => {
    const at = (ms: number) => kbSourcePollInterval([source("processing", START)], START + ms);
    expect(at(10 * 60_000 - 1)).toBe(60_000);
    expect(at(10 * 60_000)).toBe(false);
    expect(at(24 * 60 * 60_000)).toBe(false);
  });

  it("uses the oldest processing row, so a new upload does not restart the clock", () => {
    const rows = [source("processing", START), source("processing", START + 9 * 60_000)];
    expect(kbSourcePollInterval(rows, START + 10 * 60_000)).toBe(false);
  });

  it("treats an unparseable createdAt as no clock rather than crashing", () => {
    const broken = { ...source("processing", START), createdAt: "not a date" };
    expect(kbSourcePollInterval([broken], START)).toBe(false);
  });
});
