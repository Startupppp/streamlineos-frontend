import { fireEvent, render, screen } from "@testing-library/react";
import { TestPaymentTab } from "./test-payment-tab";

const mockCreate = jest.fn();
const mockVerify = jest.fn();
const mockScript = jest.fn();

jest.mock("@/hooks/api/access", () => ({ useCan: () => true }));
jest.mock("@/hooks/api/payments", () => ({
  useTestTransactions: () => ({ data: [], isError: false, error: null, refetch: jest.fn() }),
  useCreateTestTransaction: () => ({ mutate: mockCreate, isPending: false }),
  useVerifyTestTransaction: () => ({ mutate: mockVerify, isPending: false }),
}));
jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));
jest.mock("next/script", () => ({
  __esModule: true,
  default: (props: { src: string }) => {
    mockScript(props.src);
    return null;
  },
}));

type Callbacks = { onSuccess: (value: unknown) => void };

beforeEach(() => {
  mockCreate.mockReset();
  mockVerify.mockReset();
  mockScript.mockReset();
});

describe("TestPaymentTab — Stripe", () => {
  it("charges in USD and confirms server-side with the intent id, no signature, no Razorpay script", () => {
    render(<TestPaymentTab providerKey="stripe" />);
    expect(screen.getByLabelText("Amount (USD)")).toBeInTheDocument();
    expect(mockScript).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: /run test payment/i }));
    expect(mockCreate).toHaveBeenCalledWith({ amount: "499.00", currency: "USD" }, expect.anything());

    const [, created] = mockCreate.mock.calls[0] as [unknown, Callbacks];
    created.onSuccess({ id: 9, providerOrderId: "pi_1", keyId: "pk_test_x", amount: "499.00", currency: "USD" });
    expect(mockVerify).toHaveBeenCalledWith({ id: 9, providerPaymentId: "pi_1", signature: undefined }, expect.anything());
  });

  it("keeps the Razorpay checkout path for Razorpay", () => {
    render(<TestPaymentTab providerKey="razorpay" />);
    expect(screen.getByLabelText("Amount (INR)")).toBeInTheDocument();
    expect(mockScript).toHaveBeenCalledWith("https://checkout.razorpay.com/v1/checkout.js");
  });
});
