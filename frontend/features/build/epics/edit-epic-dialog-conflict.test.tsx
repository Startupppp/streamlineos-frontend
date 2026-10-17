import { act, fireEvent, render, screen, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { toast } from "sonner";
import { ApiError } from "@/lib/api-envelope";
import { EditEpicDialog } from "./edit-epic-dialog";
import { CreateEpicDialog } from "./create-epic-dialog";

const mutate = jest.fn();
const createMutate = jest.fn();

jest.mock("@/hooks/api/build/tickets", () => ({
  useCreateTicket: () => ({ mutateAsync: createMutate, isPending: false }),
  useUpdateTicket: () => ({ mutateAsync: mutate, isPending: false }),
}));

jest.mock("sonner", () => ({
  toast: { success: jest.fn(), error: jest.fn(), warning: jest.fn() },
}));

jest.mock("@/hooks/api/access", () => ({ useCan: () => true }));

let mockIsOnline = true;

jest.mock("@/hooks/common/use-online-status", () => ({
  useOnlineStatus: () => mockIsOnline,
}));

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
  mutate.mockResolvedValue({ version: 5, updatedAt: "2026-10-14T00:00:00.000Z" });
  createMutate.mockResolvedValue({ id: 11, version: 1 });
  mockIsOnline = true;
});

describe("EditEpicDialog — a 409 shows the server value beside the local one, not a toast", () => {
  it("lists the drifted field with both values when the server rejects a stale version", async () => {
    mutate.mockRejectedValueOnce(conflict());
    await openAndSave();
    expect(mutate).toHaveBeenCalledWith(
      expect.objectContaining({ ticketId: 9, version: 4, title: "Checkout rewrite v2" }),
    );
    const dialog = screen.getByRole("dialog", {
      name: /this issue changed while you were editing/i,
    });
    expect(within(dialog).getByText("Title")).toBeInTheDocument();
    expect(within(dialog).getByText("Checkout rewrite")).toBeInTheDocument();
    expect(within(dialog).getByText("Checkout rewrite v2")).toBeInTheDocument();
    expect(toast.error).not.toHaveBeenCalled();
  });

  it("still toasts a failure that is not a version conflict, so the conflict branch is not always on", async () => {
    mutate.mockRejectedValueOnce(new ApiError("Server error", 500, "INTERNAL"));
    await openAndSave();
    expect(toast.error).toHaveBeenCalled();
    expect(
      screen.queryByText("This issue changed while you were editing"),
    ).not.toBeInTheDocument();
  });

  it("falls back to naming the version itself when the drift is in a field this form does not edit", async () => {
    mutate.mockRejectedValueOnce(conflict());
    render(
      <Wrapper>
        <EditEpicDialog epic={EPIC} projectId={3} open onOpenChange={jest.fn()} />
      </Wrapper>,
    );
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /save changes/i }));
    });
    const dialog = screen.getByRole("dialog", {
      name: /this issue changed while you were editing/i,
    });
    expect(within(dialog).getByText("Version")).toBeInTheDocument();
    expect(within(dialog).getByText("Updated by another user")).toBeInTheDocument();
  });
});

describe("EditEpicDialog — offline keeps the draft and sends no command", () => {
  it("sends no update while the browser is offline and leaves the typed value in the form", async () => {
    mockIsOnline = false;
    await openAndSave();
    expect(mutate).not.toHaveBeenCalled();
    expect(toast.warning).toHaveBeenCalledWith(
      "You're offline — your draft is kept here and nothing was sent.",
    );
    expect(screen.getByDisplayValue("Checkout rewrite v2")).toBeInTheDocument();
  });

  it("sends the update once the browser is online, so the guard is not always on", async () => {
    await openAndSave();
    expect(mutate).toHaveBeenCalled();
  });
});

describe("CreateEpicDialog — offline keeps the draft and sends no command", () => {
  async function fillAndSubmit() {
    render(
      <Wrapper>
        <CreateEpicDialog projectId={3} open onOpenChange={jest.fn()} />
      </Wrapper>,
    );
    fireEvent.change(screen.getByRole("textbox", { name: /title/i }), {
      target: { value: "New epic draft" },
    });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /create epic/i }));
    });
  }

  it("sends no create while the browser is offline and leaves the typed value in the form", async () => {
    mockIsOnline = false;
    await fillAndSubmit();
    expect(createMutate).not.toHaveBeenCalled();
    expect(toast.warning).toHaveBeenCalledWith(
      "You're offline — your draft is kept here and nothing was sent.",
    );
    expect(screen.getByDisplayValue("New epic draft")).toBeInTheDocument();
  });

  it("sends the create once the browser is online, so the guard is not always on", async () => {
    await fillAndSubmit();
    expect(createMutate).toHaveBeenCalled();
  });
});
