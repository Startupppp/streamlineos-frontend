import {
  createManagedProductSchema,
  PRODUCT_TYPE_OPTIONS,
  type ProductType,
} from "./managed-product-schema";

describe("createManagedProductSchema — product type field (BT-1680ac475463)", () => {
  const BASE = { name: "Alpha", key: "ALPHA-001", description: "", ownerId: "" };

  it("accepts no productType so existing products without a type are unaffected", () => {
    const result = createManagedProductSchema.safeParse(BASE);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.productType).toBeUndefined();
  });

  it.each<ProductType>(["software_product", "content_brief", "freelancer_project"])(
    "accepts productType=%s so each template type can be selected",
    (productType) => {
      const result = createManagedProductSchema.safeParse({ ...BASE, productType });
      expect(result.success).toBe(true);
      if (result.success) expect(result.data.productType).toBe(productType);
    },
  );

  it("rejects an unknown productType so the form cannot submit a type the backend does not recognise", () => {
    const result = createManagedProductSchema.safeParse({ ...BASE, productType: "unknown_type" });
    expect(result.success).toBe(false);
  });

  it("PRODUCT_TYPE_OPTIONS covers all three template types in the declared order", () => {
    const values = PRODUCT_TYPE_OPTIONS.map((o) => o.value);
    expect(values).toContain("software_product");
    expect(values).toContain("content_brief");
    expect(values).toContain("freelancer_project");
    expect(values).toHaveLength(3);
  });

  it("each PRODUCT_TYPE_OPTIONS entry has a human-readable label distinct from its value", () => {
    for (const opt of PRODUCT_TYPE_OPTIONS) {
      expect(opt.label).toBeTruthy();
      expect(opt.label).not.toBe(opt.value);
    }
  });
});

describe("createManagedProductSchema — productType flows to onSubmitCreate (BT-1680ac475463)", () => {
  it("the form values include productType when set so the mutation receives the template type for downstream project wiring", () => {
    const result = createManagedProductSchema.safeParse({
      name: "Content Hub", key: "CNTHUB", description: "", ownerId: "", productType: "content_brief",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.productType).toBe("content_brief");
      expect(result.data.name).toBe("Content Hub");
    }
  });

  it("the form values include productType=freelancer_project so SOW-backed project wiring is triggered", () => {
    const result = createManagedProductSchema.safeParse({
      name: "Design Sprint", key: "DSPRINT", description: "", ownerId: "", productType: "freelancer_project",
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.productType).toBe("freelancer_project");
  });

  it("the form values include productType=software_product so spec-and-tech-stack fields are forwarded to the mutation", () => {
    const result = createManagedProductSchema.safeParse({
      name: "Platform API", key: "PLTAPI", description: "", ownerId: "", productType: "software_product",
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.productType).toBe("software_product");
  });
});
