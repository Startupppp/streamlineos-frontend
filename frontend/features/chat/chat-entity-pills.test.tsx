import type { ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { LinkedRecordPill } from "./chat-entity-pills";
import { seedLinkedRecordPreview } from "@/hooks/api/chat-entities";
import type { EntityRef } from "@/types/chat";

const push = jest.fn();
jest.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

const mutateAsync = jest.fn();
jest.mock("@/hooks/api/chat-entities", () => ({
  ...jest.requireActual("@/hooks/api/chat-entities"),
  useSubmitEntityAction: () => ({ mutateAsync }),
}));

const availableActions = new Map<string, string[]>();
jest.mock("./entity-actions-context", () => ({
  useEntityAction: (reference: { type: string; id: string }, actionId: string) =>
    availableActions.get(`${reference.type}:${reference.id}`)?.includes(actionId)
      ? { id: actionId, label: actionId, inputs: [] }
      : undefined,
}));

function renderPill(entity: EntityRef, client = new QueryClient()) {
  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  }
  return render(<LinkedRecordPill entity={entity} channelId={4} />, { wrapper: Wrapper });
}

afterEach(() => {
  jest.clearAllMocks();
  availableActions.clear();
});

describe("LinkedRecordPill renders every linked type from the server card", () => {
  it.each([
    ["employee", "Asha Rao", "/hr/employees/u1"],
    ["doc_page", "Onboarding guide", "/knowledge/wiki/doc/3"],
    ["calendar_event", "Quarterly review", "/calendar?event=9"],
    ["support_ticket", "Login broken", "/support/inbox?ticket=12"],
    ["deal", "Acme renewal", "/crm/deals/5"],
  ] as const)("shows the %s title and opens its href", async (type, title, href) => {
    renderPill({ type, id: "1", card: { type, id: "1", title, subtitle: null, status: null, href } });
    await userEvent.click(screen.getByRole("button", { name: new RegExp(title) }));
    expect(push).toHaveBeenCalledWith(href);
  });

  it("renders the card subtitle for every type, not only tickets", () => {
    renderPill({
      type: "employee",
      id: "u1",
      card: { type: "employee", id: "u1", title: "Asha Rao", subtitle: "asha@acme.test", status: null, href: "/hr/employees/u1" },
    });
    expect(screen.getByText("asha@acme.test")).toBeInTheDocument();
  });

  it("renders a card the reader cannot resolve as a neutral restricted pill that names nothing", () => {
    const { container } = renderPill({ type: "doc_page", id: "3", card: null });
    expect(screen.getByText("Restricted record")).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(container.textContent).toBe("Restricted record");
  });

  it("shows the picked title on the sender's optimistic message before the server card exists", () => {
    const client = new QueryClient();
    seedLinkedRecordPreview(client, {
      type: "employee",
      id: "u9",
      title: "Ravi Kumar",
      subtitle: "ravi@acme.test",
      status: null,
      href: "/hr/employees/u9",
    });
    renderPill({ type: "employee", id: "u9" }, client);
    expect(screen.getByRole("button", { name: /Ravi Kumar/ })).toBeInTheDocument();
  });

  it("lets the server card win over the picked preview once it arrives", () => {
    const client = new QueryClient();
    seedLinkedRecordPreview(client, { type: "lead", id: "2", title: "Old name", subtitle: "", status: null, href: "/crm/leads/2" });
    renderPill({ type: "lead", id: "2", card: { type: "lead", id: "2", title: "New name", subtitle: null, status: null, href: "/crm/leads/2" } }, client);
    expect(screen.getByRole("button", { name: /New name/ })).toBeInTheDocument();
    expect(screen.queryByText("Old name")).not.toBeInTheDocument();
  });

  it("shows only the type while an unresolved reference has no card yet, and does not navigate anywhere", () => {
    renderPill({ type: "calendar_event", id: "9" });
    expect(screen.getByText("Event")).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});

describe("ticket pills keep their status action, gated by the server's action list", () => {
  const ticket: EntityRef = {
    type: "ticket",
    id: "77",
    card: { type: "ticket", id: "77", title: "Fix login", subtitle: "AP-12", status: "TODO", href: "/build/1/issues?ticket=77" },
  };

  it("offers the status menu when the server lists the status action", () => {
    availableActions.set("ticket:77", ["status"]);
    renderPill(ticket);
    expect(screen.getByRole("button", { name: "Change ticket status" })).toBeInTheDocument();
  });

  it("shows a read-only status when the server does not list the status action", () => {
    renderPill(ticket);
    expect(screen.queryByRole("button", { name: "Change ticket status" })).not.toBeInTheDocument();
    expect(screen.getByText("Todo")).toBeInTheDocument();
  });

  it("never renders a title or link for a ticket the reader has no card or own preview for", () => {
    const { container } = renderPill({ type: "ticket", id: "5" });
    expect(container.textContent).toBe("Ticket");
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
