import { boundedAskOsContext } from "./ask-os-request-policy";

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
