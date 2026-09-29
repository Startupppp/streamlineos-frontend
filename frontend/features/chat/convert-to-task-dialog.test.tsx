jest.mock("sonner", () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}));

jest.mock("@/hooks/api/build/projects", () => ({
  useProjects: jest.fn(() => ({ data: { data: [{ id: 1, key: "APP", name: "App" }] }, isLoading: false })),
}));

const mockMutateAsync = jest.fn();
jest.mock("@/hooks/api/chat", () => ({
  useCreateTaskFromMessage: jest.fn(() => ({
    mutateAsync: mockMutateAsync,
    isPending: false,
  })),
}));

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { toast } from "sonner";
import { ConvertToTaskDialog } from "./convert-to-task-dialog";

const mockToastSuccess = toast.success as jest.MockedFunction<typeof toast.success>;

function renderDialog(open = true) {
  return render(
    <ConvertToTaskDialog
      open={open}
      onOpenChange={jest.fn()}
      channelId={7}
      messageId={42}
      defaultTitle="Fix the bug"
    />,
  );
}

describe("ConvertToTaskDialog toast labels — BUG-058: raw enum was shown instead of human label", () => {
  beforeEach(() => {
    mockToastSuccess.mockClear();
    mockMutateAsync.mockResolvedValue({ id: 99 });
  });

  it("shows 'Task created' when type is TASK so the user sees a human label not the raw enum", async () => {
    renderDialog();

    const projectSelect = screen.getByRole("combobox", { name: /project/i });
    fireEvent.click(projectSelect);
    const option = await screen.findByText("APP — App");
    fireEvent.click(option);

    fireEvent.click(screen.getByRole("button", { name: /create/i }));

    await waitFor(() => {
      expect(mockToastSuccess).toHaveBeenCalledWith("Task created");
    });
  });

  it("shows 'Bug created' when type is BUG so the user sees a human label not the raw enum", async () => {
    renderDialog();

    const projectSelect = screen.getByRole("combobox", { name: /project/i });
    fireEvent.click(projectSelect);
    const option = await screen.findByText("APP — App");
    fireEvent.click(option);

    const typeSelect = screen.getByRole("combobox", { name: /type/i });
    fireEvent.click(typeSelect);
    const bugOption = await screen.findByText("Bug");
    fireEvent.click(bugOption);

    fireEvent.click(screen.getByRole("button", { name: /create/i }));

    await waitFor(() => {
      expect(mockToastSuccess).toHaveBeenCalledWith("Bug created");
    });
  });
});
