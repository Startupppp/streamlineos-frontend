import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { invWarehouses, invLocations } from "../frontend/lib/db/schema/inventory/warehouses";
import { invProducts, invProductVariants } from "../frontend/lib/db/schema/inventory/core";
import { invStockLevels } from "../frontend/lib/db/schema/inventory/stock";
import { organizations } from "../frontend/lib/db/schema/auth";
import "dotenv/config";

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql);

async function seed() {
  const org = await db.query.organizations.findFirst({ columns: { id: true, name: true } });
  if (!org) {
    console.error("No organization found. Run migrations and create an org first.");
    process.exit(1);
  }

  console.log(`Seeding inventory for org: ${org.name} (${org.id})`);

  const [warehouse] = await db
    .insert(invWarehouses)
    .values({
      orgId: org.id,
      name: "Main Warehouse",
      code: "WH-001",
      isActive: true,
    })
    .returning({ id: invWarehouses.id });

  const [location] = await db
    .insert(invLocations)
    .values({
      orgId: org.id,
      warehouseId: warehouse.id,
      name: "Main Floor",
      code: "LOC-001",
      isActive: true,
    })
    .returning({ id: invLocations.id });

  const productDefs = [
    { sku: "PROD-001", name: "Office Chair", category: "Furniture", unitCost: "299.99", unitPrice: "449.99" },
    { sku: "PROD-002", name: "Laptop Stand", category: "Electronics", unitCost: "49.99", unitPrice: "89.99" },
    { sku: "PROD-003", name: "Wireless Keyboard", category: "Electronics", unitCost: "39.99", unitPrice: "69.99" },
  ];

  for (const def of productDefs) {
    const [product] = await db
      .insert(invProducts)
      .values({ orgId: org.id, sku: def.sku, name: def.name, isActive: true })
      .returning({ id: invProducts.id });

    const [variant] = await db
      .insert(invProductVariants)
      .values({
        orgId: org.id,
        productId: product.id,
        sku: def.sku,
        name: "Default",
        costPrice: def.unitCost,
        sellPrice: def.unitPrice,
        isActive: true,
      })
      .returning({ id: invProductVariants.id });

    await db.insert(invStockLevels).values({
      orgId: org.id,
      productVariantId: variant.id,
      locationId: location.id,
      onHand: String(Math.floor(Math.random() * 50) + 10),
      committed: "0",
      onOrder: "0",
    });
  }

  console.log(`Seeded: 1 warehouse, 1 location, ${productDefs.length} products with stock levels.`);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
