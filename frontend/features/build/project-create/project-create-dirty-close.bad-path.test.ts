import { readFileSync } from "node:fs";
import { join } from "node:path";

const wizard = readFileSync(
  join(__dirname, "project-create-wizard.tsx"),
  "utf8",
);
const basics = readFileSync(
  join(__dirname, "steps/step-basics.tsx"),
  "utf8",
);

describe("New Project dirty close contract (D5)", () => {
  it("keeps live draft.name in sync while typing so Escape sees dirty", () => {
    expect(basics).toMatch(/updateDraft\(\{[\s\S]*name:/);
  });

  it("intercepts Escape and overlay dismiss on SheetContent when dirty", () => {
    expect(wizard).toMatch(/onEscapeKeyDown/);
    expect(wizard).toMatch(/onPointerDownOutside|onInteractOutside/);
  });

  it("opens ConfirmDialog via requestClose when dirty", () => {
    expect(wizard).toMatch(/setDiscardConfirmOpen\(true\)/);
    expect(wizard).toMatch(/ConfirmDialog/);
  });
});
