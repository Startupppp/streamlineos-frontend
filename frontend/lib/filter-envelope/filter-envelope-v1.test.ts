import {
  parseFilterEnvelope,
  encodeFilterEnvelope,
  decodeFilterEnvelope,
  validateFilterEnvelopeForContext,
  buildEmptyEnvelope,
  addClause,
  removeClauseAtIndex,
  MAX_FILTER_CLAUSES,
  type FilterEnvelopeV1,
  type FilterClause,
} from "./filter-envelope-v1";

const validClause: FilterClause = { field: "status", op: "is", value: "TODO" };

const validEnvelope: FilterEnvelopeV1 = {
  version: 1,
  logic: "and",
  filters: [validClause],
};

describe("parseFilterEnvelope", () => {
  it("parses a valid envelope with a single clause", () => {
    const result = parseFilterEnvelope(validEnvelope);
    expect(result).toEqual(validEnvelope);
  });

  it("parses a valid envelope with a nested group", () => {
    const withGroup: FilterEnvelopeV1 = {
      version: 1,
      logic: "and",
      filters: [
        {
          logic: "or",
          filters: [
            { field: "status", op: "is", value: "TODO" },
            { field: "priority", op: "is", value: "HIGH" },
          ],
        },
      ],
    };
    const result = parseFilterEnvelope(withGroup);
    expect(result).toEqual(withGroup);
  });

  it("returns null for missing version", () => {
    const input = { logic: "and", filters: [] };
    expect(parseFilterEnvelope(input)).toBeNull();
  });

  it("returns null for an unknown operator", () => {
    const input = {
      version: 1,
      logic: "and",
      filters: [{ field: "status", op: "equals", value: "open" }],
    };
    expect(parseFilterEnvelope(input)).toBeNull();
  });

  it("returns null for extra keys (strict mode)", () => {
    const input = {
      version: 1,
      logic: "and",
      filters: [],
      extra: "surprise",
    };
    expect(parseFilterEnvelope(input)).toBeNull();
  });

  it("returns null for filters exceeding MAX_FILTER_CLAUSES", () => {
    const filters = Array.from({ length: MAX_FILTER_CLAUSES + 1 }, () => ({
      field: "status",
      op: "is" as const,
      value: "TODO",
    }));
    expect(parseFilterEnvelope({ version: 1, logic: "and", filters })).toBeNull();
  });

  it("accepts an empty filters array", () => {
    const result = parseFilterEnvelope({ version: 1, logic: "and", filters: [] });
    expect(result).not.toBeNull();
    expect(result?.filters).toHaveLength(0);
  });

  it("accepts all valid operators", () => {
    const ops = [
      "is", "is-not", "before", "after", "contains",
      "contains-any", "contains-none", "between", "gt", "lt",
      "is-empty", "is-not-empty",
    ] as const;
    for (const op of ops) {
      const result = parseFilterEnvelope({
        version: 1,
        logic: "and",
        filters: [{ field: "status", op, value: "x" }],
      });
      expect(result).not.toBeNull();
    }
  });
});

describe("encodeFilterEnvelope / decodeFilterEnvelope", () => {
  it("round-trips a valid envelope without + / or = characters", () => {
    const encoded = encodeFilterEnvelope(validEnvelope);
    expect(encoded).not.toMatch(/[+/=]/);
    const decoded = decodeFilterEnvelope(encoded);
    expect(decoded).toEqual(validEnvelope);
  });

  it("round-trips an envelope with nested groups", () => {
    const complex: FilterEnvelopeV1 = {
      version: 1,
      logic: "or",
      filters: [
        { logic: "and", filters: [{ field: "priority", op: "is", value: "HIGH" }] },
        { field: "status", op: "is-not", value: "DONE" },
      ],
    };
    expect(decodeFilterEnvelope(encodeFilterEnvelope(complex))).toEqual(complex);
  });

  it("returns null for an invalid base64url string", () => {
    expect(decodeFilterEnvelope("not!!!valid")).toBeNull();
  });

  it("returns null when encoded JSON does not match envelope schema", () => {
    const badEncoded = encodeFilterEnvelope({
      version: 1,
      logic: "and",
      filters: [],
    }).slice(0, -2);
    expect(decodeFilterEnvelope(badEncoded)).toBeNull();
  });
});

