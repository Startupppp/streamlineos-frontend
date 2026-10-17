import { renderHook } from "@testing-library/react";
import { useProductFeedbackFilters } from "./use-product-feedback-filters";
import { BUILD_FILTER_ALL } from "@/features/build/shared/use-build-list-filters";

const mockSetValue = jest.fn();
const mockParams = new URLSearchParams();

jest.mock("next/navigation", () => ({
  usePathname: () => "/build/managed-products/7/feedback",
  useRouter: () => ({ replace: jest.fn() }),
  useSearchParams: () => mockParams,
}));

jest.mock("@/hooks/common/use-debounce", () => ({
  useDebouncedValue: (v: string) => v,
}));

jest.mock("@/hooks/common/use-source-override", () => ({
  useSourceOverride: (_key: string, init: unknown) => [init, jest.fn()],
}));

jest.mock("@/features/build/shared/use-build-list-filters", () => {
  const actual = jest.requireActual("@/features/build/shared/use-build-list-filters") as typeof import("@/features/build/shared/use-build-list-filters");
  return {
    ...actual,
    useBuildListFilters: () => ({
      value: (param: string) => mockParams.get(param) ?? actual.BUILD_FILTER_ALL,
      isActive: (param: string) => {
        const v = mockParams.get(param);
        return v !== null && v !== actual.BUILD_FILTER_ALL;
      },
      setValue: mockSetValue,
      setValues: jest.fn(),
      clearAll: jest.fn(),
      activeCount: 0,
      isFiltered: false,
      search: "",
      debouncedSearch: "",
      setSearch: jest.fn(),
      cursor: null,
      setCursor: jest.fn(),
      resetKey: mockParams.toString(),
      isPending: false,
      searchParams: mockParams,
    }),
    BUILD_FILTER_ALL: actual.BUILD_FILTER_ALL,
  };
});

const PRODUCT_ID = 7;

function renderFilters() {
  return renderHook(() => useProductFeedbackFilters(PRODUCT_ID));
}

beforeEach(() => {
  mockSetValue.mockClear();
  for (const key of [...mockParams.keys()]) {
    mockParams.delete(key);
  }
});

