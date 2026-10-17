import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import {
  FieldInput,
  OPTION_SEARCH_THRESHOLD,
  OPTION_RENDER_LIMIT,
} from "@/features/build/forms/field-input";

const scrollIntoView = HTMLElement.prototype.scrollIntoView;
beforeAll(() => {
  HTMLElement.prototype.scrollIntoView = jest.fn();
});
afterAll(() => {
  HTMLElement.prototype.scrollIntoView = scrollIntoView;
});

function options(count: number): string[] {
  return Array.from({ length: count }, (_, i) => `Option ${i + 1}`);
}

function renderField(opts: string[], value = "") {
  const onChange = jest.fn();
  render(
    <FieldInput
      field={{
        key: "pick",
        label: "Pick one",
        type: "dropdown",
        required: true,
        options: opts,
      }}
      value={value}
      onChange={onChange}
    />,
  );
  return { onChange };
}

describe("a short option list stays a plain select, so a three-choice question is not turned into a search box", () => {
  it("renders every option as a listbox option with no search input", async () => {
    renderField(["Low", "Normal", "Urgent"]);
    fireEvent.keyDown(screen.getByRole("combobox", { name: /Pick one/ }), {
      key: "ArrowDown",
    });
    expect(await screen.findAllByRole("option")).toHaveLength(3);
    expect(screen.queryByPlaceholderText(/search/i)).not.toBeInTheDocument();
  });

  it("reports the chosen option as the string the contract expects", async () => {
    const { onChange } = renderField(["Low", "Normal", "Urgent"]);
    fireEvent.keyDown(screen.getByRole("combobox", { name: /Pick one/ }), {
      key: "ArrowDown",
    });
    fireEvent.click(await screen.findByRole("option", { name: "Urgent" }));
    expect(onChange).toHaveBeenCalledWith("Urgent");
  });
});

describe("a long option list becomes searchable, so a visitor is not asked to scroll an unbounded menu", () => {
  it("offers a search input once the option count passes the threshold", async () => {
    renderField(options(OPTION_SEARCH_THRESHOLD + 1));
    await userEvent.click(screen.getByRole("combobox", { name: /Pick one/ }));
    expect(screen.getByPlaceholderText(/search/i)).toBeInTheDocument();
  });

  it("narrows the rendered options to the typed search", async () => {
    renderField(options(OPTION_SEARCH_THRESHOLD + 1));
    await userEvent.click(screen.getByRole("combobox", { name: /Pick one/ }));
    await userEvent.type(screen.getByPlaceholderText(/search/i), "Option 3");
    expect(screen.getAllByRole("option")).toHaveLength(1);
  });

  it("reports the chosen option through the same string contract as the plain select", async () => {
    const { onChange } = renderField(options(OPTION_SEARCH_THRESHOLD + 1));
    await userEvent.click(screen.getByRole("combobox", { name: /Pick one/ }));
    await userEvent.click(await screen.findByRole("option", { name: "Option 2" }));
    expect(onChange).toHaveBeenCalledWith("Option 2");
  });
});

describe("an option list the server never bounded is bounded here rather than mounted whole", () => {
  it("mounts no more than the render limit and says the list was truncated", async () => {
    renderField(options(OPTION_RENDER_LIMIT + 50));
    await userEvent.click(screen.getByRole("combobox", { name: /Pick one/ }));
    expect(screen.getAllByRole("option").length).toBeLessThanOrEqual(
      OPTION_RENDER_LIMIT,
    );
    expect(
      screen.getByText(
        new RegExp(`first ${OPTION_RENDER_LIMIT} of ${OPTION_RENDER_LIMIT + 50}`),
      ),
    ).toBeInTheDocument();
  });

  it("shows no truncation notice for a list that fits, so the notice is not permanent furniture", async () => {
    renderField(options(OPTION_SEARCH_THRESHOLD + 1));
    await userEvent.click(screen.getByRole("combobox", { name: /Pick one/ }));
    expect(screen.queryByText(/first \d+ of/)).not.toBeInTheDocument();
  });
});
