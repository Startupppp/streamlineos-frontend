import { act, renderHook } from "@testing-library/react";

const mockCreate = jest.fn();

jest.mock("next/navigation", () => ({ useRouter: () => ({ replace: jest.fn() }) }));
jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));
jest.mock("@/hooks/api/hr", () => {
  const idle = () => ({ mutate: jest.fn(), isPending: false });
  return {
    useCreateTermination: () => ({ mutate: mockCreate, isPending: false }),
    useSubmitTermination: idle,
    useCompleteTermination: idle,
    useFinalReviewTermination: idle,
    useSendTerminationEmail: idle,
  };
});

import { useTerminationActions } from "../use-termination-actions";

/** HR-U-026: an approver's create used to approve the termination on the first click. */

function setup(canApproveExit: boolean) {
  const { result } = renderHook(() =>
    useTerminationActions({
      canApproveExit,
      terminations: [],
      employees: [],
      employeeUserIdParam: null,
      prefillMissing: false,
    }),
  );
  act(() => {
    result.current.setSelectedEmployeeUserId("user-9");
    result.current.setSelectedReason("Misconduct");
    result.current.handleEffectiveDateChange("2999-01-01");
  });
  return result;
}

beforeEach(() => mockCreate.mockClear());

describe("useTerminationActions create confirmation", () => {
  it("asks an approver to confirm before creating an approved termination", () => {
    const result = setup(true);
    act(() => result.current.handleCreateSubmit());
    expect(result.current.confirmCreateOpen).toBe(true);
    expect(mockCreate).not.toHaveBeenCalled();

    act(() => result.current.performCreate());
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({ employeeUserId: "user-9", saveAsDraft: false }),
      expect.anything(),
    );
  });

  it("saves an approver's draft straight away, with the draft flag", () => {
    const result = setup(true);
    act(() => result.current.setSaveAsDraft(true));
    act(() => result.current.handleCreateSubmit());
    expect(result.current.confirmCreateOpen).toBe(false);
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({ saveAsDraft: true }),
      expect.anything(),
    );
  });

  it("creates a non-approver's draft without a confirm and without the flag", () => {
    const result = setup(false);
    act(() => result.current.handleCreateSubmit());
    expect(result.current.confirmCreateOpen).toBe(false);
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({ saveAsDraft: undefined }),
      expect.anything(),
    );
  });
});
