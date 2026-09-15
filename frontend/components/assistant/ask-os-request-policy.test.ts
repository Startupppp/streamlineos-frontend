import {
  boundedAskOsContext,
  personaForPathname,
} from "./ask-os-request-policy";

describe("personaForPathname", () => {
  it.each([
    ["/support/inbox", "support"],
    ["/crm/leads", "sales"],
    ["/build/5/tickets/LBR-1", "project"],
    ["/inventory/stock", "operations"],
    ["/accounting/reports", "operations"],
    ["/purchases/orders", "operations"],
    ["/hr/employees", "hr-policy"],
    ["/payroll/runs", "hr-policy"],
    ["/timesheets/reports", "hr-policy"],
    ["/directory/workers", "hr-policy"],
  ] as const)("maps %s to %s", (pathname, expected) => {
    expect(personaForPathname(pathname)).toBe(expected);
  });

  it("does not match similar route names", () => {
    expect(personaForPathname("/builder")).toBeNull();
    expect(personaForPathname("/settings")).toBeNull();
  });
});

describe("boundedAskOsContext", () => {
  it("keeps only the newest twenty messages in chronological order", () => {
    const messages = Array.from({ length: 25 }, (_, index) => ({
      content: String(index),
    }));

    expect(boundedAskOsContext(messages)).toEqual(messages.slice(5));
  });

  it("keeps the newest content within the character budget", () => {
    const messages = [
      { content: "a".repeat(10_000) },
      { content: "b".repeat(20_000) },
    ];
    const result = boundedAskOsContext(messages);

    expect(result).toHaveLength(2);
    expect(result[0]?.content).toHaveLength(4_000);
    expect(result[1]?.content).toHaveLength(20_000);
  });
});
