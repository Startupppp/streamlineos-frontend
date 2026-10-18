import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { format } from "date-fns";
import { HolidaysPage } from "./holidays-page";

const updateMutate = jest.fn();
const today = format(new Date(), "yyyy-MM-dd");
const holiday = { id: "h-1", orgId: "org-1", name: "Founders Day", date: today, recurring: false, createdBy: null, createdAt: "2026-01-01T00:00:00.000Z" };

jest.mock("@/hooks/api/hr/holidays", () => ({
  useHolidays: () => ({ data: [holiday], isLoading: false, isError: false, error: null, refetch: jest.fn() }),
  useCreateHoliday: () => ({ mutate: jest.fn(), isPending: false }),
  useUpdateHoliday: () => ({ mutate: updateMutate, isPending: false }),
  useDeleteHoliday: () => ({ mutate: jest.fn(), isPending: false }),
}));
jest.mock("@/hooks/api/access", () => ({ useCan: () => true }));
jest.mock("@/hooks/api/use-page-state", () => ({
  usePageState: () => ({ kind: "ready" }),
}));

describe("HolidaysPage — BE-19 a stale tab cannot overwrite a newer holiday edit", () => {
  it("sends the values the holiday was opened with alongside the edit", async () => {
    const user = userEvent.setup();
    render(<HolidaysPage />);

    await user.click(await screen.findByRole("button", { name: "Edit Founders Day" }));
    await user.click(await screen.findByRole("button", { name: "Update holiday" }));

    await waitFor(() => expect(updateMutate).toHaveBeenCalledTimes(1));
    expect(updateMutate.mock.calls[0][0]).toMatchObject({
      holidayId: "h-1",
      expected: { name: "Founders Day", date: today, recurring: false },
    });
  });
});
