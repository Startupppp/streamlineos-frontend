export const EMPTY_GOALS_PAGE_RESULT = {
  data: { items: [], page: 1, pageSize: 20, total: 0 },
  isLoading: false,
  isError: false,
  error: null,
  refetch: jest.fn(),
};

export const EMPTY_FEEDBUCKET_RESULT = {
  data: { data: [], total: 0 },
  isLoading: false,
  isError: false,
  error: null,
  refetch: jest.fn(),
};

export const EMPTY_MANAGED_PRODUCTS_RESULT = {
  data: { data: [], pagination: { hasMore: false, nextCursor: null, limit: 20 } },
  isLoading: false,
  isError: false,
  error: null,
  refetch: jest.fn(),
};
