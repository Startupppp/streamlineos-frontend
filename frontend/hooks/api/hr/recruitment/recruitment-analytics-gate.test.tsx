"use client";

import { render } from "@testing-library/react";
import { useRecruitmentAnalytics } from "./candidates";

jest.mock("@/hooks/api/access", () => ({
  useCan: jest.fn(),
}));

let lastQueryEnabled: boolean | undefined;

jest.mock("@tanstack/react-query", () => {
  const actual = jest.requireActual<object>("@tanstack/react-query");
  return {
    ...actual,
    useQuery: jest.fn((opts: { enabled?: boolean }) => {
      lastQueryEnabled = opts.enabled;
      return { data: undefined, isError: false, error: null };
    }),
  };
});

const { useCan } = jest.requireMock<{ useCan: jest.Mock }>("@/hooks/api/access");

beforeEach(() => {
  lastQueryEnabled = undefined;
  useCan.mockReturnValue(false);
});

function Hook() {
  useRecruitmentAnalytics();
  return null;
}

describe("useRecruitmentAnalytics — the gate must name the key its route declares", () => {
  it("gates on hr:requisitions:view, the key both /hr/recruitment/analytics handlers declare", () => {
    render(<Hook />);
    expect(useCan).toHaveBeenCalledWith("hr:requisitions:view");
  });

  it("never gates on hr:interviews:view, which the route does not declare and which stranded a requisitions viewer on an empty screen", () => {
    render(<Hook />);
    expect(useCan).not.toHaveBeenCalledWith("hr:interviews:view");
  });

  it("is disabled without the permission", () => {
    useCan.mockReturnValue(false);
    render(<Hook />);
    expect(lastQueryEnabled).toBe(false);
  });

  it("is enabled once the permission is granted", () => {
    useCan.mockReturnValue(true);
    render(<Hook />);
    expect(lastQueryEnabled).toBe(true);
  });
});
