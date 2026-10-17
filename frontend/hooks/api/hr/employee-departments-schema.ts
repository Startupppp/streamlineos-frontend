import { z } from "zod";

export const departmentItemContract = z.object({
  id: z.union([z.string(), z.number()]).transform(String),
  name: z.string(),
});

const departmentArrayContract = z.array(departmentItemContract);

export const departmentListContract = z.union([
  departmentArrayContract,
  z.object({ data: departmentArrayContract }).transform((value) => value.data),
  z.object({ items: departmentArrayContract }).transform((value) => value.items),
]);
