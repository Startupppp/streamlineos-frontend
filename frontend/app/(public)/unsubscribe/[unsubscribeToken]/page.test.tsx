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

describe("public unsubscribe page", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedPost.mockResolvedValue({ success: true });
  });

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

  it("says so when the request fails, and keeps the button usable", async () => {
    mockedPost.mockRejectedValueOnce(new Error("network"));
    renderPage();

    await userEvent.click(await screen.findByRole("button", { name: "Unsubscribe" }));

    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(screen.queryByText("Preference saved")).not.toBeInTheDocument();
    expect(await screen.findByRole("button", { name: "Unsubscribe" })).toBeEnabled();
  });
});
