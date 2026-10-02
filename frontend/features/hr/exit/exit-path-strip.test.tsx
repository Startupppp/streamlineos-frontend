import { readFileSync } from "node:fs";
import { render, screen } from "@testing-library/react";
import {
  ALUMNI_NOT_AVAILABLE_COPY,
  EXIT_PATH_STEPS,
} from "@/features/hr/exit/exit-path-steps";

let scopes: Record<string, string> = {};
jest.mock("@/hooks/api/access", () => ({
  useAccess: () => ({ data: { scopes, modules: { hr: true }, isOrgOwner: false } }),
}));

import { ExitPathStrip } from "@/features/hr/exit/exit-path-strip";

beforeEach(() => {
  scopes = {
    "hr:exit:manage": "all",
    "hr:payroll:approve": "all",
    "hr:assets:view": "all",
    "payroll:fnf:view": "all",
  };
});

describe("HRMS-UX-014 — the exit path is continuous to the payroll link", () => {
  it("reaches termination, the FnF draft, asset returns and the payroll settlement", () => {
    render(<ExitPathStrip />);
    const hrefs = screen
      .getAllByRole("link")
      .map((link) => link.getAttribute("href"));
    expect(hrefs).toContain("/hr/termination");
    expect(hrefs).toContain("/hr/fnf");
    expect(hrefs).toContain("/hr/asset-returns");
    expect(hrefs).toContain("/payroll/fnf");
  });

  it("says the settlement is payroll's, never that this redesign proved it", () => {
    render(<ExitPathStrip />);
    expect(
      screen.getByText(/Payroll owns the settlement itself/),
    ).toBeInTheDocument();
    expect(screen.queryByText(/settlement verified/i)).not.toBeInTheDocument();
  });

  it("locks a step the caller cannot reach instead of offering a dead link", () => {
    scopes = {};
    render(<ExitPathStrip />);
    const hrefs = screen
      .queryAllByRole("link")
      .map((link) => link.getAttribute("href"));
    expect(hrefs).not.toContain("/hr/termination");
    expect(hrefs).not.toContain("/payroll/fnf");
    expect(screen.getByText("Termination")).toBeInTheDocument();
  });

  it("prompts to reassign reports and links to the real reassignment surface", () => {
    render(<ExitPathStrip showReassignPrompt />);
    expect(
      screen.getByRole("link", { name: "Reassign reports" }),
    ).toHaveAttribute("href", "/hr/employees/reporting-changes");
  });
});

describe("HRMS-UX-014 — Alumni is vocabulary only", () => {
  it("states the exact proposed copy and gives the step no destination", () => {
    render(<ExitPathStrip />);
    expect(screen.getByText(ALUMNI_NOT_AVAILABLE_COPY)).toBeInTheDocument();
    expect(EXIT_PATH_STEPS.find((step) => step.key === "alumni")?.href).toBeNull();
  });

  it("ships no Alumni route and no Alumni nav entry", () => {
    const hrefs = EXIT_PATH_STEPS.map((step) => step.href ?? "");
    expect(hrefs.some((href) => /alumni/i.test(href))).toBe(false);
  });
});

describe("HRMS-UX-014 — termination keeps an explicit destructive confirmation", () => {
  it("completing a termination goes through a destructive confirm, not a quiet submit", () => {
    const source = readFileSync(
      "features/hr/termination/termination-page.tsx",
      "utf8",
    );
    const confirm = source.slice(source.indexOf('title="Complete Termination"'));
    expect(confirm).toContain("destructive");
    expect(confirm).toContain("cannot be undone");
  });
});

describe("HRMS-UX-014 — the FnF page saves a draft and runs no payroll", () => {
  it("keeps the India-shaped draft fields and never claims to settle", () => {
    const source = readFileSync("features/hr/fnf/fnf-page-client.tsx", "utf8");
    for (const field of [
      "basicDues",
      "leaveEncashment",
      "bonusDue",
      "deductions",
      "loanRecovery",
    ])
      expect(source).toContain(field);
    expect(source).toContain("does not pay anything");
    expect(source).toContain('href="/payroll/fnf"');
  });
});
