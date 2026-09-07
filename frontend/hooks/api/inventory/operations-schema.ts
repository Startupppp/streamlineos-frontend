import { z } from "zod";

const userRefContract = z.object({ id: z.string(), name: z.string().nullable() });

const grnLineContract = z.object({
  id: z.number().int(),
  grnId: z.number().int(),
  poLineId: z.number().int(),
  quantityReceived: z.string(),
  uomId: z.number().int().nullable(),
  quantityEntered: z.string().nullable(),
  status: z.string(),
  rejectionReason: z.string().nullable(),
});

const grnContract = z.object({
  id: z.number().int(),
  orgId: z.string(),
  grnNumber: z.string(),
  poId: z.number().int(),
  receivedDate: z.string(),
  locationId: z.number().int().nullable(),
  status: z.string(),
  notes: z.string().nullable(),
  createdBy: z.string(),
  createdByMembershipId: z.number().int().nullable(),
  createdAt: z.string(),
  creator: userRefContract.optional(),
  po: z.object({ id: z.number().int(), poNumber: z.string() }).optional(),
  lines: z.array(grnLineContract).optional(),
});

export const listGrnsOperationsContract = z.object({
  items: z.array(grnContract),
  total: z.number().int(),
  page: z.number().int(),
  totalPages: z.number().int(),
});

export const getGrnOperationsContract = grnContract;

const vendorReturnLineContract = z.object({
  id: z.number().int(),
  returnId: z.number().int(),
  productVariantId: z.number().int(),
  lotId: z.number().int().nullable(),
  serialId: z.number().int().nullable(),
  quantity: z.string(),
  status: z.string().optional(),
  unitCost: z.string().nullable().optional(),
});

const vendorReturnContract = z.object({
  id: z.number().int(),
  orgId: z.string(),
  returnNumber: z.string(),
  vendorId: z.number().int(),
  poId: z.number().int().nullable(),
  grnId: z.number().int().nullable(),
  status: z.string(),
  notes: z.string().nullable(),
  createdBy: z.string(),
  createdByMembershipId: z.number().int().nullable(),
  approvedBy: z.string().nullable(),
  approvedByMembershipId: z.number().int().nullable(),
  postedAt: z.string().nullable(),
  cancelledAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  creator: userRefContract.optional(),
  approver: userRefContract.nullable().optional(),
  lines: z.array(vendorReturnLineContract).optional(),
});

export const listVendorReturnsContract = z.object({
  items: z.array(vendorReturnContract),
  total: z.number().int(),
  page: z.number().int(),
  totalPages: z.number().int(),
});

export const getVendorReturnContract = vendorReturnContract;

const customerReturnLineContract = z.object({
  id: z.number().int(),
  returnId: z.number().int(),
  productVariantId: z.number().int(),
  lotId: z.number().int().nullable(),
  serialId: z.number().int().nullable(),
  quantity: z.string(),
  notes: z.string().nullable(),
});

const customerReturnContract = z.object({
  id: z.number().int(),
  orgId: z.string(),
  returnNumber: z.string(),
  soId: z.number().int().nullable(),
  shipmentId: z.number().int().nullable(),
  clientId: z.number().int().nullable(),
  status: z.string(),
  notes: z.string().nullable(),
  createdBy: z.string(),
  createdByMembershipId: z.number().int().nullable(),
  approvedBy: z.string().nullable(),
  approvedByMembershipId: z.number().int().nullable(),
  postedAt: z.string().nullable(),
  cancelledAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  creator: userRefContract.optional(),
  approver: userRefContract.nullable().optional(),
  lines: z.array(customerReturnLineContract).optional(),
});

export const listCustomerReturnsContract = z.object({
  items: z.array(customerReturnContract),
  total: z.number().int(),
  page: z.number().int(),
  totalPages: z.number().int(),
});

export const getCustomerReturnContract = customerReturnContract;
