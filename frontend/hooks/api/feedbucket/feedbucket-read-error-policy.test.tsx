import { useFeedbucketSubmissions } from "./use-feedbucket-submissions";

jest.mock("@/hooks/api/gated-query", () => ({
  useGatedQuery: jest.fn(() => ({ data: undefined, isLoading: false, isError: false, error: null })),
}));

const { useGatedQuery } = jest.requireMock("@/hooks/api/gated-query") as {
  useGatedQuery: jest.Mock;
};

describe("useFeedbucketSubmissions error policy", () => {
  beforeEach(() => {
    useGatedQuery.mockClear();
  });

  it("keeps list failures on the page instead of throwing into the route boundary", () => {
    useFeedbucketSubmissions({ managedProductId: 1, page: 1, limit: 25 });

    expect(useGatedQuery).toHaveBeenCalledWith(
      "feedbucket:submissions:view",
      expect.objectContaining({ throwOnError: false }),
    );
  });
});
