import { useFeedbucketSubmissions } from "./use-feedbucket-submissions";
import { useFeedbucketWidgets } from "./use-feedbucket-widgets";

jest.mock("@/hooks/api/access", () => ({ useModuleEnabled: jest.fn(() => true) }));
jest.mock("@/hooks/api/gated-query", () => ({
  useGatedQuery: jest.fn(() => ({ data: undefined, isLoading: false, isError: false, error: null })),
}));

const { useGatedQuery } = jest.requireMock("@/hooks/api/gated-query") as {
  useGatedQuery: jest.Mock;
};
const { useModuleEnabled } = jest.requireMock("@/hooks/api/access") as {
  useModuleEnabled: jest.Mock;
};

describe("useFeedbucketSubmissions error policy", () => {
  beforeEach(() => {
    useGatedQuery.mockClear();
    useModuleEnabled.mockReturnValue(true);
  });

  it("does not request widgets while Feedbucket is disabled", () => {
    useModuleEnabled.mockReturnValue(false);
    useFeedbucketWidgets({ managedProductId: 42 });
    expect(useGatedQuery).toHaveBeenCalledWith(
      "feedbucket:widgets:view",
      expect.objectContaining({ enabled: false }),
    );
  });

  it("keeps list failures on the page instead of throwing into the route boundary", () => {
    useFeedbucketSubmissions({ managedProductId: 1, page: 1, limit: 25 });

    expect(useGatedQuery).toHaveBeenCalledWith(
      "feedbucket:submissions:view",
      expect.objectContaining({ throwOnError: false }),
    );
  });
});

describe("useFeedbucketWidgets error policy", () => {
  beforeEach(() => {
    useGatedQuery.mockClear();
  });

  it("keeps widget list failures on the page instead of throwing into the route boundary", () => {
    useFeedbucketWidgets();

    expect(useGatedQuery).toHaveBeenCalledWith(
      "feedbucket:widgets:view",
      expect.objectContaining({ throwOnError: false }),
    );
  });

  it("includes managedProductId in the query key when provided so product-scoped and global lists are cached separately", () => {
    useFeedbucketWidgets({ managedProductId: 42 });

    expect(useGatedQuery).toHaveBeenCalledWith(
      "feedbucket:widgets:view",
      expect.objectContaining({
        queryKey: expect.arrayContaining([{ managedProductId: 42 }]),
      }),
    );
  });
});
