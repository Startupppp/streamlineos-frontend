import fs from "node:fs";
import path from "node:path";

describe("huddle has no in-app chat", () => {
  it("does not ship the client-published huddle chat panel", () => {
    expect(fs.existsSync(path.join(__dirname, "huddle-chat-panel.tsx"))).toBe(false);
    const panel = fs.readFileSync(path.join(__dirname, "huddle-panel.tsx"), "utf8");
    expect(panel).not.toMatch(/HuddleChat|huddle:chat/);
  });

  it("has no kick control, since a kick never removes anyone from the Meet or Teams call", () => {
    const panel = fs.readFileSync(path.join(__dirname, "huddle-panel.tsx"), "utf8");
    const card = fs.readFileSync(path.join(__dirname, "huddle-participant-card.tsx"), "utf8");
    expect(panel).not.toMatch(/kickParticipant|onKick|Remove from huddle/);
    expect(card).not.toMatch(/kickParticipant|onKick|Remove from huddle/);
  });
});
