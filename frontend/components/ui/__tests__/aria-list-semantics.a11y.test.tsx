import { render, screen, within } from "@testing-library/react";
import { expectNoAxeViolations } from "@/test-utils";

describe("role=list must have direct role=listitem children (aria-required-children)", () => {
  it("passes axe when all list children carry role=listitem", async () => {
    const { container } = render(
      <div role="list" aria-label="Projects">
        <div role="listitem">Alpha</div>
        <div role="listitem">Beta</div>
      </div>,
    );
    await expectNoAxeViolations(container);
  });

  it("passes axe when using ul/li (native semantics)", async () => {
    const { container } = render(
      <ul aria-label="Leave balances">
        <li>Annual leave</li>
        <li>Sick leave</li>
      </ul>,
    );
    await expectNoAxeViolations(container);
  });

  it("BITE — a role=list with no role=listitem children fails axe", async () => {
    const { container } = render(
      <div role="list" aria-label="Items">
        <div>Alpha</div>
        <div>Beta</div>
      </div>,
    );
    await expect(expectNoAxeViolations(container)).rejects.toThrow();
  });

  it("ul/li structure exposes each item to getByRole", () => {
    render(
      <ul aria-label="Leave balances">
        <li>Annual leave — 12 days</li>
        <li>Sick leave — 6 days</li>
        <li>Casual leave — 3 days</li>
      </ul>,
    );
    const list = screen.getByRole("list", { name: "Leave balances" });
    const items = within(list).getAllByRole("listitem");
    expect(items).toHaveLength(3);
  });

  it("role=list + role=listitem structure exposes each item to getByRole", () => {
    render(
      <div role="list" aria-label="Team projects">
        <div role="listitem">Alpha</div>
        <div role="listitem">Beta</div>
      </div>,
    );
    const list = screen.getByRole("list", { name: "Team projects" });
    const items = within(list).getAllByRole("listitem");
    expect(items).toHaveLength(2);
  });
});
