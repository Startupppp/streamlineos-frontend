import { managedProductsCreateManagedProductBodySchema } from "@/contracts/build-contracts.generated";
import {
  createManagedProductSchema,
  editManagedProductSchema,
  toCreateManagedProductInput,
} from "./managed-product-schema";

describe("createManagedProductSchema", () => {
  const BASE = { name: "Alpha", key: "ALPHA-001", description: "", ownerId: "", segments: [], tags: [], successMetrics: [] };

  it("accepts a valid managed product", () => {
    expect(createManagedProductSchema.safeParse(BASE).success).toBe(true);
  });

  it("rejects a whitespace-only name before the request is sent", () => {
    const result = createManagedProductSchema.safeParse({ ...BASE, name: "   " });
    expect(result.success).toBe(false);
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
      segments: [],
      tags: [],
      successMetrics: [],
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

  it("rejects more than 20 tags", () => {
    const tags = Array.from({ length: 21 }, (_, i) => `tag${i}`);
    expect(createManagedProductSchema.safeParse({ ...BASE, tags }).success).toBe(false);
  });

  it("rejects a tag longer than 40 characters", () => {
    expect(createManagedProductSchema.safeParse({ ...BASE, tags: ["a".repeat(41)] }).success).toBe(false);
  });

  it("rejects more than 20 segments", () => {
    const segments = Array.from({ length: 21 }, (_, i) => `seg${i}`);
    expect(createManagedProductSchema.safeParse({ ...BASE, segments }).success).toBe(false);
  });

  it("accepts 20 tags of at most 40 characters", () => {
    const tags = Array.from({ length: 20 }, (_, i) => `tag${i}`);
    expect(createManagedProductSchema.safeParse({ ...BASE, tags }).success).toBe(true);
  });
});

describe("editManagedProductSchema", () => {
  const BASE = { name: "P", description: "", ownerId: "", status: "active", segments: [], tags: [] };

  it("rejects more than 10 success metrics", () => {
    const successMetrics = Array.from({ length: 11 }, (_, i) => ({ label: `m${i}` }));
    expect(editManagedProductSchema.safeParse({ ...BASE, successMetrics }).success).toBe(false);
  });

  it("accepts 10 success metrics", () => {
    const successMetrics = Array.from({ length: 10 }, (_, i) => ({ label: `m${i}` }));
    expect(editManagedProductSchema.safeParse({ ...BASE, successMetrics }).success).toBe(true);
  });
});
