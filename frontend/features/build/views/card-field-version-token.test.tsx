import { render, screen, fireEvent } from "@testing-library/react";
import { InlineStatus } from "./card-field-status";
import { ticketUpdateRequestContract } from "@/hooks/api/build/build-tickets-subresource-schema";

const mutate = jest.fn();

jest.mock("@/hooks/api/build/tickets", () => ({
  useUpdateTicket: () => ({ mutate }),
}));

beforeEach(() => {
  mutate.mockClear();
});

function pickStatus() {
  render(
    <InlineStatus ticketId={7} projectId={5} version={4} currentStatus="TODO" />,
  );
  fireEvent.click(screen.getByRole("button", { name: "Change status" }));
  fireEvent.click(screen.getByRole("button", { name: /In Progress/ }));
}

function sentBody(): Record<string, unknown> {
  const sent = mutate.mock.calls[0][0] as Record<string, unknown>;
  const body: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(sent)) {
    if (key !== "ticketId") body[key] = value;
  }
  return body;
}

it("puts the version token in the body a board inline status edit sends", () => {
  pickStatus();
  expect(mutate).toHaveBeenCalledWith({ ticketId: 7, version: 4, status: "IN_PROGRESS" });
  expect(sentBody().version).toBe(4);
});

it("sends a board inline status body the backend update schema accepts", () => {
  pickStatus();
  expect(ticketUpdateRequestContract.safeParse(sentBody()).success).toBe(true);
});

it("would be rejected by the backend update schema if the board inline edit dropped the token", () => {
  pickStatus();
  const withoutToken: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(sentBody())) {
    if (key !== "version") withoutToken[key] = value;
  }
  expect(ticketUpdateRequestContract.safeParse(withoutToken).success).toBe(false);
});
