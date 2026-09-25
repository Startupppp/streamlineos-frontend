import { render, screen } from "@testing-library/react";
import { ApiError } from "@/lib/api-envelope";
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

  it("forwards className to the loading branch so the skeleton fills the shell instead of stopping short", () => {
    render(
      <PageState resolution={{ kind: "loading" }} loading={loading} className="flex-1">
        <div>body</div>
      </PageState>,
    );
    expect(screen.getByTestId("skeleton").parentElement).toHaveClass("flex-1");
  });

  it("renders access-restricted, not the empty state, when the caller is denied — the Ticket 26 guarantee at the component boundary", () => {
    render(
      <PageState
        resolution={{ kind: "denied", permission: "crm:campaigns:view" }}
        loading={loading}
        empty={<div>No campaigns yet</div>}
      >
        <div>the list</div>
      </PageState>,
    );

    expect(screen.queryByText("No campaigns yet")).not.toBeInTheDocument();
    expect(screen.queryByText("the list")).not.toBeInTheDocument();
  });

  it("surfaces the backend's own 403 message instead of the fixed Access Restricted copy", () => {
    render(
      <PageState
        resolution={{
          kind: "denied",
          permission: null,
          message: "Contact your org owner to upgrade.",
        }}
        loading={loading}
      >
        <div>body</div>
      </PageState>,
    );

    expect(
      screen.getByText("Contact your org owner to upgrade."),
    ).toBeInTheDocument();
  });

  it("renders an error state, not children, when the resolution is an error", () => {
    render(
      <PageState
        resolution={{ kind: "error", error: new Error("network failure") }}
        loading={loading}
      >
        <div>body</div>
      </PageState>,
    );

    expect(screen.queryByText("body")).not.toBeInTheDocument();
  });

  it("shows the request id of a failed load, so the person can quote it", () => {
    const failure = new ApiError("Server error", 500, "INTERNAL", { correlationId: "req-3b1c" }, "/hr/documents");
    render(
      <PageState resolution={{ kind: "error", error: failure }} loading={loading}>
        <div>body</div>
      </PageState>,
    );

    expect(screen.getByText("req-3b1c")).toBeInTheDocument();
  });
});
