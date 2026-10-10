import { fireEvent, render, screen } from "@testing-library/react";
import React from "react";

const mockUseProjects = jest.fn();
const mockMutate = jest.fn();

jest.mock("@/hooks/api/build/projects", () => ({
  useProjects: (...args: unknown[]) => mockUseProjects(...args),
}));
jest.mock("@/hooks/api/build/use-link-project-managed-product", () => ({
  useLinkProjectManagedProduct: () => ({ mutate: mockMutate, isPending: false }),
}));
jest.mock("@/hooks/common/use-debounce", () => ({
  useDebouncedValue: (value: string) => value,
}));
jest.mock("@/components/ui/dialog", () => ({
  Dialog: ({ children, open }: { children: React.ReactNode; open: boolean }) => open ? <div>{children}</div> : null,
  DialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogBody: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
  DialogDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
}));

import { LinkExistingProjectDialog } from "./link-existing-project-dialog";

beforeEach(() => {
  jest.clearAllMocks();
  mockUseProjects.mockReturnValue({
    data: {
      data: [
        { id: 11, key: "FREE", name: "Unlinked project", managedProductId: null },
        { id: 12, key: "TAKEN", name: "Other product project", managedProductId: 4 },
      ],
      hasMore: false,
    },
    isLoading: false,
    isError: false,
    refetch: jest.fn(),
  });
});

it("searches existing projects and links only an unassigned project", () => {
  render(<LinkExistingProjectDialog managedProductId={39} open onOpenChange={jest.fn()} />);
  expect(screen.getByText("Unlinked project")).toBeInTheDocument();
  expect(screen.queryByText("Other product project")).not.toBeInTheDocument();
  fireEvent.change(screen.getByRole("textbox", { name: "Search existing projects" }), { target: { value: "FREE" } });
  expect(mockUseProjects).toHaveBeenLastCalledWith({ limit: 50, search: "FREE" }, { enabled: true });
  fireEvent.click(screen.getByRole("button", { name: /FREE Unlinked project/ }));
  fireEvent.click(screen.getByRole("button", { name: "Link project" }));
  expect(mockMutate).toHaveBeenCalledWith(
    { projectId: 11, managedProductId: 39 },
    expect.objectContaining({ onSuccess: expect.any(Function), onError: expect.any(Function) }),
  );
});
