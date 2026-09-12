import { render, screen } from "@testing-library/react";
import type { AccessState } from "@/lib/rbac/gate";
import { Gated } from "./gated";

const access = jest.fn<AccessState, [string]>();

jest.mock("@/hooks/api/access", () => ({
  useCanState: (key: string) => access(key),
}));

/**
 * Ticket 26, asserted where a person would see it.
 *
 * The unit test next to `resolveGate` proves the branch order. This proves the
 * thing the ticket is actually about: that a denied surface *renders* as denied
 * rather than as an empty list. A test of the decision alone would have passed
 * just as happily with the component still showing "No campaigns yet".
 */
describe("a surface the caller may not see", () => {
  beforeEach(() => access.mockReset());

  it("says access is restricted, not that there is nothing here", () => {
    access.mockReturnValue("denied");

    render(
      <Gated
        permission="crm:campaigns:view"
        isLoading={false}
        isEmpty
        loading={<p>Loading</p>}
        empty={<p>No campaigns yet</p>}
      >
        <p>the list</p>
      </Gated>,
    );

    expect(screen.getByText(/Access Restricted/i)).toBeInTheDocument();
    // The assertion that matters. A rep who cannot see the pipeline must not be
    // told the pipeline is empty; their next action would be to re-create
    // something that already exists.
    expect(screen.queryByText("No campaigns yet")).not.toBeInTheDocument();
  });

  it("names the permission, so the request to an administrator is specific", () => {
    access.mockReturnValue("denied");

    render(
      <Gated permission="crm:campaigns:view" isLoading={false} loading={<p>Loading</p>}>
        <p>the list</p>
      </Gated>,
    );

    expect(screen.getByText("crm:campaigns:view")).toBeInTheDocument();
  });

  /**
   * The inverse lie, which fixing only the reported half would have introduced.
   *
   * Rights arrive asynchronously. A screen branching on `useCan`'s boolean shows
   * "Access Restricted" to everybody on first paint, including the people who
   * hold the permission.
   */
  it("shows a skeleton, not a refusal, before the caller's rights arrive", () => {
    access.mockReturnValue("loading");

    render(
      <Gated permission="crm:campaigns:view" isLoading={false} isEmpty loading={<p>Loading</p>}>
        <p>the list</p>
      </Gated>,
    );

    expect(screen.getByText("Loading")).toBeInTheDocument();
    expect(screen.queryByText(/Access Restricted/i)).not.toBeInTheDocument();
  });

  it("shows the list to somebody who may see it", () => {
    access.mockReturnValue("granted");

    render(
      <Gated permission="crm:campaigns:view" isLoading={false} loading={<p>Loading</p>}>
        <p>the list</p>
      </Gated>,
    );

    expect(screen.getByText("the list")).toBeInTheDocument();
  });

  it("still says empty when the caller may look and there is nothing there", () => {
    access.mockReturnValue("granted");

    render(
      <Gated
        permission="crm:campaigns:view"
        isLoading={false}
        isEmpty
        loading={<p>Loading</p>}
        empty={<p>No campaigns yet</p>}
      >
        <p>the list</p>
      </Gated>,
    );

    expect(screen.getByText("No campaigns yet")).toBeInTheDocument();
  });
});
