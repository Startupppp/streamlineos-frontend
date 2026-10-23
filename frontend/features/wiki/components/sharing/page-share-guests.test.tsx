import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PageShareGuests } from "./page-share-guests";
import { ApiError } from "@/lib/api-envelope";
import { toast } from "sonner";

const createGrantMutate = jest.fn();

jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));

jest.mock("@/hooks/api/kb/sharing", () => ({
  useCreateKbGuestGrant: () => ({
    mutate: createGrantMutate,
    isPending: false,
  }),
}));

beforeEach(() => {
  jest.clearAllMocks();
});

describe("PageShareGuests — disabled state", () => {
  it("shows a disabled message when external sharing is off, so the form is not shown", () => {
    render(<PageShareGuests pageId={1} externalSharingEnabled={false} />);
    expect(screen.getByText("External sharing is disabled for this page.")).toBeInTheDocument();
    expect(screen.queryByLabelText(/guest email/i)).toBeNull();
  });
});

describe("PageShareGuests — form submission", () => {
  function renderEnabled() {
    return render(<PageShareGuests pageId={5} externalSharingEnabled={true} />);
  }

  it("renders the invite form when external sharing is enabled, so the guest email control is present", () => {
    renderEnabled();
    expect(screen.getByRole("textbox", { name: /guest email/i })).toBeInTheDocument();
  });

  it("calls the mutation with the entered values on submit", async () => {
    const user = userEvent.setup();
    renderEnabled();

    await user.type(screen.getByRole("textbox", { name: /guest email/i }), "alice@example.com");
    await user.click(screen.getByRole("button", { name: /^expires$/i }));
    await user.click(await screen.findByRole("gridcell", { name: "15" }));
    await user.click(screen.getByRole("button", { name: /invite guest/i }));

    await waitFor(() => {
      expect(createGrantMutate).toHaveBeenCalledTimes(1);
    });
    expect(createGrantMutate.mock.calls[0]?.[0]).toMatchObject({
      pageId: 5,
      email: "alice@example.com",
    });
  });

  it("shows the 403 inline message when external sharing is disabled server-side", async () => {
    const user = userEvent.setup();
    renderEnabled();

    await user.type(screen.getByRole("textbox", { name: /guest email/i }), "bob@example.com");
    await user.click(screen.getByRole("button", { name: /^expires$/i }));
    await user.click(await screen.findByRole("gridcell", { name: "15" }));
    await user.click(screen.getByRole("button", { name: /invite guest/i }));

    await waitFor(() => expect(createGrantMutate).toHaveBeenCalled());
    createGrantMutate.mock.calls[0]?.[1].onError(new ApiError("Forbidden", 403, "EXTERNAL_SHARING_DISABLED"));

    expect(toast.error).toHaveBeenCalledWith("External sharing is disabled for this page.");
  });

  it("shows the 409 duplicate message when the guest already has access", async () => {
    const user = userEvent.setup();
    renderEnabled();

    await user.type(screen.getByRole("textbox", { name: /guest email/i }), "carol@example.com");
    await user.click(screen.getByRole("button", { name: /^expires$/i }));
    await user.click(await screen.findByRole("gridcell", { name: "15" }));
    await user.click(screen.getByRole("button", { name: /invite guest/i }));

    await waitFor(() => expect(createGrantMutate).toHaveBeenCalled());
    createGrantMutate.mock.calls[0]?.[1].onError(new ApiError("Conflict", 409, "DUPLICATE_GRANT"));

    expect(toast.error).toHaveBeenCalledWith("This guest already has access.");
  });
});
