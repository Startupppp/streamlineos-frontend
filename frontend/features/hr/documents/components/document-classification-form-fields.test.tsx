import { fireEvent, render, screen } from "@testing-library/react";
import { useForm } from "react-hook-form";
import { Form } from "@/components/ui/form";
import { ApiError } from "@/lib/api-envelope";
import { getErrorMessage } from "@/lib/get-error-message";
import type { ClassificationFormValues } from "./document-classification-model";
import { DocumentClassificationFormFields } from "./document-classification-form-fields";

const mockAccess = jest.fn<"loading" | "granted" | "denied", [string]>();
jest.mock("@/hooks/api/access", () => ({ useCanState: (key: string) => mockAccess(key) }));

const mockDepartments = jest.fn();
const mockLocations = jest.fn();
jest.mock("@/hooks/api/org-hierarchy-units", () => ({ useOrgDepartments: () => mockDepartments() }));
jest.mock("@/hooks/api/org-hierarchy", () => ({ useOrgLocations: () => mockLocations() }));

const DEPARTMENTS = [{ id: "d1", name: "Finance" }, { id: "d2", name: "Legal" }];
const LOCATIONS = [{ id: "l1", name: "Pune" }];

function loadedList(units: Array<{ id: string; name: string }>, hasMore = false) {
  return {
    data: { data: units, pageInfo: { hasMore } },
    isPending: false,
    isFetching: false,
    isError: false,
    error: null,
    refetch: jest.fn(),
  };
}

/** What TanStack Query v5 reports for a read that is switched off: pending, and not fetching, so `isLoading` is false. */
function disabledList() {
  return { data: undefined, isPending: true, isFetching: false, isError: false, error: null, refetch: jest.fn() };
}

function fetchingList() {
  return { ...disabledList(), isFetching: true };
}

function failedList(error: Error, refetch: jest.Mock) {
  return { data: undefined, isPending: false, isFetching: false, isError: true, error, refetch };
}

function Harness({ values = {} }: { values?: Partial<ClassificationFormValues> }) {
  const form = useForm<ClassificationFormValues>({
    defaultValues: {
      classification: "RESTRICTED",
      effectiveDate: "",
      audienceMode: "SELECTED",
      departmentIds: [],
      locationIds: [],
      ...values,
    },
  });
  return (
    <Form {...form}>
      <DocumentClassificationFormFields canPublish sharingBlocked={false} />
      <output data-testid="effective-date">{form.watch("effectiveDate")}</output>
    </Form>
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  mockAccess.mockReturnValue("granted");
  mockDepartments.mockReturnValue(loadedList(DEPARTMENTS));
  mockLocations.mockReturnValue(loadedList(LOCATIONS));
});

describe("audience department and location picker", () => {
  it("lists the departments and locations for someone who can view organisation settings", () => {
    render(<Harness />);

    expect(screen.getByRole("checkbox", { name: "Finance" })).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "Legal" })).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "Pune" })).toBeInTheDocument();
    expect(screen.queryByText(/not available to you/i)).not.toBeInTheDocument();
    expect(screen.queryByText("Loading…")).not.toBeInTheDocument();
  });

  it("says the list is not available, rather than loading or empty, when the person cannot view organisation settings", () => {
    mockAccess.mockReturnValue("denied");
    mockDepartments.mockReturnValue(disabledList());
    mockLocations.mockReturnValue(disabledList());
    render(<Harness />);

    expect(mockAccess).toHaveBeenCalledWith("settings:view");
    expect(screen.getByText("Departments and locations are not available to you")).toBeInTheDocument();
    expect(screen.getByText(/you can still choose all employees or hr only/i)).toBeInTheDocument();
    expect(screen.queryByText("Loading…")).not.toBeInTheDocument();
    expect(screen.queryByText(/to choose from/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
  });

  it("still says what is already chosen when the person cannot see the names", () => {
    mockAccess.mockReturnValue("denied");
    mockDepartments.mockReturnValue(disabledList());
    mockLocations.mockReturnValue(disabledList());
    render(<Harness values={{ departmentIds: ["d1", "d2"], locationIds: ["l1"] }} />);

    expect(screen.getByText(/already chosen: 2 departments and 1 location\./i)).toBeInTheDocument();
  });

  it("says loading, not denied, while the person's own access is still arriving", () => {
    mockAccess.mockReturnValue("loading");
    mockDepartments.mockReturnValue(disabledList());
    mockLocations.mockReturnValue(disabledList());
    render(<Harness />);

    expect(screen.getAllByText("Loading…")).toHaveLength(2);
    expect(screen.queryByText(/not available to you/i)).not.toBeInTheDocument();
  });

  it("says loading while the lists are being fetched, and not that there is nothing to choose", () => {
    mockDepartments.mockReturnValue(fetchingList());
    mockLocations.mockReturnValue(fetchingList());
    render(<Harness />);

    expect(screen.getAllByText("Loading…")).toHaveLength(2);
    expect(screen.queryByText(/to choose from/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
  });

  it("says a list failed to load, with the reason and a retry, and leaves the other list usable", () => {
    const refetch = jest.fn();
    const error = new ApiError("Server error", 500, "INTERNAL", { correlationId: "req-1" }, "/org-hierarchy/departments");
    mockDepartments.mockReturnValue(failedList(error, refetch));
    render(<Harness />);

    expect(screen.getByText("Could not load the departments.")).toBeInTheDocument();
    expect(screen.getByText(getErrorMessage(error))).toBeInTheDocument();
    expect(screen.queryByText(/no departments to choose from/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/could not load the locations/i)).not.toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "Pune" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /try again/i }));

    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it("says there is nothing to choose from only when the lists really are empty", () => {
    mockDepartments.mockReturnValue(loadedList([]));
    mockLocations.mockReturnValue(loadedList([]));
    render(<Harness />);

    expect(screen.getByText(/no departments to choose from/i)).toBeInTheDocument();
    expect(screen.getByText(/no locations to choose from/i)).toBeInTheDocument();
    expect(screen.queryByText("Loading…")).not.toBeInTheDocument();
    expect(screen.queryByText(/not available to you/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /try again/i })).not.toBeInTheDocument();
  });

  it("says a list is cut off when there are more units than were read, and only for that list", () => {
    mockDepartments.mockReturnValue(loadedList(DEPARTMENTS, true));
    render(<Harness />);

    expect(screen.getByText(/showing the first 100 departments/i)).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "Finance" })).toBeInTheDocument();
    expect(screen.queryByText(/showing the first 100 locations/i)).not.toBeInTheDocument();
  });
});

describe("effective date", () => {
  it("offers Clear only once a date is set, and Clear removes the date", () => {
    render(<Harness values={{ effectiveDate: "2026-03-15", audienceMode: "HR_ONLY" }} />);

    expect(screen.getByText("March 15th, 2026")).toBeInTheDocument();
    expect(screen.getByTestId("effective-date")).toHaveTextContent("2026-03-15");
    const clear = screen.getByRole("button", { name: /clear effective date/i });
    expect(clear).toHaveAttribute("type", "button");

    fireEvent.click(clear);

    expect(screen.getByTestId("effective-date")).toBeEmptyDOMElement();
    expect(screen.getByText("No date")).toBeInTheDocument();
    expect(screen.queryByText("March 15th, 2026")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /clear effective date/i })).not.toBeInTheDocument();
  });

  it("offers no Clear when there is no date to clear", () => {
    render(<Harness values={{ effectiveDate: "", audienceMode: "HR_ONLY" }} />);

    expect(screen.getByText("No date")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /clear effective date/i })).not.toBeInTheDocument();
  });
});
