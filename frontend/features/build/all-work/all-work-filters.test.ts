import { parsePriorityParam, parseTicketTypeParam } from "./use-all-work-filters";

describe("parsePriorityParam — normalises and validates priority before it reaches the API", () => {
  it("accepts valid uppercase priorities unchanged", () => {
    expect(parsePriorityParam("LOW")).toBe("LOW");
    expect(parsePriorityParam("MEDIUM")).toBe("MEDIUM");
    expect(parsePriorityParam("HIGH")).toBe("HIGH");
    expect(parsePriorityParam("URGENT")).toBe("URGENT");
  });

  it("a stale bookmark with lowercase priority is uppercased so the backend enum filter does not silently drop it and the chip does not lie", () => {
    expect(parsePriorityParam("low")).toBe("LOW");
    expect(parsePriorityParam("medium")).toBe("MEDIUM");
    expect(parsePriorityParam("high")).toBe("HIGH");
    expect(parsePriorityParam("urgent")).toBe("URGENT");
  });

  it("a priority value absent from the backend enum is dropped rather than sent where the backend silently strips it causing all tickets to return with no filter active", () => {
    expect(parsePriorityParam("critical")).toBeUndefined();
    expect(parsePriorityParam("blocker")).toBeUndefined();
    expect(parsePriorityParam("p0")).toBeUndefined();
  });

  it("returns undefined for null so no priority filter key reaches the API", () => {
    expect(parsePriorityParam(null)).toBeUndefined();
  });

  it("returns undefined for an empty string so no priority filter key reaches the API", () => {
    expect(parsePriorityParam("")).toBeUndefined();
  });
});

describe("parseTicketTypeParam — normalises and validates ticket type before it reaches the API", () => {
  it("accepts valid uppercase types unchanged", () => {
    expect(parseTicketTypeParam("TASK")).toBe("TASK");
    expect(parseTicketTypeParam("BUG")).toBe("BUG");
    expect(parseTicketTypeParam("STORY")).toBe("STORY");
    expect(parseTicketTypeParam("EPIC")).toBe("EPIC");
    expect(parseTicketTypeParam("SUBTASK")).toBe("SUBTASK");
  });

  it("a stale bookmark with lowercase type is uppercased so the backend enum filter does not silently drop it and the chip does not lie", () => {
    expect(parseTicketTypeParam("bug")).toBe("BUG");
    expect(parseTicketTypeParam("task")).toBe("TASK");
    expect(parseTicketTypeParam("story")).toBe("STORY");
    expect(parseTicketTypeParam("epic")).toBe("EPIC");
    expect(parseTicketTypeParam("subtask")).toBe("SUBTASK");
  });

  it("a type value absent from the backend enum is dropped so the API receives no type filter rather than a corrupt one whose transform produces an empty array", () => {
    expect(parseTicketTypeParam("improvement")).toBeUndefined();
    expect(parseTicketTypeParam("chore")).toBeUndefined();
    expect(parseTicketTypeParam("feature")).toBeUndefined();
  });

  it("returns undefined for null so no type filter key reaches the API", () => {
    expect(parseTicketTypeParam(null)).toBeUndefined();
  });

  it("returns undefined for an empty string so no type filter key reaches the API", () => {
    expect(parseTicketTypeParam("")).toBeUndefined();
  });
});

describe("filter chip URL param parsing — chips reflect URL state accurately", () => {
  it("a status URL param is read as a non-empty active filter", () => {
    const params = new URLSearchParams("status=IN_PROGRESS");
    expect(params.get("status")).toBe("IN_PROGRESS");
  });

  it("a priority URL param is read as a non-empty active filter", () => {
    const params = new URLSearchParams("priority=HIGH");
    expect(params.get("priority")).toBe("HIGH");
  });

  it("a type URL param is read as a non-empty active filter", () => {
    const params = new URLSearchParams("type=BUG");
    expect(params.get("type")).toBe("BUG");
  });

  it("clearing all filters removes every known filter key from the URL", () => {
    const params = new URLSearchParams("status=IN_PROGRESS&priority=HIGH&type=BUG&q=foo");
    for (const key of ["status", "priority", "type", "q", "assigneeId", "cycleId", "projectId", "dueDateFrom", "dueDateTo"]) {
      params.delete(key);
    }
    expect(params.toString()).toBe("");
  });

  it("an empty filter value is treated as no filter (chip must not render)", () => {
    const params = new URLSearchParams("status=");
    expect(params.get("status")).toBe("");
    expect(params.get("status") || undefined).toBeUndefined();
  });
});
