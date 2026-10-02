import { readFileSync } from "node:fs";
import { join } from "node:path";
import { render, screen } from "@testing-library/react";
import { ApiError } from "@/lib/api-envelope";
import { INLINE_READ_ERROR } from "@/lib/query-error-policy";

const rolloutDocuments = jest.fn();
const refetch = jest.fn();

jest.mock("@/hooks/api/hr/recruitment", () => ({
  useRolloutDocuments: () => rolloutDocuments(),
}));

jest.mock("@/components/hr/recruitment/rollout-documents-dialog", () => ({
  RolloutDocumentsDialog: () => null,
}));

import { DocumentsTab } from "./documents-tab";

const PROPS = {
  candidateId: 11,
  candidateName: "A Candidate",
  candidateStatus: "OFFER",
};

function failing(status: number) {
  return {
    data: undefined,
    isLoading: false,
    isError: true,
    error: new ApiError("Internal server error", status),
    refetch,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  rolloutDocuments.mockReturnValue({
    data: [],
    isLoading: false,
    isError: false,
    error: null,
    refetch,
  });
});

describe("HRMS follow-up #177 the candidate documents tab announces a failed read", () => {
  it("renders the documents tab on a healthy session, so the failure cases below are not passing on a tab that never mounts", () => {
    render(<DocumentsTab {...PROPS} />);

    expect(screen.getAllByRole("button", { name: /generate offer/i }).length).toBeGreaterThan(0);
  });

  it("keeps a failing rollout-documents read inside this tab instead of blanking the candidate route", () => {
    const source = readFileSync(
      join(process.cwd(), "hooks/api/hr/recruitment/candidate-details.ts"),
      "utf8",
    );
    const declaration = source.slice(source.indexOf("export function useRolloutDocuments"));
    const body = declaration.slice(0, declaration.indexOf("\n}\n"));

    expect(INLINE_READ_ERROR).toEqual({ throwOnError: false });
    expect(body).toContain("...INLINE_READ_ERROR,");
  });

  it("announces the failure through the shared ErrorState rather than a hand-rolled box a screen reader never reads", () => {
    rolloutDocuments.mockReturnValue(failing(500));
    render(<DocumentsTab {...PROPS} />);

    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /try again/i })).toBeInTheDocument();
  });

  it("does not claim the candidate has no documents yet when the read failed", () => {
    rolloutDocuments.mockReturnValue(failing(500));
    render(<DocumentsTab {...PROPS} />);

    expect(screen.queryByText(/no documents yet/i)).toBeNull();
  });

  it("offers no Generate Offer next step while the tab is erroring, because retry is the action then", () => {
    rolloutDocuments.mockReturnValue(failing(500));
    render(<DocumentsTab {...PROPS} />);

    expect(screen.queryByRole("button", { name: /generate offer/i })).toBeNull();
  });

  it("retries the failed read on this tab rather than reloading the route", () => {
    rolloutDocuments.mockReturnValue(failing(500));
    render(<DocumentsTab {...PROPS} />);
    screen.getByRole("button", { name: /try again/i }).click();

    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it("still shows the honest empty state with its CTA when the candidate genuinely has no documents", () => {
    render(<DocumentsTab {...PROPS} />);

    expect(screen.getByText(/no documents yet/i)).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /generate offer/i }).length).toBeGreaterThan(0);
  });
});
