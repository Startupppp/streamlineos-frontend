import { managedProductsCreateManagedProductBodySchema } from "@/contracts/build-contracts.generated";
import {
  createManagedProductSchema,
  toCreateManagedProductInput,
} from "./managed-product-schema";

describe("createManagedProductSchema", () => {
  const BASE = { name: "Alpha", key: "ALPHA-001", description: "", ownerId: "" };

  it("accepts a valid managed product", () => {
    expect(createManagedProductSchema.safeParse(BASE).success).toBe(true);
  });

  it("rejects invalid keys before the request is sent", () => {
    const result = createManagedProductSchema.safeParse({ ...BASE, key: "lowercase key" });
    expect(result.success).toBe(false);
  });

  it("builds a request accepted by the generated create endpoint contract", () => {
    const values = createManagedProductSchema.parse({
      name: "Content Hub",
      key: "CNTHUB",
      description: "Product planning",
      ownerId: "user-1",
    });

    const request = toCreateManagedProductInput(values);

    expect(managedProductsCreateManagedProductBodySchema.safeParse(request).success).toBe(true);
    expect(request).toEqual({
      name: "Content Hub",
      key: "CNTHUB",
      description: "Product planning",
      ownerId: "user-1",
    });
  });

  it("omits empty optional fields instead of sending invalid empty values", () => {
    const request = toCreateManagedProductInput(createManagedProductSchema.parse(BASE));

    expect(request).toEqual({ name: "Alpha", key: "ALPHA-001" });
    expect(managedProductsCreateManagedProductBodySchema.safeParse(request).success).toBe(true);
  });
});
