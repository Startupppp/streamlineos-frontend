
import { pgTable, text, serial, timestamp, boolean, integer, index, date, jsonb } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { organizations, users } from "./auth";


export interface LandingPageTestimonial {
  id: string;
  name: string;
  role?: string;
  text: string;
  avatar?: string;
  rating?: number;
}

export interface LandingPageSettings {
  testimonials?: LandingPageTestimonial[];
  trustBadges?: string[];
  showTrustSection?: boolean;
}

export const landingPages = pgTable("landing_pages", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id, { onDelete: "cascade" }).notNull(),
  name: text("name").notNull(),
  slug: text("slug"),
  title: text("title"),
  content: text("content"),
  isPublished: boolean("is_published").default(false).notNull(),
  url: text("url").notNull(),
  description: text("description"),
  isActive: boolean("is_active").default(true).notNull(),
  settings: jsonb("settings").$type<LandingPageSettings>(),
  createdBy: text("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull().$onUpdate(() => new Date()),
}, (table) => [
  index("idx_landing_pages_org").on(table.orgId),
]);

export const pageViews = pgTable("page_views", {
  id: serial("id").primaryKey(),
  pageId: integer("page_id").references(() => landingPages.id, { onDelete: "cascade" }),
  orgId: text("org_id").references(() => organizations.id, { onDelete: "cascade" }).notNull(),
  referrer: text("referrer"),
  country: text("country"),
  city: text("city"),
  deviceType: text("device_type"),
  utmSource: text("utm_source"),
  utmMedium: text("utm_medium"),
  utmCampaign: text("utm_campaign"),
  abVariant: text("ab_variant"),
  viewedAt: timestamp("viewed_at").defaultNow().notNull(),
}, (table) => [
  index("page_views_page_id_idx").on(table.pageId),
  index("page_views_org_id_idx").on(table.orgId),
  index("page_views_viewed_at_idx").on(table.viewedAt),
]);


export const landingPagesRelations = relations(landingPages, ({ one, many }) => ({
  creator: one(users, {
    fields: [landingPages.createdBy],
    references: [users.id],
  }),
  views: many(pageViews),
}));

export const pageViewsRelations = relations(pageViews, ({ one }) => ({
  page: one(landingPages, {
    fields: [pageViews.pageId],
    references: [landingPages.id],
  }),
}));


export const abTests = pgTable(
  "ab_tests",
  {
    id: serial("id").primaryKey(),
    orgId: text("org_id").references(() => organizations.id, { onDelete: "cascade" }).notNull(),
    name: text("name").notNull(),
    description: text("description"),
    status: text("status").default("draft").notNull(),
    variantASubject: text("variant_a_subject").notNull(),
    variantBSubject: text("variant_b_subject").notNull(),
    variantABody: text("variant_a_body"),
    variantBBody: text("variant_b_body"),
    splitPercent: integer("split_percent").default(50).notNull(),
    audienceSize: integer("audience_size").default(0).notNull(),
    variantASent: integer("variant_a_sent").default(0).notNull(),
    variantBSent: integer("variant_b_sent").default(0).notNull(),
    variantAOpens: integer("variant_a_opens").default(0).notNull(),
    variantBOpens: integer("variant_b_opens").default(0).notNull(),
    variantAClicks: integer("variant_a_clicks").default(0).notNull(),
    variantBClicks: integer("variant_b_clicks").default(0).notNull(),
    winnerVariant: text("winner_variant"),
    startedAt: timestamp("started_at"),
    endedAt: timestamp("ended_at"),
    createdBy: text("created_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull().$onUpdate(() => new Date()),
  },
  (t) => [
    index("ab_tests_org_id_idx").on(t.orgId),
    index("ab_tests_org_status_idx").on(t.orgId, t.status),
  ]
);

export const abTestsRelations = relations(abTests, ({ one }) => ({
  creator: one(users, {
    fields: [abTests.createdBy],
    references: [users.id],
  }),
}));


export const socialMetrics = pgTable(
  "social_metrics",
  {
    id: serial("id").primaryKey(),
    orgId: text("org_id").references(() => organizations.id, { onDelete: "cascade" }).notNull(),
    platform: text("platform").notNull(),
    metricDate: date("metric_date").notNull(),
    followers: integer("followers").default(0).notNull(),
    impressions: integer("impressions").default(0).notNull(),
    engagements: integer("engagements").default(0).notNull(),
    clicks: integer("clicks").default(0).notNull(),
    shares: integer("shares").default(0).notNull(),
    comments: integer("comments").default(0).notNull(),
    reach: integer("reach").default(0).notNull(),
    recordedBy: text("recorded_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    index("social_metrics_org_platform_idx").on(t.orgId, t.platform),
    index("social_metrics_date_idx").on(t.metricDate),
  ]
);

export const socialMetricsRelations = relations(socialMetrics, ({ one }) => ({
  recorder: one(users, {
    fields: [socialMetrics.recordedBy],
    references: [users.id],
  }),
}));

export const contentCalendarItems = pgTable("content_calendar_items", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id, { onDelete: "cascade" }).notNull(),
  title: text("title").notNull(),
  contentType: text("content_type").notNull().default("blog"),
  channel: text("channel"),
  status: text("status").default("idea").notNull(),
  scheduledDate: date("scheduled_date"),
  publishedDate: date("published_date"),
  assignedTo: text("assigned_to").references(() => users.id, { onDelete: "set null" }),
  description: text("description"),
  tags: text("tags").array().default([]).notNull(),
  createdBy: text("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull().$onUpdate(() => new Date()),
}, (table) => [
  index("content_calendar_org_id_idx").on(table.orgId),
  index("content_calendar_scheduled_date_idx").on(table.scheduledDate),
  index("content_calendar_org_status_idx").on(table.orgId, table.status),
]);

export const contentCalendarItemsRelations = relations(contentCalendarItems, ({ one }) => ({
  creator: one(users, {
    fields: [contentCalendarItems.createdBy],
    references: [users.id],
  }),
}));
