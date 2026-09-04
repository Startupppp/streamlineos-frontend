import { render, waitFor, act } from "@testing-library/react";
import { useQuery } from "@tanstack/react-query";
import { PortalProviders } from "./portal-providers";
import {
  PortalApiError,
  clearPortalToken,
  setPortalToken,
  portalTokenScope,
  PORTAL_ANONYMOUS_SCOPE,
} from "@/lib/portal-api-client";
import { queryKeys } from "@/lib/query-keys";

const fetchSpy = jest.fn();

function Reader({ onData }: { onData: (value: unknown) => void }) {
  const { data } = useQuery({
    queryKey: queryKeys.portal.projects(),
    queryFn: () => fetchSpy(),
    staleTime: 1000 * 60 * 2,
    retry: false,
  });
  onData(data);
  return null;
}

beforeEach(() => {
  jest.clearAllMocks();
  window.localStorage.clear();
});

/**
 * Two portal customers, one browser. The second invitation must not be able to
 * read the first's cached rows — the portal key factory carries no subject, so
 * the only thing separating them is the scoped hash plus the remount.
 */
describe("the portal cache is separated by bearer subject", () => {
  it("does not serve customer A's cached projects to customer B", async () => {
    setPortalToken("token-customer-a");
    fetchSpy.mockResolvedValue([{ id: 1, name: "Customer A project" }]);

    const seen: unknown[] = [];
    const { rerender } = render(
      <PortalProviders>
        <Reader onData={(v) => seen.push(v)} />
      </PortalProviders>,
    );

    await waitFor(() =>
      expect(seen.at(-1)).toEqual([{ id: 1, name: "Customer A project" }]),
    );
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    fetchSpy.mockResolvedValue([{ id: 2, name: "Customer B project" }]);
    const switchedAt = seen.length;
    await act(async () => {
      setPortalToken("token-customer-b");
    });
    rerender(
      <PortalProviders>
        <Reader onData={(v) => seen.push(v)} />
      </PortalProviders>,
    );

    await waitFor(() =>
      expect(seen.at(-1)).toEqual([{ id: 2, name: "Customer B project" }]),
    );

    // Everything the second customer's session ever rendered. Not one frame of
    // it may be the first customer's rows — an undefined loading frame is the
    // correct thing to see while their own request is in flight.
    const afterSwitch = seen.slice(switchedAt);
    expect(afterSwitch.length).toBeGreaterThan(0);
    for (const observed of afterSwitch)
      expect(JSON.stringify(observed) ?? "").not.toContain("Customer A project");
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it("hashes two portal tokens to two different scopes", () => {
    setPortalToken("token-customer-a");
    const a = portalTokenScope();
    setPortalToken("token-customer-b");
    const b = portalTokenScope();

    expect(a).not.toBe(b);
    expect(a).not.toBe(PORTAL_ANONYMOUS_SCOPE);

    clearPortalToken();
    expect(portalTokenScope()).toBe(PORTAL_ANONYMOUS_SCOPE);
  });
});

/**
 * The portal answered 403s and 404s with a retry the staff client refuses.
 */
describe("the portal retry policy treats a 4xx as a verdict", () => {
  it("does not retry a 403", async () => {
    setPortalToken("token-customer-a");
    fetchSpy.mockRejectedValue(new PortalApiError("Forbidden", 403));

    render(
      <PortalProviders>
        <RetryReader />
      </PortalProviders>,
    );

    await waitFor(() => expect(fetchSpy).toHaveBeenCalled());
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it("still retries a 429 once", async () => {
    setPortalToken("token-customer-a");
    fetchSpy.mockRejectedValue(new PortalApiError("Too many", 429));

    render(
      <PortalProviders>
        <RetryReader />
      </PortalProviders>,
    );

    await waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(2));
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });
});

function RetryReader() {
  useQuery({
    queryKey: queryKeys.portal.projects(),
    queryFn: () => fetchSpy(),
    retryDelay: 1,
  });
  return null;
}
