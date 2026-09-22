import { render, screen, fireEvent } from "@testing-library/react";
import type { ReactNode } from "react";
import { DirtyStateProvider, useRegisterDirtyState } from "@/components/shared/dirty-state-context";
import { PageWrapper } from "./page-wrapper";

const mockPush = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

function Dirty({ isDirty }: { isDirty: boolean }) {
  useRegisterDirtyState(isDirty);
  return null;
}

function renderBackLink(isDirty: boolean, children?: ReactNode) {
  return render(
    <DirtyStateProvider>
      <Dirty isDirty={isDirty} />
      <PageWrapper title="Ticket" backHref="/build/tickets" backLabel="Back to tickets">
        {children ?? null}
      </PageWrapper>
    </DirtyStateProvider>,
  );
}

beforeEach(() => jest.clearAllMocks());

describe("PageWrapper back navigation respects unsaved work", () => {
  it("navigates immediately when nothing is unsaved", () => {
    renderBackLink(false);

    fireEvent.click(screen.getByLabelText("Back to tickets"));

    expect(mockPush).toHaveBeenCalledWith("/build/tickets");
  });

  it("holds the back navigation and asks first when work is unsaved", () => {
    renderBackLink(true);

    fireEvent.click(screen.getByLabelText("Back to tickets"));

    expect(mockPush).not.toHaveBeenCalled();
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
  });

  it("completes the held navigation once the edit is discarded", () => {
    renderBackLink(true);
    fireEvent.click(screen.getByLabelText("Back to tickets"));

    fireEvent.click(screen.getByRole("button", { name: /discard/i }));

    expect(mockPush).toHaveBeenCalledWith("/build/tickets");
  });

  it("stays on the page when the person chooses to keep editing", () => {
    renderBackLink(true);
    fireEvent.click(screen.getByLabelText("Back to tickets"));

    fireEvent.click(screen.getByRole("button", { name: /keep editing|cancel/i }));

    expect(mockPush).not.toHaveBeenCalled();
  });

  it("lets a modified click through to the browser so open-in-new-tab still works", () => {
    renderBackLink(true);

    fireEvent.click(screen.getByLabelText("Back to tickets"), { ctrlKey: true });

    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("does not intercept when no dirty-state provider is mounted at all", () => {
    render(
      <PageWrapper title="Ticket" backHref="/build/tickets" backLabel="Back to tickets">
        {null}
      </PageWrapper>,
    );

    fireEvent.click(screen.getByLabelText("Back to tickets"));

    expect(mockPush).toHaveBeenCalledWith("/build/tickets");
  });
});
