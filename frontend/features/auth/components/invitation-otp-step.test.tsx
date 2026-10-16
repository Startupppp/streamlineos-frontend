import { fireEvent, render, screen } from "@testing-library/react";
import { useForm } from "react-hook-form";
import { InvitationOtpStep } from "./invitation-otp-step";

function Harness({ onValue }: { onValue: (value: string) => void }) {
  const otpForm = useForm<{ emailOtp: string }>({ defaultValues: { emailOtp: "" } });
  onValue(otpForm.watch("emailOtp"));
  return (
    <InvitationOtpStep
      invitedEmail="new@example.test"
      otpForm={otpForm}
      onSubmit={jest.fn()}
      onResend={jest.fn()}
      isVerifyPending={false}
      isResendPending={false}
    />
  );
}

describe("InvitationOtpStep code entry (HRMS-026)", () => {
  it.each([
    [" 123456", "123456"],
    ["123 456", "123456"],
    ["123-456\n", "123456"],
    ["1234567", "123456"],
  ])("keeps every digit of a pasted %j", (pasted, expected) => {
    let latest = "";
    render(<Harness onValue={(value) => (latest = value)} />);
    fireEvent.change(screen.getByLabelText("Verification code"), { target: { value: pasted } });
    expect(latest).toBe(expected);
    expect(screen.getByLabelText("Verification code")).toHaveValue(expected);
  });
});
