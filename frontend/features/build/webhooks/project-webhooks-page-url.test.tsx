import { render, screen, fireEvent } from "@testing-library/react";
import {
  SAMPLE_WEBHOOK,
  mockGoNext,
  mockGoPrevious,
  mockUseBuildCursorPager,
  mockUseWebhooks,
  st,
} from "./webhook-page-test-harness";
import { ProjectWebhooksPage } from "./project-webhooks-page";

describe("ProjectWebhooksPage — URL-backed filters (BLD-X-FE-SETTINGS-WH-033)", () => {
  it("renders the state filter control — allowing the operator to view only active or inactive webhooks", () => {
    st.accessState = "granted";
    render(<ProjectWebhooksPage projectId="1" />);
    expect(screen.getByRole("combobox", { name: /filter by state/i })).toBeInTheDocument();
  });

  it("renders the event filter control — paired with the state filter so the toolbar renders even with no webhooks", () => {
    st.accessState = "granted";
    render(<ProjectWebhooksPage projectId="1" />);
    expect(screen.getByRole("combobox", { name: /filter by event/i })).toBeInTheDocument();
  });

  it("renders the URL search input — so the operator can search webhooks by URL prefix", () => {
    st.accessState = "granted";
    render(<ProjectWebhooksPage projectId="1" />);
    expect(screen.getByRole("searchbox", { name: /search webhooks/i })).toBeInTheDocument();
  });

  it("renders all three filter controls on the same toolbar — all must be present before any filtering logic runs", () => {
    st.accessState = "granted";
    render(<ProjectWebhooksPage projectId="1" />);
    expect(screen.getByRole("combobox", { name: /filter by state/i })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: /filter by event/i })).toBeInTheDocument();
    expect(screen.getByRole("searchbox", { name: /search webhooks/i })).toBeInTheDocument();
  });
});

describe("ProjectWebhooksPage — URL-backed cursor pagination (BLD-X-FE-SETTINGS-WH-034)", () => {
  it("resets the URL cursor stack whenever the filter shape changes so a shared link cannot pin a stale page", () => {
    st.accessState = "granted";
    st.webhooks = [SAMPLE_WEBHOOK];
    render(<ProjectWebhooksPage projectId="1" />);
    expect(mockUseBuildCursorPager).toHaveBeenCalledWith("||||");
  });

  it("forwards the URL-backed cursor to useWebhooks as a number so page 2 is fetched server-side", () => {
    st.accessState = "granted";
    st.webhooks = [SAMPLE_WEBHOOK];
    st.pagerCursor = "41";
    st.pagerHasPrevious = true;
    render(<ProjectWebhooksPage projectId="1" />);
    expect(mockUseWebhooks).toHaveBeenCalledWith(
      1,
      expect.objectContaining({ cursor: 41 }),
    );
  });

  it("sends no cursor to useWebhooks when the URL carries no cursor stack", () => {
    st.accessState = "granted";
    st.webhooks = [SAMPLE_WEBHOOK];
    render(<ProjectWebhooksPage projectId="1" />);
    expect(mockUseWebhooks).toHaveBeenCalledWith(1, undefined);
  });

  it("hides the pagination footer on a single page — there is no reveal button and no faked page count", () => {
    st.accessState = "granted";
    st.webhooks = [SAMPLE_WEBHOOK];
    render(<ProjectWebhooksPage projectId="1" />);
    expect(screen.queryByRole("navigation", { name: /pagination/i })).not.toBeInTheDocument();
  });

  it("shows prev/next controls once the server reports more rows — paired with the single-page assertion above", () => {
    st.accessState = "granted";
    st.webhooks = [SAMPLE_WEBHOOK];
    st.hasMore = true;
    st.nextCursor = 7;
    render(<ProjectWebhooksPage projectId="1" />);
    expect(screen.getByRole("navigation", { name: /pagination/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /next page/i })).toBeEnabled();
  });

  it("advances the URL cursor stack with the server nextCursor when Next page is pressed", () => {
    st.accessState = "granted";
    st.webhooks = [SAMPLE_WEBHOOK];
    st.hasMore = true;
    st.nextCursor = 7;
    render(<ProjectWebhooksPage projectId="1" />);
    fireEvent.click(screen.getByRole("button", { name: /next page/i }));
    expect(mockGoNext).toHaveBeenCalledWith("7");
  });

  it("does not advance the cursor stack when the server reports no nextCursor", () => {
    st.accessState = "granted";
    st.webhooks = [SAMPLE_WEBHOOK];
    st.hasMore = true;
    st.nextCursor = null;
    render(<ProjectWebhooksPage projectId="1" />);
    fireEvent.click(screen.getByRole("button", { name: /next page/i }));
    expect(mockGoNext).toHaveBeenCalledWith(undefined);
  });

  it("pops the URL cursor stack when Previous page is pressed", () => {
    st.accessState = "granted";
    st.webhooks = [SAMPLE_WEBHOOK];
    st.pagerCursor = "41";
    st.pagerHasPrevious = true;
    render(<ProjectWebhooksPage projectId="1" />);
    fireEvent.click(screen.getByRole("button", { name: /previous page/i }));
    expect(mockGoPrevious).toHaveBeenCalled();
  });
});

describe("ProjectWebhooksPage — from/to date filters (BLD-X-FE-SETTINGS-WH-035)", () => {
  it("renders the from date input so the operator can filter by creation start date", () => {
    st.accessState = "granted";
    render(<ProjectWebhooksPage projectId="1" />);
    expect(screen.getByLabelText("Filter from date")).toBeInTheDocument();
  });

  it("renders the to date input — paired with from so both are always present", () => {
    st.accessState = "granted";
    render(<ProjectWebhooksPage projectId="1" />);
    expect(screen.getByLabelText("Filter to date")).toBeInTheDocument();
  });

  it("forwards from and to to useWebhooks when the URL carries those params so the filter narrows results server-side", () => {
    st.accessState = "granted";
    st.webhooks = [SAMPLE_WEBHOOK];
    st.pagerCursor = undefined;
    st.searchParams = new URLSearchParams("from=2026-01-01&to=2026-06-30");
    render(<ProjectWebhooksPage projectId="1" />);
    expect(mockUseWebhooks).toHaveBeenCalledWith(
      1,
      expect.objectContaining({ from: "2026-01-01", to: "2026-06-30" }),
    );
  });

  it("includes from and to in the pager reset key so pagination resets when the date range changes", () => {
    st.accessState = "granted";
    st.searchParams = new URLSearchParams("from=2026-01-01");
    render(<ProjectWebhooksPage projectId="1" />);
    const lastArg = mockUseBuildCursorPager.mock.calls.at(-1)?.[0] as string;
    expect(lastArg).toContain("2026-01-01");
  });
});
