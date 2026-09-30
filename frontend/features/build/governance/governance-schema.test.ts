import { riskFormSchema, decisionFormSchema } from "./governance-schema";

describe("riskFormSchema — whitespace-only title persists to the server until trim+min", () => {
  it("rejects whitespace-only title", () => {
    const result = riskFormSchema.safeParse({
      title: "   ",
      description: "",
      probability: "medium",
      impact: "medium",
      status: "open",
      ownerId: "",
      mitigation: "",
      linkedTicketId: "",
    });
    expect(result.success).toBe(false);
  });

  it("accepts a non-blank title", () => {
    const result = riskFormSchema.safeParse({
      title: "API rate limit",
      description: "",
      probability: "medium",
      impact: "medium",
      status: "open",
      ownerId: "",
      mitigation: "",
      linkedTicketId: "",
    });
    expect(result.success).toBe(true);
  });
});

describe("decisionFormSchema — whitespace-only title persists to the server until trim+min", () => {
  it("rejects whitespace-only title", () => {
    const result = decisionFormSchema.safeParse({
      title: "   ",
      context: "",
      decision: "",
      optionsConsidered: "",
      status: "proposed",
      ownerId: "",
      decidedAt: "",
      revisitAt: "",
      linkedTicketId: "",
    });
    expect(result.success).toBe(false);
  });

  it("accepts a non-blank title", () => {
    const result = decisionFormSchema.safeParse({
      title: "Use shared auth service",
      context: "",
      decision: "",
      optionsConsidered: "",
      status: "proposed",
      ownerId: "",
      decidedAt: "",
      revisitAt: "",
      linkedTicketId: "",
    });
    expect(result.success).toBe(true);
  });
});

describe("decisionFormSchema — revisit date before decided date accepted until cross-field guard", () => {
  it("rejects revisitAt before decidedAt", () => {
    const result = decisionFormSchema.safeParse({
      title: "Use shared auth service",
      context: "",
      decision: "",
      optionsConsidered: "",
      status: "proposed",
      ownerId: "",
      decidedAt: "2026-06-01",
      revisitAt: "2026-01-01",
      linkedTicketId: "",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const paths = result.error.issues.map((i) => i.path.join("."));
      expect(paths).toContain("revisitAt");
    }
  });

  it("accepts revisitAt on the same day as decidedAt", () => {
    const result = decisionFormSchema.safeParse({
      title: "Use shared auth service",
      context: "",
      decision: "",
      optionsConsidered: "",
      status: "proposed",
      ownerId: "",
      decidedAt: "2026-06-01",
      revisitAt: "2026-06-01",
      linkedTicketId: "",
    });
    expect(result.success).toBe(true);
  });

  it("accepts revisitAt after decidedAt", () => {
    const result = decisionFormSchema.safeParse({
      title: "Use shared auth service",
      context: "",
      decision: "",
      optionsConsidered: "",
      status: "proposed",
      ownerId: "",
      decidedAt: "2026-01-01",
      revisitAt: "2026-06-01",
      linkedTicketId: "",
    });
    expect(result.success).toBe(true);
  });

  it("accepts both dates empty", () => {
    const result = decisionFormSchema.safeParse({
      title: "Use shared auth service",
      context: "",
      decision: "",
      optionsConsidered: "",
      status: "proposed",
      ownerId: "",
      decidedAt: "",
      revisitAt: "",
      linkedTicketId: "",
    });
    expect(result.success).toBe(true);
  });
});
