import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AddAssetSheet, useAssetForm } from "./asset-form-sheet";

function Harness() {
  const form = useAssetForm();
  return (
    <AddAssetSheet
      open
      onOpenChange={() => {}}
      form={form}
      assets={[]}
      isPending={false}
      onSubmit={() => {}}
    />
  );
}

it("reports every blank required field on the first submit", async () => {
  render(<Harness />);
  await userEvent.click(screen.getByRole("button", { name: "Register Asset" }));
  await waitFor(() => expect(screen.getByText("Asset name is required")).toBeInTheDocument());
  expect(screen.getByText("Serial number is required")).toBeInTheDocument();
  expect(screen.getByText("Brand is required")).toBeInTheDocument();
  expect(screen.getByText("Model is required")).toBeInTheDocument();
});
