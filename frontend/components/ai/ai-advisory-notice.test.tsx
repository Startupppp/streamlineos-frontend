import React from "react";
import { render, screen } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { AiAdvisoryNotice } from "./ai-advisory-notice";
import { AiActionResultBody } from "./ai-action-result-body";

/**
 * Ticket 03. The advisory beside an AI result used to be a bare "⚠" prepended
 * to the result text: an emoji rendered from the text stream, with no accessible
 * name, no warning tone, and a glyph that depends on the viewer's emoji font.
 */
it("renders the product's warning icon as an SVG, hidden from assistive technology", () => {
  const { container } = render(<AiAdvisoryNotice advisory="Advisory only." />);

  const icon = container.querySelector("svg");
  expect(icon).toBeInTheDocument();
  expect(icon).toHaveAttribute("aria-hidden", "true");
  expect(screen.getByRole("note")).toHaveTextContent("Advisory only.");
});

it("carries no emoji, in any theme, because there is no glyph to render", () => {
  const { container } = render(<AiAdvisoryNotice advisory="Advisory only." />);
  expect(container.textContent ?? "").not.toMatch(
    /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}]/u,
  );
});

it("shows the advisory beside the draft when the action declares one", () => {
  render(
    <AiActionResultBody
      state={{
        status: "ready",
        result: { text: "Risk level: LOW", advisory: "Advisory only. A human decides." },
      }}
      contentOnly
    />,
  );

  expect(screen.getByText("Risk level: LOW")).toBeInTheDocument();
  expect(screen.getByRole("note")).toHaveTextContent("A human decides.");
});

it("shows no notice when the action declares none", () => {
  render(
    <AiActionResultBody
      state={{ status: "ready", result: { text: "Overall: 4/5" } }}
      contentOnly
    />,
  );

  expect(screen.queryByRole("note")).not.toBeInTheDocument();
});

it.each([
  "features/hr/employees/detail/employee-details-view.tsx",
  "features/recruitment/candidate-detail/use-candidate-ai-actions.ts",
])("leaves no emoji advisory behind in %s", (file) => {
  const source = readFileSync(resolve(process.cwd(), file), "utf8");
  expect(source).not.toMatch(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}]/u);
});
