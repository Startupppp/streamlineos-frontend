import { messageDeleteTitle } from "./message-delete-title";

describe("messageDeleteTitle", () => {
  it("names the author and quotes the text", () => {
    expect(messageDeleteTitle("Ada", "hello")).toBe('Delete message from Ada: "hello"?');
  });

  it("truncates long text to about 60 characters", () => {
    const title = messageDeleteTitle("Ada", "x".repeat(200));
    expect(title).toBe(`Delete message from Ada: "${"x".repeat(60)}…"?`);
  });

  it("calls an empty message an attachment", () => {
    expect(messageDeleteTitle("Ada", "  ")).toBe("Delete this attachment from Ada?");
    expect(messageDeleteTitle("Ada", null)).toBe("Delete this attachment from Ada?");
  });
});
