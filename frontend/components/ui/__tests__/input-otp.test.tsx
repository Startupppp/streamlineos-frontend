import { useRef, useState } from "react";
import { render, screen, fireEvent, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from "@/components/ui/input-otp";

/**
 * The REAL wrapper, not the bare `<input>` the signin-form suite substitutes.
 * Only our own additions are under test — `digitsOnly` reaching `pasteTransformer`
 * and `onChange`, the digits-only `pattern` default, and ref forwarding through
 * to the element the form focuses. The vendor's slot machinery is exercised only
 * as far as it carries those.
 */

// jsdom ships no `elementFromPoint`; input-otp's password-manager badge probe
// calls it from a timer and the rejection lands as an unrelated test failure.
beforeAll(() => {
  if (typeof document.elementFromPoint !== "function")
    Object.defineProperty(document, "elementFromPoint", {
      value: () => null,
      configurable: true,
      writable: true,
    });
});

function Harness({ onValue }: { onValue?: (value: string) => void }) {
  const [value, setValue] = useState("");
  const fieldRef = useRef<HTMLInputElement>(null);

  function handleChange(next: string): void {
    setValue(next);
    onValue?.(next);
  }

  function handleFocusRequest(): void {
    fieldRef.current?.focus();
  }

  return (
    <div>
      <button type="button" onClick={handleFocusRequest}>
        focus the code field
      </button>
      <output data-testid="value">{value}</output>
      <InputOTP
        ref={fieldRef}
        id="otp-code"
        aria-label="Verification code"
        maxLength={6}
        value={value}
        onChange={handleChange}
      >
        <InputOTPGroup>
          <InputOTPSlot index={0} />
          <InputOTPSlot index={1} />
          <InputOTPSlot index={2} />
        </InputOTPGroup>
        <InputOTPSeparator />
        <InputOTPGroup>
          <InputOTPSlot index={3} />
          <InputOTPSlot index={4} />
          <InputOTPSlot index={5} />
        </InputOTPGroup>
      </InputOTP>
    </div>
  );
}

function field(): HTMLInputElement {
  const element = screen.getByLabelText("Verification code");
  if (!(element instanceof HTMLInputElement))
    throw new Error("the OTP wrapper did not render an input");
  return element;
}

function renderedValue(): string {
  return screen.getByTestId("value").textContent ?? "";
}

function isSlot(_content: string, element: Element | null): boolean {
  return element instanceof HTMLElement && element.dataset.slot === "input-otp-slot";
}

function slotText(): string {
  return screen
    .getAllByText(isSlot)
    .map((slot) => slot.textContent ?? "")
    .join("");
}

describe("InputOTP — keyboard entry", () => {
  it("accumulates digits one keystroke at a time", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(field());
    await user.keyboard("4");
    expect(renderedValue()).toBe("4");
    await user.keyboard("8");
    expect(renderedValue()).toBe("48");
    await user.keyboard("2931");

    expect(renderedValue()).toBe("482931");
    expect(field()).toHaveValue("482931");
  });

  it("(negative) refuses a non-digit keystroke", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(field());
    await user.keyboard("4a8");

    expect(renderedValue()).toBe("48");
  });

  it("backspace removes the last digit and leaves the rest", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(field());
    await user.keyboard("4829");
    await user.keyboard("{Backspace}");

    expect(renderedValue()).toBe("482");

    await user.keyboard("{Backspace}{Backspace}{Backspace}");
    expect(renderedValue()).toBe("");
  });

  it("arrow navigation does not alter the value", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(field());
    await user.keyboard("4829");
    await user.keyboard("{ArrowLeft}{ArrowLeft}{ArrowRight}{Home}{End}");

    expect(renderedValue()).toBe("4829");
  });

  it("stops at maxLength instead of growing past the slots", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(field());
    await user.keyboard("1234567890");

    expect(renderedValue()).toBe("123456");
  });

  it("renders each entered digit into a slot", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(field());
    await user.keyboard("482931");

    expect(slotText()).toBe("482931");
  });
});

describe("InputOTP — paste goes through our digitsOnly transformer", () => {
  async function pasteInto(text: string): Promise<void> {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(field());
    await act(async () => {
      fireEvent.paste(field(), { clipboardData: { getData: () => text } });
    });
  }

  it("strips the separators an email template wraps a code in", async () => {
    await pasteInto("482-931");
    expect(renderedValue()).toBe("482931");
  });

  it("strips spaces, including a thin space", async () => {
    await pasteInto("4 8 2 931");
    expect(renderedValue()).toBe("482931");
  });

  it("truncates an over-long paste to the slot count", async () => {
    await pasteInto("4829311234");
    expect(renderedValue()).toBe("482931");
  });

  it("(negative) a paste carrying no digits leaves the field empty", async () => {
    await pasteInto("no code here");
    expect(renderedValue()).toBe("");
  });
});

describe("InputOTP — the seams the signin form depends on", () => {
  it("forwards its ref to the focusable input, so the form can move focus to it", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    expect(field()).not.toHaveFocus();
    await user.click(screen.getByRole("button", { name: /focus the code field/i }));

    expect(field()).toHaveFocus();
  });

  it("keeps the id and accessible name the label and error wiring rely on", () => {
    render(<Harness />);

    expect(field()).toHaveAttribute("id", "otp-code");
    expect(field()).toHaveAccessibleName("Verification code");
  });

  it("reports sanitised digits to onChange, never the raw keystroke stream", async () => {
    const user = userEvent.setup();
    const onValue = jest.fn();
    render(<Harness onValue={onValue} />);

    await user.click(field());
    await user.keyboard("4a8");

    for (const call of onValue.mock.calls) expect(call[0]).toMatch(/^\d*$/);
    expect(onValue).toHaveBeenLastCalledWith("48");
  });
});
