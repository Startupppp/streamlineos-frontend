import { render, screen } from "@testing-library/react";
import { PageState } from "./page-state";

const loading = <div data-testid="skeleton" />;

describe("PageState", () => {
  it("offers to enable, never to buy, when the organization simply has it switched off", () => {
    render(
      <PageState resolution={{ kind: "module-disabled", moduleKey: "feedbucket" }} loading={loading}>
        <div>body</div>
      </PageState>,
    );

    expect(screen.getByRole("link", { name: /modules/i })).toHaveAttribute(
      "href",
      "/settings/modules",
    );
    expect(screen.queryByRole("link", { name: /plan|upgrade|billing/i })).toBeNull();
  });

  it("does not offer to enable a module that is already on to a user who was denied it", () => {
    render(
      <PageState resolution={{ kind: "module-denied", moduleKey: "hr" }} loading={loading}>
        <div>body</div>
      </PageState>,
    );

    expect(screen.queryByRole("link", { name: /modules/i })).toBeNull();
  });

  it("sends the customer to billing only when money is the actual blocker", () => {
    render(
      <PageState
        resolution={{ kind: "plan-required", moduleKey: "payroll", upgradePath: "/settings/billing" }}
        loading={loading}
      >
        <div>body</div>
      </PageState>,
    );

    expect(screen.getByRole("link", { name: /plan/i })).toHaveAttribute(
      "href",
      "/settings/billing",
    );
  });

  it("renders the body only when the state is ready", () => {
    render(
      <PageState resolution={{ kind: "ready" }} loading={loading}>
        <div>body</div>
      </PageState>,
    );
    expect(screen.getByText("body")).toBeInTheDocument();
  });

  it("falls back to the children when a non-list surface reports emptiness", () => {
    render(
      <PageState resolution={{ kind: "empty" }} loading={loading}>
        <div>body</div>
      </PageState>,
    );
    expect(screen.getByText("body")).toBeInTheDocument();
  });
});
