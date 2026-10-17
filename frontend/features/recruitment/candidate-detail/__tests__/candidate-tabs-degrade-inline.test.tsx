import { readFileSync } from "node:fs";
import { join } from "node:path";
import { render, screen } from "@testing-library/react";
import { ApiError } from "@/lib/api-envelope";
import { getErrorMessage } from "@/lib/get-error-message";
import {
  INLINE_READ_ERROR,
  readErrorReachesBoundary,
} from "@/lib/query-error-policy";
import { VaultTab } from "../vault-tab";

const HOOKS = join(process.cwd(), "hooks/api/hr/recruitment/candidate-details.ts");

const vault = jest.fn();
const refetch = jest.fn();

jest.mock("@/hooks/api/hr/recruitment", () => ({
  useCandidateVault: () => vault(),
  useDeleteVaultDocument: () => ({ mutate: jest.fn(), isPending: false }),
}));

jest.mock("../vault-bgv-tracker", () => ({ BgvTracker: () => null }));
jest.mock("../assessments-card", () => ({ AssessmentsCard: () => null }));
jest.mock("../voice-screens-card", () => ({ VoiceScreensCard: () => null }));
jest.mock("../identity-card", () => ({ IdentityCard: () => null }));
jest.mock("../candidate-consent-card", () => ({ CandidateConsentCard: () => null }));
jest.mock("../vault-upload-area", () => ({ VaultUploadArea: () => null }));
jest.mock("../vault-access-log", () => ({ VaultAccessLog: () => null }));

const PROPS = {
  candidateId: 11,
  bgvStatus: null,
  bgvAgency: null,
  bgvNotes: null,
  bgvInitiatedAt: null,
  bgvCompletedAt: null,
};

function bodyOf(name: string, next: string): string {
  const source = readFileSync(HOOKS, "utf8");
  const body = source.slice(source.indexOf(`export function ${name}`));
  return body.slice(0, body.indexOf(`export function ${next}`));
}

beforeEach(() => {
  jest.clearAllMocks();
  vault.mockReturnValue({
    data: [],
    isLoading: false,
    isError: false,
    error: null,
    refetch,
  });
});

describe("HRMS-B2-009 a failed candidate tab read stays on the tab instead of claiming the candidate has nothing", () => {
  it("still shows the honest empty state when the vault genuinely holds no documents", () => {
    render(<VaultTab {...PROPS} />);

    expect(screen.getByText(/no documents yet/i)).toBeInTheDocument();
  });

  it("shows an inline error with retry, and no emptiness claim, when the vault read 500s", () => {
    vault.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: new ApiError("Internal server error", 500),
      refetch,
    });
    render(<VaultTab {...PROPS} />);

    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /try again/i })).toBeInTheDocument();
    expect(screen.queryByText(/no documents yet/i)).toBeNull();
  });

  it("describes the failure through the shared error reader rather than a hardcoded contact-an-admin line", () => {
    vault.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: new ApiError("Internal server error", 500),
      refetch,
    });
    render(<VaultTab {...PROPS} />);

    expect(screen.queryByText(/contact an admin/i)).toBeNull();
    expect(
      screen.getByText(getErrorMessage(new ApiError("Internal server error", 500))),
    ).toBeInTheDocument();
  });

  it("retries the read itself, with no click event leaking into the query's refetch options", () => {
    vault.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: new ApiError("Internal server error", 500),
      refetch,
    });
    render(<VaultTab {...PROPS} />);
    screen.getByRole("button", { name: /try again/i }).click();

    expect(refetch).toHaveBeenCalledTimes(1);
    expect(refetch).toHaveBeenCalledWith();
  });

  it("opts every candidate-detail tab read out of the error boundary, because each tab's error branch is dead code on the provider default", () => {
    expect(
      readErrorReachesBoundary(new ApiError("Internal server error", 500), {
        state: { data: undefined },
      }),
    ).toBe(true);
    expect(INLINE_READ_ERROR).toEqual({ throwOnError: false });

    expect(bodyOf("useCandidateActivity", "useCandidateVault")).toContain(
      "...INLINE_READ_ERROR,",
    );
    expect(bodyOf("useCandidateVault", "useAddVaultDocument")).toContain(
      "...INLINE_READ_ERROR,",
    );
    expect(bodyOf("useRolloutDocuments", "useGenerateAndRollout")).toContain(
      "...INLINE_READ_ERROR,",
    );
    expect(bodyOf("useCandidateReferrals", "useCreateReferral")).toContain(
      "...INLINE_READ_ERROR,",
    );
    expect(bodyOf("useReferenceChecks", "useCreateReferenceCheck")).toContain(
      "...INLINE_READ_ERROR,",
    );
  });
});