describe("validateFilterEnvelopeForContext", () => {
  it("accepts authorized ticket fields", () => {
    const envelope: FilterEnvelopeV1 = {
      version: 1,
      logic: "and",
      filters: [
        { field: "status", op: "is", value: "TODO" },
        { field: "priority", op: "is", value: "HIGH" },
        { field: "assigneeId", op: "is", value: "user-1" },
      ],
    };
    const { valid, errors } = validateFilterEnvelopeForContext(envelope, "ticket");
    expect(valid).toBe(true);
    expect(errors).toHaveLength(0);
  });

  it("rejects unauthorized fields for ticket context", () => {
    const envelope: FilterEnvelopeV1 = {
      version: 1,
      logic: "and",
      filters: [{ field: "salary", op: "gt", value: 50000 }],
    };
    const { valid, errors } = validateFilterEnvelopeForContext(envelope, "ticket");
    expect(valid).toBe(false);
    expect(errors.some((e) => e.includes("salary"))).toBe(true);
  });

  it("rejects unauthorized nested group fields", () => {
    const envelope: FilterEnvelopeV1 = {
      version: 1,
      logic: "and",
      filters: [
        {
          logic: "or",
          filters: [{ field: "secret", op: "is", value: "x" }],
        },
      ],
    };
    const { valid } = validateFilterEnvelopeForContext(envelope, "ticket");
    expect(valid).toBe(false);
  });

  it("rejects more than MAX_FILTER_CLAUSES total clauses", () => {
    const filters = Array.from({ length: MAX_FILTER_CLAUSES + 1 }, () => ({
      field: "status",
      op: "is" as const,
      value: "TODO",
    }));
    const envelope: FilterEnvelopeV1 = { version: 1, logic: "and", filters };
    const { valid, errors } = validateFilterEnvelopeForContext(envelope, "ticket");
    expect(valid).toBe(false);
    expect(errors.some((e) => e.includes("exceeds maximum"))).toBe(true);
  });

  it("validates project context fields separately from ticket", () => {
    const envelope: FilterEnvelopeV1 = {
      version: 1,
      logic: "and",
      filters: [{ field: "assigneeId", op: "is", value: "user-1" }],
    };
    const { valid } = validateFilterEnvelopeForContext(envelope, "project");
    expect(valid).toBe(false);
  });
});

describe("buildEmptyEnvelope", () => {
  it("creates a version 1 envelope with empty filters and default 'and' logic", () => {
    const e = buildEmptyEnvelope();
    expect(e.version).toBe(1);
    expect(e.logic).toBe("and");
    expect(e.filters).toHaveLength(0);
  });

  it("accepts an 'or' logic argument", () => {
    const e = buildEmptyEnvelope("or");
    expect(e.logic).toBe("or");
  });
});

describe("addClause / removeClauseAtIndex", () => {
  it("addClause appends a clause immutably", () => {
    const base = buildEmptyEnvelope();
    const updated = addClause(base, validClause);
    expect(updated.filters).toHaveLength(1);
    expect(base.filters).toHaveLength(0);
  });

  it("removeClauseAtIndex removes the clause at the given index", () => {
    const e: FilterEnvelopeV1 = {
      version: 1,
      logic: "and",
      filters: [
        { field: "status", op: "is", value: "TODO" },
        { field: "priority", op: "is", value: "HIGH" },
      ],
    };
    const removed = removeClauseAtIndex(e, 0);
    expect(removed.filters).toHaveLength(1);
    expect((removed.filters[0] as FilterClause).field).toBe("priority");
  });
});
