import { act } from "@testing-library/react";
import {
  captured,
  installWorkloadMocks,
  mockReplace,
  mockUseProjectBoardTickets,
  mockUseWorkloadCapacity,
  renderPage,
  setSearchParams,
} from "./workload-board-page-test-harness";

beforeEach(installWorkloadMocks);

describe("WorkloadBoardPage — URL param forwarding to useWorkloadCapacity", () => {
  it("passes from and to query params as start and end to useWorkloadCapacity so shared links preserve the capacity window", () => {
    setSearchParams("from=2026-01-01&to=2026-01-14");
    renderPage();
    expect(mockUseWorkloadCapacity).toHaveBeenCalledWith(
      1,
      "2026-01-01",
      "2026-01-14",
      undefined,
    );
  });

  it("defaults capacity window to today + 13 days when from and to are absent from the URL", () => {
    renderPage();
    const calls = mockUseWorkloadCapacity.mock.calls;
    expect(calls.length).toBeGreaterThan(0);
    const [, start, end] = calls[0] as unknown[];
    expect(typeof start).toBe("string");
    expect(typeof end).toBe("string");
    expect(String(start).length).toBe(10);
    expect(String(end).length).toBe(10);
  });

  it("passes teamId as a number to useWorkloadCapacity when the teamId URL param is present so the capacity endpoint can filter by team", () => {
    setSearchParams("teamId=5");
    renderPage();
    expect(mockUseWorkloadCapacity).toHaveBeenCalledWith(
      1,
      expect.any(String),
      expect.any(String),
      5,
    );
  });

  it("passes undefined teamId to useWorkloadCapacity when teamId is absent from the URL so unfiltered capacity is returned", () => {
    renderPage();
    expect(mockUseWorkloadCapacity).toHaveBeenCalledWith(
      1,
      expect.any(String),
      expect.any(String),
      undefined,
    );
  });
});

describe("WorkloadBoardPage — URL param forwarding to useProjectBoardTickets", () => {
  it("passes memberId from the URL as assigneeId to useProjectBoardTickets so the member filter persists across reloads", () => {
    setSearchParams("memberId=user-abc");
    renderPage();
    expect(mockUseProjectBoardTickets).toHaveBeenCalledWith(
      1,
      expect.objectContaining({ assigneeId: "user-abc" }),
    );
  });

  it("passes undefined as assigneeId when memberId is absent from the URL so all members' tickets are fetched", () => {
    renderPage();
    expect(mockUseProjectBoardTickets).toHaveBeenCalledWith(
      1,
      expect.objectContaining({ assigneeId: undefined }),
    );
  });
});

describe("WorkloadBoardPage — filter change writes memberId to URL", () => {
  it("calls router.replace with memberId in the URL when the assigneeId filter changes to a non-all value, so the selection is bookmarkable", () => {
    renderPage();
    captured.filterBarProps.onFilterChange?.("assigneeId", "user-xyz");
    expect(mockReplace).toHaveBeenCalledWith(
      expect.stringContaining("memberId=user-xyz"),
      expect.anything(),
    );
  });

  it("removes memberId from the URL when the assigneeId filter is cleared to all, so the URL stays clean when no filter is active", () => {
    setSearchParams("memberId=user-abc");
    renderPage();
    captured.filterBarProps.onFilterChange?.("assigneeId", "all");
    const callArg: string = mockReplace.mock.calls[0][0];
    expect(callArg).not.toContain("memberId=");
  });

  it("removes memberId from the URL when onClearFilters fires", () => {
    setSearchParams("memberId=user-abc");
    renderPage();
    act(() => {
      captured.filterBarProps.onClearFilters?.();
    });
    const callArg: string = mockReplace.mock.calls[0][0];
    expect(callArg).not.toContain("memberId=");
  });
});

describe("WorkloadBoardPage — URL param forwarding: teamId writes to URL", () => {
  it("calls router.replace with teamId in the URL when the teamId filter changes to a non-all value, so capacity is filtered to that team", () => {
    renderPage();
    captured.filterBarProps.onFilterChange?.("teamId", "7");
    expect(mockReplace).toHaveBeenCalledWith(
      expect.stringContaining("teamId=7"),
      expect.anything(),
    );
  });

  it("removes teamId from the URL when the teamId filter is cleared to all, so the URL stays clean when no team filter is active", () => {
    setSearchParams("teamId=7");
    renderPage();
    captured.filterBarProps.onFilterChange?.("teamId", "all");
    const callArg: string = mockReplace.mock.calls[0][0];
    expect(callArg).not.toContain("teamId=");
  });

  it("removes teamId from the URL when onClearFilters fires", () => {
    setSearchParams("teamId=7");
    renderPage();
    act(() => {
      captured.filterBarProps.onClearFilters?.();
    });
    const callArg: string = mockReplace.mock.calls[0][0];
    expect(callArg).not.toContain("teamId=");
  });

  it("derives teamId for workloadFilters from URL so a page reload re-applies the filter without a separate state sync", () => {
    setSearchParams("teamId=9");
    renderPage();
    expect(captured.filterBarProps.filters?.["teamId"]).toBe("9");
  });

  it("shows no teamId filter when teamId is absent from the URL — filters.teamId defaults to all", () => {
    renderPage();
    expect(captured.filterBarProps.filters?.["teamId"]).toBe("all");
  });
});
