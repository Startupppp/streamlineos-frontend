import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TooltipProvider } from "@/components/ui/tooltip";
import type { Asset } from "@/types/hr";
import { buildAssetColumns } from "./asset-columns";

const asset: Asset = {
  id: 7,
  orgId: "org",
  name: "MacBook",
  type: "LAPTOP",
  brand: null,
  model: null,
  serialNumber: null,
  assignedTo: null,
  status: "AVAILABLE",
  purchaseDate: null,
  purchaseCost: null,
  location: null,
  notes: null,
  version: 1,
  createdAt: null,
  updatedAt: null,
};

describe("asset columns — actions", () => {
  it("keeps Retire out of the icon row and behind the overflow menu", async () => {
    const onRetire = jest.fn();
    const actions = buildAssetColumns([], jest.fn(), jest.fn(), onRetire, true).find((column) => column.key === "actions");
    render(<TooltipProvider>{actions?.cell(asset)}</TooltipProvider>);

    expect(screen.getByRole("button", { name: "Edit asset" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Retire asset" })).toBeNull();

    await userEvent.setup().click(screen.getByRole("button", { name: "More actions for MacBook" }));
    await userEvent.setup().click(await screen.findByRole("menuitem", { name: "Retire asset" }));
    expect(onRetire).toHaveBeenCalledWith(7);
  });
});
