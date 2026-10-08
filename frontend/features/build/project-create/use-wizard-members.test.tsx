import { renderHook } from "@testing-library/react";
import { useWizardMembers } from "./use-wizard-members";
import { useBuildMembers } from "@/hooks/api/build/build-members";

jest.mock("@/hooks/api/build/build-members", () => ({
  useBuildMembers: jest.fn(),
}));

const mockUseBuildMembers = useBuildMembers as jest.Mock;

describe("useWizardMembers", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("uses the canonical Build actor directory for project manager and team choices", () => {
    mockUseBuildMembers.mockReturnValue({
      data: {
        data: [
          {
            id: "build-1",
            name: "Build Member",
            firstName: "Build",
            lastName: "Member",
            email: "build@x.com",
            image: null,
            role: "member",
            addedAt: "2026-10-08T00:00:00.000Z",
            teams: [],
          },
        ],
      },
    });

    const { result } = renderHook(() => useWizardMembers());

    expect(result.current).toEqual([
      { userId: "build-1", name: "Build Member", email: "build@x.com", image: null },
    ]);
    expect(mockUseBuildMembers).toHaveBeenCalledWith({ limit: 100 });
  });

  it("returns an empty module directory while Build members are unavailable", () => {
    mockUseBuildMembers.mockReturnValue({ data: undefined });

    const { result } = renderHook(() => useWizardMembers(25));

    expect(result.current).toEqual([]);
    expect(mockUseBuildMembers).toHaveBeenCalledWith({ limit: 25 });
  });
});
