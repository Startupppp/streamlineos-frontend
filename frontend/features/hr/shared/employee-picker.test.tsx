/**
 * The employee picker showed a bare list of names. `EmployeeListItem` has
 * carried `image` all along and the list contract parses it, so the photo was
 * already being fetched on every open and then dropped at the render — which is
 * why the same person has a face in the attendance roster and none here.
 *
 * What jsdom can and cannot see, measured rather than assumed: Radix renders
 * `AvatarImage` as nothing until the browser reports the image loaded, and jsdom
 * never loads one, so the DOM holds only the fallback. These assertions
 * therefore pin the avatar element and its initials, and reach the photo URL
 * through the `window.Image` Radix preloads it with. Whether the picture is
 * round, aligned, or the right size is a browser check (FE-123).
 */
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EmployeePicker } from "./employee-picker";

const PHOTO = "https://cdn.example.com/vikram.jpg";

const employees = [
  {
    id: "user-1",
    name: "Vikram Bisht",
    firstName: "Vikram",
    lastName: "Bisht",
    email: "iamvikrambisht07@example.com",
    designation: null,
    image: PHOTO,
  },
  {
    id: "user-2",
    name: null,
    firstName: null,
    lastName: null,
    email: "adityachalla01@example.com",
    designation: "Senior Dev",
    image: null,
  },
];

const useHrEmployeeOptions = jest.fn();

jest.mock("@/hooks/api/hr/employees", () => ({
  useHrEmployeeOptions: () => useHrEmployeeOptions(),
}));

beforeEach(() => {
  useHrEmployeeOptions.mockReturnValue({ employees, isFetching: false });
});

function avatarIn(element: HTMLElement): HTMLElement | null {
  return element.querySelector<HTMLElement>('[data-slot="avatar"]');
}

async function openList() {
  await userEvent.click(screen.getByRole("combobox"));
}

describe("EmployeePicker", () => {
  it("puts an avatar beside every name in the list", async () => {
    render(<EmployeePicker value={undefined} onChange={jest.fn()} />);
    await openList();

    for (const option of screen.getAllByRole("option")) {
      expect(avatarIn(option)).not.toBeNull();
    }
    expect(screen.getAllByRole("option")).toHaveLength(2);
  });

  it("falls back to initials for someone with no photo", async () => {
    render(<EmployeePicker value={undefined} onChange={jest.fn()} />);
    await openList();

    const row = screen.getByRole("option", { name: /adityachalla01/ });
    // Display name is the email local part, so the initial comes from that.
    expect(avatarIn(row)).toHaveTextContent("A");
  });

  it("requests the photo of someone who has one", async () => {
    const created: { src?: string }[] = [];
    const RealImage = window.Image;
    class SpyImage extends RealImage {
      constructor() {
        super();
        created.push(this);
      }
    }
    Object.defineProperty(window, "Image", { value: SpyImage, configurable: true });

    try {
      render(<EmployeePicker value={undefined} onChange={jest.fn()} />);
      await openList();
      expect(created.map((image) => image.src)).toContain(PHOTO);
    } finally {
      Object.defineProperty(window, "Image", { value: RealImage, configurable: true });
    }
  });

  it("keeps the avatar beside the name once a person is chosen", () => {
    render(<EmployeePicker value="user-1" onChange={jest.fn()} />);

    const trigger = screen.getByRole("combobox");
    expect(trigger).toHaveTextContent("Vikram Bisht");
    expect(avatarIn(trigger)).toHaveTextContent("VB");
  });

  it("still shows the name and the sublabel it always had", async () => {
    render(<EmployeePicker value={undefined} onChange={jest.fn()} />);
    await openList();

    const row = screen.getByRole("option", { name: /adityachalla01/ });
    expect(row).toHaveTextContent("adityachalla01");
    expect(row).toHaveTextContent("Senior Dev");
  });

  it("selects the employee whose row was clicked", async () => {
    const onChange = jest.fn();
    render(<EmployeePicker value={undefined} onChange={onChange} />);
    await openList();
    await userEvent.click(screen.getByRole("option", { name: /Vikram Bisht/ }));

    expect(onChange).toHaveBeenCalledWith("user-1", "Vikram Bisht");
  });
});
