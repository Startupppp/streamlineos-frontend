import { act, fireEvent, render, screen, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { toast } from "sonner";
import { ApiError } from "@/lib/api-envelope";
import { EditEpicDialog } from "./edit-epic-dialog";

const mutate = jest.fn();
let capturedOptions: {
  onError?: (error: unknown) => void;
  onSuccess?: () => void;
} = {};

jest.mock("@/hooks/api/build/tickets", () => ({
  useUpdateTicket: (
    _projectId: number,
    options: { onError?: (error: unknown) => void },
  ) => {
    capturedOptions = options;
    return { mutate, isPending: false };
  },
}));

jest.mock("sonner", () => ({
  toast: { success: jest.fn(), error: jest.fn(), warning: jest.fn() },
}));

jest.mock("@/hooks/api/access", () => ({ useCan: () => true }));

const EPIC = {
  id: 9,
  title: "Checkout rewrite",
  description: "Legacy funnel",
  priority: "HIGH",
  status: "TODO",
  version: 4,
};

function Wrapper({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider
      client={
        new QueryClient({
          defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
        })
      }
    >
      {children}
    </QueryClientProvider>
  );
}

function conflict() {
  return new ApiError("conflict", 409, "PROJECTS_TICKET_CONFLICT");
}

async function openAndSave() {
  render(
    <Wrapper>
      <EditEpicDialog epic={EPIC} projectId={3} open onOpenChange={jest.fn()} />
    </Wrapper>,
  );
  fireEvent.change(screen.getByDisplayValue("Checkout rewrite"), {
    target: { value: "Checkout rewrite v2" },
  });
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: /save changes/i }));
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  capturedOptions = {};
});

describe("EditEpicDialog — a 409 shows the server value beside the local one, not a toast", () => {
  it("lists the drifted field with both values when the server rejects a stale version", async () => {
    await openAndSave();
    expect(mutate).toHaveBeenCalledWith(
      expect.objectContaining({ ticketId: 9, version: 4, title: "Checkout rewrite v2" }),
    );
    act(() => {
      capturedOptions.onError?.(conflict());
    });
    const dialog = screen.getByRole("dialog", {
      name: /this issue changed while you were editing/i,
    });
    expect(within(dialog).getByText("Title")).toBeInTheDocument();
    expect(within(dialog).getByText("Checkout rewrite")).toBeInTheDocument();
    expect(within(dialog).getByText("Checkout rewrite v2")).toBeInTheDocument();
    expect(toast.error).not.toHaveBeenCalled();
  });

  it("still toasts a failure that is not a version conflict, so the conflict branch is not always on", async () => {
    await openAndSave();
    act(() => {
      capturedOptions.onError?.(new ApiError("Server error", 500, "INTERNAL"));
    });
    expect(toast.error).toHaveBeenCalled();
    expect(
      screen.queryByText("This issue changed while you were editing"),
    ).not.toBeInTheDocument();
  });

  it("falls back to naming the version itself when the drift is in a field this form does not edit", async () => {
    render(
      <Wrapper>
        <EditEpicDialog epic={EPIC} projectId={3} open onOpenChange={jest.fn()} />
      </Wrapper>,
    );
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /save changes/i }));
    });
    act(() => {
      capturedOptions.onError?.(conflict());
    });
    const dialog = screen.getByRole("dialog", {
      name: /this issue changed while you were editing/i,
    });
    expect(within(dialog).getByText("Version")).toBeInTheDocument();
    expect(within(dialog).getByText("Updated by another user")).toBeInTheDocument();
  });
});
