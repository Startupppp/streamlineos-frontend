import { renderHook } from "@testing-library/react";
import { useWizardMembers } from "./use-wizard-members";
import { useCan } from "@/hooks/api/access";
import { useOrgMembers } from "@/hooks/api/organization";
import { useBuildMembers } from "@/hooks/api/build/build-members";

jest.mock("@/hooks/api/access", () => ({
  useCan: jest.fn(),
}));

jest.mock("@/hooks/api/organization", () => ({
  useOrgMembers: jest.fn(),
}));

jest.mock("@/hooks/api/build/build-members", () => ({
  useBuildMembers: jest.fn(),
}));

const mockUseCan = useCan as jest.Mock;
const mockUseOrgMembers = useOrgMembers as jest.Mock;
const mockUseBuildMembers = useBuildMembers as jest.Mock;

describe("useWizardMembers", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("uses org members when settings:view is granted", () => {
    mockUseCan.mockImplementation((key: string) => key === "settings:view");
    mockUseOrgMembers.mockReturnValue({
      data: {
        data: [
          {
            userId: "u1",
            name: "Alice",
            email: "a@x.com",
            image: null,
          },
        ],
      },
    });
    mockUseBuildMembers.mockReturnValue({ data: undefined });

    const { result } = renderHook(() => useWizardMembers());

    expect(result.current).toEqual([
      { userId: "u1", name: "Alice", email: "a@x.com", image: null },
    ]);
    expect(mockUseOrgMembers).toHaveBeenCalledWith(
      1,
      100,
      undefined,
      expect.objectContaining({ enabled: true }),
    );
    expect(mockUseBuildMembers).toHaveBeenCalledWith(
      { limit: 100 },
      expect.objectContaining({ enabled: false }),
    );
  });

  it("loads build members when settings:view is denied so review can resolve selected ids", () => {
    mockUseCan.mockImplementation((key: string) => key === "build:members:view");
    mockUseOrgMembers.mockReturnValue({ data: undefined });
    mockUseBuildMembers.mockReturnValue({
      data: {
        data: [
          {
            id: "creator-1",
            name: "sosec237732",
            firstName: "sosec237732",
            lastName: null,
            email: "sosec237732@maxxspace.com",
            image: null,
            role: "member",
            addedAt: "2026-10-07T00:00:00.000Z",
            teams: [],
          },
        ],
      },
    });

    const { result } = renderHook(() => useWizardMembers());

    expect(result.current).toEqual([
      {
        userId: "creator-1",
        name: "sosec237732",
        email: "sosec237732@maxxspace.com",
        image: null,
      },
    ]);
    expect(mockUseBuildMembers).toHaveBeenCalledWith(
      { limit: 100 },
      expect.objectContaining({ enabled: true }),
    );
  });

  it("merges build members when org list is empty so a lead userId from build:members:view still resolves", () => {
    mockUseCan.mockImplementation(
      (key: string) => key === "settings:view" || key === "build:members:view",
    );
    mockUseOrgMembers.mockReturnValue({ data: { data: [] } });
    mockUseBuildMembers.mockReturnValue({
      data: {
        data: [
          {
            id: "e05cd989-3dbb-41f0-a6aa-eb36c33c9c8a",
            name: "sosec237732",
            firstName: "sosec237732",
            lastName: null,
            email: "sosec237732@maxxspace.com",
            image: null,
            role: "member",
            addedAt: "2026-10-07T00:00:00.000Z",
            teams: [],
          },
        ],
      },
    });

    const { result } = renderHook(() => useWizardMembers());

    expect(result.current).toEqual([
      {
        userId: "e05cd989-3dbb-41f0-a6aa-eb36c33c9c8a",
        name: "sosec237732",
        email: "sosec237732@maxxspace.com",
        image: null,
      },
    ]);
    expect(mockUseOrgMembers).toHaveBeenCalledWith(
      1,
      100,
      undefined,
      expect.objectContaining({ enabled: true }),
    );
    expect(mockUseBuildMembers).toHaveBeenCalledWith(
      { limit: 100 },
      expect.objectContaining({ enabled: true }),
    );
  });
});
