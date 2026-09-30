import { fireEvent, render, screen } from "@testing-library/react";
import { InlineModule } from "./card-inline-extra-fields";

const mutate = jest.fn();

jest.mock("@/hooks/api/build/tickets", () => ({
  useUpdateTicket: () => ({ mutate }),
  useAddLabelToTicket: () => ({ mutate: jest.fn() }),
  useRemoveLabelFromTicket: () => ({ mutate: jest.fn() }),
}));

jest.mock("@/hooks/api/build/projects", () => ({
  useProjectLabels: () => ({ data: [] }),
}));

jest.mock("@/hooks/api/build/advanced", () => ({
  useCycles: () => ({ data: [] }),
  useModules: () => ({
    data: [
      { id: 3, name: "Payments" },
      { id: 8, name: "Reporting" },
    ],
  }),
}));

beforeEach(() => {
  mutate.mockClear();
});

it("changes a ticket module with its version token", () => {
  render(
    <InlineModule
      ticketId={7}
      projectId={5}
      version={4}
      currentModuleId={3}
    />,
  );

  fireEvent.click(screen.getByRole("button", { name: "Change module" }));
  fireEvent.click(screen.getByRole("button", { name: "Reporting" }));

  expect(mutate).toHaveBeenCalledWith({
    ticketId: 7,
    version: 4,
    moduleId: 8,
  });
});

it("can remove a ticket from its module", () => {
  render(
    <InlineModule
      ticketId={7}
      projectId={5}
      version={4}
      currentModuleId={3}
    />,
  );

  fireEvent.click(screen.getByRole("button", { name: "Change module" }));
  fireEvent.click(screen.getByRole("button", { name: "No module" }));

  expect(mutate).toHaveBeenCalledWith({
    ticketId: 7,
    version: 4,
    moduleId: null,
  });
});