describe("useProductFeedbackFilters — multi-value URL round-trip", () => {
  it("decodes comma-separated sourceChannel into an array sent to the backend", () => {
    mockParams.set("sourceChannel", "email,support");

    const { result } = renderFilters();
    expect(result.current.queryParams.sourceChannel).toEqual(["email", "support"]);
  });

  it("decodes comma-separated segment into an array sent to the backend", () => {
    mockParams.set("segment", "Enterprise,SMB");

    const { result } = renderFilters();
    expect(result.current.queryParams.segment).toEqual(["Enterprise", "SMB"]);
  });

  it("decodes comma-separated crmOrganizationId into a number array", () => {
    mockParams.set("crmOrganizationId", "3,7");

    const { result } = renderFilters();
    expect(result.current.queryParams.crmOrganizationId).toEqual([3, 7]);
  });

  it("decodes comma-separated sentiment into an array sent to the backend", () => {
    mockParams.set("sentiment", "positive,negative");

    const { result } = renderFilters();
    expect(result.current.queryParams.sentiment).toEqual(["positive", "negative"]);
  });

  it("handleSourceChannelValuesChange serializes an array as comma-separated", () => {
    const { result } = renderFilters();
    result.current.handleSourceChannelValuesChange(["email", "widget"]);

    expect(mockSetValue).toHaveBeenCalledWith("sourceChannel", "email,widget");
  });

  it("removing one channel from three serializes the two remaining", () => {
    mockParams.set("sourceChannel", "email,widget,survey");
    const { result } = renderFilters();

    const current = result.current.appliedSourceChannels ?? [];
    expect(current).toEqual(["email", "widget", "survey"]);

    result.current.handleSourceChannelValuesChange(current.filter((v) => v !== "widget"));

    expect(mockSetValue).toHaveBeenCalledWith("sourceChannel", "email,survey");
  });

  it("passing an empty array writes BUILD_FILTER_ALL to clear the filter", () => {
    const { result } = renderFilters();
    result.current.handleSourceChannelValuesChange([]);

    expect(mockSetValue).toHaveBeenCalledWith("sourceChannel", BUILD_FILTER_ALL);
  });

  it("appliedSourceChannels is undefined when sourceChannel param is absent", () => {
    const { result } = renderFilters();
    expect(result.current.appliedSourceChannels).toBeUndefined();
  });

  it("isFiltered is true when any multi-value filter has values", () => {
    mockParams.set("segment", "Enterprise");

    const { result } = renderFilters();
    expect(result.current.isFiltered).toBe(true);
  });

  it("decodes comma-separated status into an array sent to the backend", () => {
    mockParams.set("status", "open,in_progress");

    const { result } = renderFilters();
    expect(result.current.queryParams.status).toEqual(["open", "in_progress"]);
  });

  it("decodes a single status value into a one-element array for backward compatibility", () => {
    mockParams.set("status", "resolved");

    const { result } = renderFilters();
    expect(result.current.queryParams.status).toEqual(["resolved"]);
  });

  it("omits status from query when URL carries an invalid value so no invalid enum reaches the backend", () => {
    mockParams.set("status", "bogus_status");

    const { result } = renderFilters();
    expect(result.current.queryParams.status).toBeUndefined();
  });

  it("decodes comma-separated assigneeId into an array sent to the backend", () => {
    mockParams.set("assigneeId", "user-a,user-b");

    const { result } = renderFilters();
    expect(result.current.queryParams.assigneeId).toEqual(["user-a", "user-b"]);
  });

  it("decodes a single assigneeId value into a one-element array for backward compatibility", () => {
    mockParams.set("assigneeId", "user-99");

    const { result } = renderFilters();
    expect(result.current.queryParams.assigneeId).toEqual(["user-99"]);
  });

  it("handleStatusValuesChange serializes an array as comma-separated", () => {
    const { result } = renderFilters();
    result.current.handleStatusValuesChange(["open", "resolved"]);

    expect(mockSetValue).toHaveBeenCalledWith("status", "open,resolved");
  });

  it("handleStatusValuesChange with empty array writes BUILD_FILTER_ALL to clear the filter", () => {
    const { result } = renderFilters();
    result.current.handleStatusValuesChange([]);

    expect(mockSetValue).toHaveBeenCalledWith("status", BUILD_FILTER_ALL);
  });

  it("handleAssigneeValuesChange serializes an array as comma-separated", () => {
    const { result } = renderFilters();
    result.current.handleAssigneeValuesChange(["user-a", "user-b"]);

    expect(mockSetValue).toHaveBeenCalledWith("assigneeId", "user-a,user-b");
  });

  it("handleAssigneeValuesChange with empty array writes BUILD_FILTER_ALL to clear the filter", () => {
    const { result } = renderFilters();
    result.current.handleAssigneeValuesChange([]);

    expect(mockSetValue).toHaveBeenCalledWith("assigneeId", BUILD_FILTER_ALL);
  });

  it("appliedStatuses is undefined when status param is absent", () => {
    const { result } = renderFilters();
    expect(result.current.appliedStatuses).toBeUndefined();
  });

  it("appliedAssigneeIds is undefined when assigneeId param is absent", () => {
    const { result } = renderFilters();
    expect(result.current.appliedAssigneeIds).toBeUndefined();
  });

  it("isFiltered is true when status filter has values", () => {
    mockParams.set("status", "open");

    const { result } = renderFilters();
    expect(result.current.isFiltered).toBe(true);
  });

  it("isFiltered is true when assigneeId filter has values", () => {
    mockParams.set("assigneeId", "user-x");

    const { result } = renderFilters();
    expect(result.current.isFiltered).toBe(true);
  });
});
