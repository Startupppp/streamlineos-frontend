import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { apiClient } from "@/lib/api-client";
import UnsubscribePage from "./page";

jest.mock("@/lib/api-client", () => ({
  apiClient: { get: jest.fn(), post: jest.fn(), patch: jest.fn(), delete: jest.fn() },
}));

jest.mock("next/navigation", () => ({
  useParams: () => ({ unsubscribeToken: "tok-abc" }),
}));

const mockedPost = apiClient.post as jest.Mock;

function renderPage() {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  }
  return render(<UnsubscribePage />, { wrapper: Wrapper });
}

/**
 * The page a recipient reaches from the "Unsubscribe" link in marketing mail.
 *
 * Before it existed the footer link pointed straight at the API route, which
 * answers `{"success":true}` because its other two verbs are for mail clients.
 * The withdrawal was honoured and the person was shown a line of JSON.
 */
describe("public unsubscribe page", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedPost.mockResolvedValue({ success: true });
  });

  /**
   * The load-bearing assertion in the whole file.
   *
   * Mail clients, link scanners and corporate URL-rewriters fetch links in
   * delivered mail. A page that opts the person out on mount opts out people who
   * never clicked, and there is no way to tell the two apart afterwards.
   */
  it("records nothing until the person actually presses the button", async () => {
    renderPage();

    await screen.findByRole("button", { name: "Unsubscribe" });
    expect(mockedPost).not.toHaveBeenCalled();
  });

  it("posts the token from the path, and confirms in words", async () => {
    renderPage();

    await userEvent.click(await screen.findByRole("button", { name: "Unsubscribe" }));

    await waitFor(() =>
      expect(mockedPost).toHaveBeenCalledWith("/crm/consent/unsubscribe", { token: "tok-abc" }),
    );
    expect(await screen.findByText("Preference saved")).toBeInTheDocument();
  });

  /**
   * A failed withdrawal that looks like a successful one is worse than an error:
   * the recipient believes they are opted out, keeps receiving mail, and reaches
   * for the spam button instead of the link.
   */
  it("says so when the request fails, and keeps the button usable", async () => {
    mockedPost.mockRejectedValueOnce(new Error("network"));
    renderPage();

    await userEvent.click(await screen.findByRole("button", { name: "Unsubscribe" }));

    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(screen.queryByText("Preference saved")).not.toBeInTheDocument();
    expect(await screen.findByRole("button", { name: "Unsubscribe" })).toBeEnabled();
  });
});
