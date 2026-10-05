import {
  encodeFilterEnvelope,
  decodeFilterEnvelope,
  parseFilterEnvelope,
  buildEmptyEnvelope,
  addClause,
  validateFilterEnvelopeForContext,
  type FilterEnvelopeV1,
} from "@/lib/filter-envelope/filter-envelope-v1";

describe("encodeFilterEnvelope URL safety", () => {
  it("encodeFilterEnvelope produces a URL-safe string for the `f=` param", () => {
    const envelope = addClause(buildEmptyEnvelope(), {
      field: "status",
      op: "is",
      value: "IN_PROGRESS",
    });
    const encoded = encodeFilterEnvelope(envelope);
    expect(encoded).not.toMatch(/[+/=]/);
  });

  it("decodeFilterEnvelope reverses encodeFilterEnvelope", () => {
    const original: FilterEnvelopeV1 = {
      version: 1,
      logic: "and",
      filters: [
        { field: "priority", op: "is", value: "HIGH" },
        { field: "assigneeId", op: "is", value: "user-99" },
      ],
    };
    const decoded = decodeFilterEnvelope(encodeFilterEnvelope(original));
    expect(decoded).toEqual(original);
  });
});

describe("buildEmptyEnvelope parseability", () => {
  it("buildEmptyEnvelope returns a parseable envelope", () => {
    const envelope = buildEmptyEnvelope();
    expect(parseFilterEnvelope(envelope)).not.toBeNull();
  });
});

describe("validateFilterEnvelopeForContext field gating", () => {
  it("FilterEnvelopeV1 with ticket context rejects unknown field", () => {
    const envelope: FilterEnvelopeV1 = {
      version: 1,
      logic: "and",
      filters: [{ field: "salary", op: "gt", value: 50000 }],
    };
    const { valid, errors } = validateFilterEnvelopeForContext(
      envelope,
      "ticket",
    );
    expect(valid).toBe(false);
    expect(errors.some((e) => e.includes("salary"))).toBe(true);
  });

  it("FilterEnvelopeV1 with 'or' logic serializes and deserializes", () => {
    const envelope: FilterEnvelopeV1 = {
      version: 1,
      logic: "or",
      filters: [
        { field: "status", op: "is", value: "DONE" },
        { field: "status", op: "is", value: "CANCELLED" },
      ],
    };
    const decoded = decodeFilterEnvelope(encodeFilterEnvelope(envelope));
    expect(decoded?.logic).toBe("or");
    expect(decoded?.filters).toHaveLength(2);
  });
});
