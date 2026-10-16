import { existsSync } from "node:fs";
import { join } from "node:path";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import KnowledgeWikiPageError from "./error";

jest.mock("@/lib/observability", () => ({
  isChunkLoadError: () => false,
  reportError: jest.fn(),
}));

describe("wiki page error boundary", () => {
  it("lives in the same segment as the wiki layout, so a failing page keeps the wiki sidebar mounted", () => {
    expect(existsSync(join(__dirname, "layout.tsx"))).toBe(true);
    expect(existsSync(join(__dirname, "error.tsx"))).toBe(true);
  });

  it("offers a retry that resets only the failed page", async () => {
    const reset = jest.fn();
    render(<KnowledgeWikiPageError error={new Error("boom")} reset={reset} />);

    await userEvent.setup().click(screen.getByRole("button", { name: /try again|retry/i }));

    expect(reset).toHaveBeenCalledTimes(1);
  });
});
