import {
  encodeFilterEnvelope,
  decodeFilterEnvelope,
  parseFilterEnvelope,
  type FilterEnvelopeV1,
} from "./filter-envelope-v1";

describe("encodeFilterEnvelope stability", () => {
  it("encodeFilterEnvelope result is stable for the same input", () => {
    const envelope: FilterEnvelopeV1 = {
      version: 1,
      logic: "and",
      filters: [{ field: "status", op: "is", value: "ACTIVE" }],
    };
    expect(encodeFilterEnvelope(envelope)).toBe(encodeFilterEnvelope(envelope));
  });
});

describe("decodeFilterEnvelope edge cases", () => {
  it("decodeFilterEnvelope returns null for empty string", () => {
    expect(decodeFilterEnvelope("")).toBeNull();
  });
});

describe("filterEnvelopeV1Schema version validation", () => {
  it("filterEnvelopeV1Schema rejects version != 1", () => {
    const input = { version: 2, logic: "and", filters: [] };
    expect(parseFilterEnvelope(input)).toBeNull();
  });
});

describe("filterEnvelopeV1Schema depth validation", () => {
  it("nested group depth-3 is rejected by the schema", () => {
    const depth3Input = {
      version: 1,
      logic: "and",
      filters: [
        {
          logic: "or",
          filters: [
            {
              logic: "and",
              filters: [{ field: "status", op: "is", value: "DONE" }],
            },
          ],
        },
      ],
    };
    expect(parseFilterEnvelope(depth3Input)).toBeNull();
  });
});
