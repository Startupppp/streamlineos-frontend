import { render, screen } from "@testing-library/react";
import { BalanceCard } from "../leaves-shared";

describe("leave balance card label (HR-U-005)", () => {
  it.each(["Casual Leave", "Sick Leave", "Earned Leave", "QA Leave 1013"])(
    "shows the stored leave type name %j, the same text the request form and the My leaves table show",
    (typeName) => {
      render(<BalanceCard typeName={typeName} balance="3" daysPerYear={12} />);
      expect(screen.getByText(typeName)).toBeInTheDocument();
      expect(screen.queryByText(/^(CASUAL|SICK|UNPAID|LEAVE)$/)).not.toBeInTheDocument();
    },
  );
});
