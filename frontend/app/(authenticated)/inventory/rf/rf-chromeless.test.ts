import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * The RF layout suppresses an element it does not own, by id, across a module
 * boundary. That is a workaround (see the layout's own comment), and the failure
 * mode of a workaround like this is silence: rename the id in the global header
 * and the RF layout keeps hiding nothing, while the panel comes back over the
 * task number with no test failing anywhere.
 *
 * So the coupling is asserted rather than assumed.
 */
const GLOBAL_HEADER = join(
  __dirname,
  "../../../../components/layout/header/global-header.tsx",
);
const RF_LAYOUT = join(__dirname, "layout.tsx");

describe("the RF surface hides the onboarding portal it cannot own", () => {
  it("targets an id the global header still renders", () => {
    const header = readFileSync(GLOBAL_HEADER, "utf8");
    const layout = readFileSync(RF_LAYOUT, "utf8");

    const headerId = /id="([a-z-]*checklist-slot)"/.exec(header)?.[1];
    // Anti-vacuity: a header that stopped rendering any slot would otherwise let
    // the comparison below pass by matching nothing against nothing.
    expect(headerId).toBe("mobile-header-checklist-slot");
    expect(layout).toContain(`#${headerId}{display:none}`);
  });

  it("scopes the rule to the RF route rather than shipping it globally", () => {
    // The rule lives in a layout under inventory/rf, so it unmounts with the
    // route. If it ever moves into globals.css it stops being inventory's.
    const layout = readFileSync(RF_LAYOUT, "utf8");
    expect(layout).toContain("export default function InventoryRfLayout");

    const globals = readFileSync(join(__dirname, "../../../../globals.css"), "utf8");
    expect(globals).not.toContain("mobile-header-checklist-slot");
  });
});
