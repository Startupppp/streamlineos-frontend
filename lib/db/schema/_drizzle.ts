/**
 * Shared Drizzle imports used across all schema domain files.
 * Re-exported here so domain files have a single import source for Drizzle primitives.
 */
export {
  pgTable,
  text,
  serial,
  timestamp,
  boolean,
  jsonb,
  decimal,
  date,
  integer,
  pgEnum,
  foreignKey,
  index,
  uniqueIndex,
  unique,
} from "drizzle-orm/pg-core";

export { relations } from "drizzle-orm";
