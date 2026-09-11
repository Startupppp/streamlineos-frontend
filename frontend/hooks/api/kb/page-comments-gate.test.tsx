"use client";

import { render } from "@testing-library/react";
import { useKbPageComments } from "./page-comments";

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

function Hook({ pageId }: { pageId: number }) {
  useKbPageComments(pageId);
  return null;
}

describe("useKbPageComments — kb:pages:view gate", () => {
  it("is disabled when useCan returns false", () => {
    useCan.mockReturnValue(false);
    render(<Hook pageId={1} />);
    expect(lastQueryEnabled).toBe(false);
  });

  it("is enabled when kb:pages:view is granted and pageId > 0", () => {
    useCan.mockReturnValue(true);
    render(<Hook pageId={42} />);
    expect(lastQueryEnabled).toBe(true);
  });

  it("is disabled when pageId is 0 even with permission", () => {
    useCan.mockReturnValue(true);
    render(<Hook pageId={0} />);
    expect(lastQueryEnabled).toBe(false);
  });

  it("uses the view key (kb:pages:view), not the update key", () => {
    render(<Hook pageId={1} />);
    expect(useCan).toHaveBeenCalledWith("kb:pages:view");
    expect(useCan).not.toHaveBeenCalledWith("kb:pages:update");
  });
});
