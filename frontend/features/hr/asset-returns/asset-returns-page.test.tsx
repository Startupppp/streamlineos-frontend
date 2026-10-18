import { fireEvent, render, screen } from "@testing-library/react";
import { AssetReturnsPage } from "./asset-returns-page";

const employeesCalls: Array<{ enabled?: boolean } | undefined> = [];
const assetsCalls: Array<{ enabled?: boolean } | undefined> = [];

jest.mock("@/hooks/api/access", () => ({
  useCan: () => true,
}));

jest.mock("@/hooks/api/hr", () => ({
  useHrEmployees: (_params: unknown, options?: { enabled?: boolean }) => {
    employeesCalls.push(options);
    return { data: undefined };
  },
  useHrAssetList: (_params: unknown, options?: { enabled?: boolean }) => {
    assetsCalls.push(options);
    return { data: undefined, error: null, isPending: true };
  },
  unwrapEmployees: () => [],
}));

jest.mock("@/hooks/api/use-page-state", () => ({
  usePageState: () => ({ kind: "ready" }),
}));

jest.mock("@/components/shared/page-state", () => ({
  PageState: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock("@/hooks/api/hr/asset-returns", () => ({
  useAssetReturns: () => ({ data: [], isLoading: false, isError: false, error: null, refetch: jest.fn() }),
  useCreateAssetReturn: () => ({ mutate: jest.fn(), isPending: false }),
  useMarkAssetReturned: () => ({ mutate: jest.fn(), isPending: false }),
}));

jest.mock("./asset-return-log-sheet", () => ({
  AssetReturnLogSheet: ({ open, assetsLoading }: { open: boolean; assetsLoading: boolean }) =>
    open ? <div data-testid="log-sheet">{assetsLoading ? "loading assets" : "assets ready"}</div> : null,
}));

describe("asset returns page reads (HR-B-012)", () => {
  beforeEach(() => {
    employeesCalls.length = 0;
    assetsCalls.length = 0;
  });

  it("loads only the returns list on first paint and defers the picker reads until the log sheet opens", () => {
    render(<AssetReturnsPage />);

    expect(employeesCalls.at(-1)).toEqual({ enabled: false });
    expect(assetsCalls.at(-1)).toEqual({ enabled: false });

    fireEvent.click(screen.getAllByRole("button", { name: /log return/i })[0]);

    expect(employeesCalls.at(-1)).toEqual({ enabled: true });
    expect(assetsCalls.at(-1)).toEqual({ enabled: true });
    expect(screen.getByTestId("log-sheet")).toHaveTextContent("loading assets");
  });
});
