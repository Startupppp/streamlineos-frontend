jest.mock("@tanstack/react-query", () => ({
  ...jest.requireActual("@tanstack/react-query"),
  useQuery: jest.fn(),
}));

jest.mock("@/lib/api-client", () => ({
  apiClient: { get: jest.fn() },
}));

jest.mock("@/hooks/common/use-file-url", () => ({
  isLocalUrl: jest.fn().mockReturnValue(false),
  storageReferenceParams: jest.fn().mockReturnValue({}),
}));

jest.mock("@/lib/utils", () => ({
  storageKeyFromUrl: jest.fn().mockReturnValue("org-1/build/1/files/uuid-spec.pdf"),
}));

import { useQuery } from "@tanstack/react-query";
import { useAttachmentSignedUrl } from "./attachments";

const mockUseQuery = useQuery as jest.MockedFunction<typeof useQuery>;

describe("useAttachmentSignedUrl — returns null, never undefined, so TanStack Query v5 does not throw to the error boundary", () => {
  beforeEach(() => {
    mockUseQuery.mockReturnValue({} as ReturnType<typeof useQuery>);
  });

  it("declares throwOnError: false so a signing failure is an inline error, not a boundary crash", () => {
    useAttachmentSignedUrl("org-1/build/1/files/uuid-spec.pdf");

    const options = mockUseQuery.mock.calls.at(-1)?.[0];
    expect(options?.throwOnError).toBe(false);
  });

  it("declares staleTime so signed URLs are not refetched on every render", () => {
    useAttachmentSignedUrl("org-1/build/1/files/uuid-spec.pdf");

    const options = mockUseQuery.mock.calls.at(-1)?.[0];
    expect(typeof options?.staleTime).toBe("number");
    expect(options?.staleTime as number).toBeGreaterThan(0);
  });

  it("queryFn returns null for an empty fileUrl so TanStack Query v5 never receives undefined", async () => {
    useAttachmentSignedUrl("");

    const options = mockUseQuery.mock.calls.at(-1)?.[0];
    const result = await (options?.queryFn as (ctx: { signal: AbortSignal }) => Promise<unknown>)({
      signal: new AbortController().signal,
    });
    expect(result).toBeNull();
  });
});
