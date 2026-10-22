import { readFileSync } from "node:fs";
import { render, screen } from "@testing-library/react";
import { backendPath, backendReachable } from "@/lib/test-support/backend-path";
import { ProvisioningNotice } from "../provisioning-notice";


const SETUP_SERVICE = "src/modules/accounting/setup/accounting-setup.service.ts";

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
    const { container } = render(<ProvisioningNotice provisioning={{ state: "ready", bookId: "b1" }} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("says nothing to an organisation that never asked for accounting", () => {
    const { container } = render(<ProvisioningNotice provisioning={{ state: "not_requested" }} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("tells an unprovisioned org that its postings are going nowhere", () => {
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
    expect(backendReachable(SETUP_SERVICE)).toBe(true);
    expect(backendStates().length).toBeGreaterThan(3);
  });

  it("has a branch for each one, so a new state cannot be silently dropped", () => {
    const component = readFileSync(
      new URL("../provisioning-notice.tsx", import.meta.url),
      "utf8",
    );
    const missing = backendStates().filter((state) => !component.includes(`case "${state}":`));
    expect(missing).toEqual([]);
  });

  it("keeps the frontend union in step with the backend's", () => {
    const types = [
      "../../../../types/accounting/accounting-kernel.ts",
      "../../../../types/accounting/accounting-kernel-ext.ts",
    ]
      .map((rel) => readFileSync(new URL(rel, import.meta.url), "utf8"))
      .join("\n");
    const at = types.indexOf("export type AccountingProvisioning");
    expect(at).toBeGreaterThanOrEqual(0);
    const union = types.slice(at, types.indexOf("export interface AccountingSetupStatusDisabled", at));
    const missing = backendStates().filter((state) => !union.includes(`"${state}"`));
    expect(missing).toEqual([]);
  });
});
