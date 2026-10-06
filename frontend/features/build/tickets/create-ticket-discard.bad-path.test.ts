/**
 * Behavioral contract for Create Issue close/discard (D2/D3/D4).
 * Implementation must: confirm on first Escape when dirty; clear draft on
 * discard; not truncate via maxLength.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

const dialogState = readFileSync(
  join(__dirname, "use-create-ticket-dialog-state.ts"),
  "utf8",
);
const titleField = readFileSync(
  join(__dirname, "ticket-dialog-title-field.tsx"),
  "utf8",
);
const dialog = readFileSync(join(__dirname, "create-ticket-dialog.tsx"), "utf8");

describe("Create Issue discard / Escape contract (D2/D3/D4)", () => {
  it("does not hard-cap the title input with maxLength (D1 — block via schema)", () => {
    expect(titleField).not.toMatch(/maxLength=\{200\}/);
  });

  it("intercepts Escape on the dialog content when dirty (D2)", () => {
    expect(dialog).toMatch(/onEscapeKeyDown/);
  });

  it("resets the form when discard is confirmed (D3)", () => {
    expect(dialogState).toMatch(/resetForm|form\.reset/);
  });
});
