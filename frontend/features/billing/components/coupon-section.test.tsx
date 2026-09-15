import { render, screen } from "@testing-library/react";
import { CouponSection } from "./coupon-section";

it("does not allow coupon validation before a plan is selected", () => {
  render(
    <CouponSection
      couponInput="SAVE20"
      appliedCoupon={null}
      couponResult={undefined}
      isValidatingCoupon={false}
      canApply={false}
      onInputChange={jest.fn()}
      onApply={jest.fn()}
      onRemove={jest.fn()}
    />,
  );

  expect(screen.getByRole("button", { name: "Apply" })).toBeDisabled();
});
