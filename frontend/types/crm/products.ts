export interface Product {
  id: number;
  orgId: string;
  name: string;
  description: string | null;
  sku: string | null;
  category: string | null;
  unitPrice: number;
  currency: string;
  taxRate: number;
  isActive: boolean;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface CreateProductInput {
  name: string;
  description?: string;
  sku?: string;
  category?: string;
  unitPrice: number;
  currency?: string;
  taxRate?: number;
}

export interface UpdateProductInput extends Partial<CreateProductInput> {
  id: number;
  isActive?: boolean;
}

export interface ProductsResponse {
  products: Product[];
  total: number;
}
