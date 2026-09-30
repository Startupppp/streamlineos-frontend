import { render, screen } from "@testing-library/react";
import { SubmissionInboxFilters } from "./submission-inbox-filters";

jest.mock("@/components/ui/search-input", () => ({
  SearchInput: () => <input aria-label="Search submissions" />,
}));

jest.mock("@/components/ui/user-combobox", () => ({
  UserCombobox: () => <button type="button">Any owner</button>,
}));

jest.mock("@/components/ui/date-picker", () => ({
  DatePicker: ({ ariaLabel }: { ariaLabel: string }) => (
    <button type="button" aria-label={ariaLabel} />
  ),
}));

const VALUES = {
  status: null,
  type: null,
  linked: null,
  duplicate: null,
  assigneeId: null,
  search: null,
  from: null,
  to: null,
} as const;

describe("SubmissionInboxFilters", () => {
  it("uses the shared responsive toolbar with readable direct select widths", () => {
    const { container } = render(
      <SubmissionInboxFilters values={VALUES} onChange={jest.fn()} />,
    );

    const status = screen.getByRole("combobox", { name: "Filter by status" });
    const type = screen.getByRole("combobox", { name: "Filter by type" });
    const linked = screen.getByRole("combobox", { name: "Filter by ticket link" });

    for (const trigger of [status, type, linked]) {
      expect(trigger).toHaveClass("w-full", "min-w-0", "md:w-fit");
    }

    expect(container.querySelector('[data-slot="build-list-toolbar"]')).toBeTruthy();
    expect(screen.getByRole("button", { name: /^Filters/ })).toBeInTheDocument();
    expect(status).toHaveClass("md:min-w-40", "md:max-w-80");
    expect(type).toHaveClass("md:min-w-40", "md:max-w-80");
    expect(linked).toHaveClass("md:min-w-40", "md:max-w-80");
    expect(status).not.toHaveClass("w-[130px]");
    expect(type).not.toHaveClass("w-[120px]");
    expect(linked).not.toHaveClass("w-[130px]");
  });
});
