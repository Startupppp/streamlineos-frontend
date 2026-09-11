import { readFileSync } from "node:fs";
import { render, screen } from "@testing-library/react";
import { backendPath, backendReachable } from "@/lib/test-support/backend-path";
import { ProvisioningNotice } from "../provisioning-notice";

/**
 * The provisioning verdict, and the drift that hid it.
 *
 * The backend has computed this since ACC-02 and `/accounting/setup/status`
 * has carried it in every response since. Nothing rendered it. So the two
 * states that mean "postings are being refused or lost right now" arrived at
 * the setup screen and were dropped on the floor, and ACC-17's fiscal-year
 * warning — whose only purpose is to be seen thirty days early — was never
 * added to the frontend union at all.
 *
 * Hence the last test in this file, which is the one that matters: it is not
 * enough that today's states render, because the way this broke was a state
 * being ADDED on one side. A union that grows and a `switch` that does not is
 * the defect, and it is invisible to every test that only exercises the states
 * it already knows about.
 */

const SETUP_SERVICE = "src/modules/accounting/setup/accounting-setup.service.ts";

/**
 * The states the backend's union can actually return.
 *
 * Ending the slice at the first `;` is the obvious way to do this and it is
 * wrong: the first semicolon in the union is a property separator INSIDE a
 * member (`{ state: "unprovisioned"; message: string }`), so it truncated the
 * list to two states — and both guards below then passed over a list that had
 * silently dropped the very state they exist to catch. The floor in the test
 * above is what caught it. The union ends where the next top-level
 * declaration begins.
 */
function backendStates(): string[] {
  const source = readFileSync(backendPath(SETUP_SERVICE), "utf8");
  const at = source.indexOf("export type AccountingProvisioning");
  const rest = source.slice(at + 1);
  const end = rest.search(/\n(?:export|const|@|\/\*\*)/);
  const union = end === -1 ? rest : rest.slice(0, end);
  return [...union.matchAll(/state:\s*"([a-z_]+)"/g)].map((m) => m[1]!);
}

describe("the provisioning notice", () => {
  it("says nothing at all when the books are ready", () => {
    /*
      A banner that appears on a healthy screen is one people learn to scroll
      past, and this one has to be believed on the day it is not routine.
    */
    const { container } = render(<ProvisioningNotice provisioning={{ state: "ready", bookId: "b1" }} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("says nothing to an organisation that never asked for accounting", () => {
    const { container } = render(<ProvisioningNotice provisioning={{ state: "not_requested" }} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("tells an unprovisioned org that its postings are going nowhere", () => {
    /*
      The state that rendered identically to opting out. The distinction is the
      whole point: this organisation is paying for accounting and every stock
      movement, invoice and payroll run is being accepted and recorded nowhere.
    */
    render(
      <ProvisioningNotice
        provisioning={{
          state: "unprovisioned",
          message: "no book of accounts exists, so nothing can post to the ledger",
        }}
      />,
    );

    expect(screen.getByText(/no book to post to/i)).toBeInTheDocument();
    expect(screen.getByText(/nothing can post to the ledger/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /create the book/i })).toHaveAttribute(
      "href",
      "/accounting/setup",
    );
  });

  it("names the roles an incomplete book is missing, using the server's own words", () => {
    /*
      Rendered from the server's message rather than restated here. It names
      the specific tags, and a second copy of that sentence on this side would
      drift from the rule that decides which roles are required.
    */
    render(
      <ProvisioningNotice
        provisioning={{
          state: "incomplete",
          bookId: "b1",
          missingRoles: ["grni"],
          message: 'This book has no account tagged "grni".',
        }}
      />,
    );

    expect(screen.getByText(/no account tagged "grni"/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /map the accounts/i })).toBeInTheDocument();
  });

  it("counts down to the day the fiscal year runs out", () => {
    render(
      <ProvisioningNotice
        provisioning={{
          state: "fiscal_year_ending",
          bookId: "b1",
          endsOn: "2027-03-31",
          daysRemaining: 12,
          message: "The last accounting period for this book ends soon.",
        }}
      />,
    );

    expect(screen.getByText(/fiscal year ends soon/i)).toBeInTheDocument();
    expect(screen.getByText(/12 days left/)).toBeInTheDocument();
    expect(screen.getByText(/2027-03-31/)).toBeInTheDocument();
  });

  it("stops counting down once the date has passed", () => {
    /*
      `daysRemaining` goes to zero and below. "0 days left" reads as a
      countdown still running; by then the year has already ended and the
      sentence has to be in the past tense.
    */
    render(
      <ProvisioningNotice
        provisioning={{
          state: "fiscal_year_ending",
          bookId: "b1",
          endsOn: "2027-03-31",
          daysRemaining: -3,
          message: "The last accounting period for this book has ended.",
        }}
      />,
    );

    expect(screen.getByText(/last period ended on 2027-03-31/i)).toBeInTheDocument();
    expect(screen.queryByText(/left/)).not.toBeInTheDocument();
  });
});

describe("the frontend renders every state the backend can return", () => {
  it("can reach the backend to compare against", () => {
    /* Anti-vacuity: an unreachable path would make the guard below pass empty. */
    expect(backendReachable(SETUP_SERVICE)).toBe(true);
    expect(backendStates().length).toBeGreaterThan(3);
  });

  it("has a branch for each one, so a new state cannot be silently dropped", () => {
    /*
      The guard that would have caught this. `fiscal_year_ending` was added to
      the backend union, shipped in the API, and never reached the frontend
      type or any renderer — a drift no type error and no rendering test could
      show, because the frontend's own union simply did not know the state
      existed.
    */
    const component = readFileSync(
      new URL("../provisioning-notice.tsx", import.meta.url),
      "utf8",
    );
    const missing = backendStates().filter((state) => !component.includes(`case "${state}":`));
    expect(missing).toEqual([]);
  });

  it("keeps the frontend union in step with the backend's", () => {
    const types = readFileSync(new URL("../../../../types/accounting-kernel.ts", import.meta.url), "utf8");
    const at = types.indexOf("export type AccountingProvisioning");
    const union = types.slice(at, types.indexOf("export interface AccountingSetupStatusDisabled", at));
    const missing = backendStates().filter((state) => !union.includes(`"${state}"`));
    expect(missing).toEqual([]);
  });
});
