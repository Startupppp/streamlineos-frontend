import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HuddleAccountPicker } from "./huddle-account-picker";

const mutate = jest.fn();
let accounts: unknown[] = [];

jest.mock("@/hooks/api/chat-huddles", () => ({
  useHuddleAccounts: () => ({ data: { accounts } }),
  useSetHuddleDefault: () => ({ mutate, isPending: false }),
}));

jest.mock("@/hooks/common/use-animated-icon", () => ({
  useAnimatedIcon: () => ({
    iconRef: { current: null },
    hoverHandlers: { onMouseEnter: jest.fn(), onMouseLeave: jest.fn() },
  }),
}));

const google = {
  connectionId: 11,
  provider: "google_meet",
  label: "me@gmail.com",
  status: "active",
  scope: "user",
  isDefault: true,
};
const outlook = {
  connectionId: 12,
  provider: "microsoft_teams",
  label: "me@outlook.com",
  status: "active",
  scope: "user",
  isDefault: false,
};

beforeEach(() => {
  mutate.mockReset();
});

it("starts with the only account in one click", async () => {
  accounts = [google];
  const onStart = jest.fn();
  render(<HuddleAccountPicker onStart={onStart} />);
  await userEvent.click(screen.getByRole("button", { name: "Start huddle" }));
  expect(onStart).toHaveBeenCalledWith(11);
});

it("lets the user choose which account starts the huddle", async () => {
  accounts = [google, outlook];
  const onStart = jest.fn();
  render(<HuddleAccountPicker onStart={onStart} />);
  await userEvent.click(screen.getByRole("button", { name: "Start huddle — choose account" }));
  await userEvent.click(await screen.findByRole("menuitem", { name: /Start with .*me@outlook\.com/ }));
  expect(onStart).toHaveBeenCalledWith(12);
});

it("marks the chat default and lets the user change it", async () => {
  accounts = [google, outlook];
  render(<HuddleAccountPicker onStart={jest.fn()} />);
  await userEvent.click(screen.getByRole("button", { name: "Start huddle — choose account" }));
  expect(await screen.findByText("(chat default)")).toBeInTheDocument();
  await userEvent.click(screen.getByRole("menuitem", { name: /^Use .*me@outlook\.com/ }));
  expect(mutate).toHaveBeenCalledWith({ connectionId: 12 });
});
