import { fireEvent, render, screen } from "@testing-library/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ManagedProductCreateFields } from "./managed-product-create-fields";
import {
  createManagedProductSchema,
  type CreateManagedProductFormValues,
} from "./managed-product-schema";

jest.mock("@/components/shared", () => ({
  MemberPicker: () => null,
}));

jest.mock("@/features/recruitment/jobs/create-job-form/chip-input", () => ({
  ChipInput: () => null,
}));

function Harness() {
  const form = useForm<CreateManagedProductFormValues>({
    resolver: zodResolver(createManagedProductSchema),
    defaultValues: { name: "", key: "", description: "", ownerId: "", segments: [], tags: [] },
  });
  return <ManagedProductCreateFields form={form} formId="create-product" onSubmit={jest.fn()} />;
}

describe("ManagedProductCreateFields key suggestion", () => {
  it("suggests the key from the name until the key is edited by hand", () => {
    render(<Harness />);
    const name = screen.getByPlaceholderText("Product name");
    const key = screen.getByPlaceholderText("PROD");

    fireEvent.change(name, { target: { value: "Acme mobile app 2" } });
    expect(key).toHaveValue("ACMEMOBILE");

    fireEvent.change(key, { target: { value: "ACM" } });
    fireEvent.change(name, { target: { value: "Something else" } });
    expect(key).toHaveValue("ACM");
  });

  it("states the key format before the form is submitted", () => {
    render(<Harness />);
    expect(screen.getByText(/uppercase letters, digits, hyphens or underscores/)).toBeInTheDocument();
  });
});
