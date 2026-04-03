# Task 16: Marketing Module

## Priority: MEDIUM | Effort: 4-5 days | Dependencies: Task 07 (UI/UX) | Status: NOT STARTED

---

## PRD

### Problem Statement
The marketing module currently has:
1. **Placeholder page**: `app/(dashboard)/marketing/page.tsx` exists but lacks real functionality
2. **Digital marketing pages exist** (`digital-marketing/campaigns`, `social`, `leads`) but are separate from main marketing
3. **No campaign management**: Can't create, track, or analyze marketing campaigns
4. **No content calendar**: No way to plan and schedule content
5. **No lead attribution**: Can't track which campaign/channel generated which leads
6. **No email marketing**: No bulk email campaigns with templates and tracking
7. **No analytics dashboard**: No marketing ROI, CAC, campaign performance metrics

### Goals
- Build comprehensive marketing dashboard with ROI metrics
- Create campaign management with lifecycle tracking
- Integrate marketing leads with CRM lead pipeline (merge digital marketing into main marketing)
- Build content calendar with scheduling
- Add email campaign builder with templates
- Add lead source attribution and conversion tracking
- Implement marketing analytics with charts

### Non-Goals
- Social media posting API integration (use Composio in Task 09)
- Ad platform integration (Google Ads, Facebook Ads API)
- Marketing automation rules engine (future)
- A/B testing infrastructure

### Success Criteria
- Marketing dashboard shows: campaigns, leads generated, conversion rate, CAC, ROI
- Campaigns can be created with budget, timeline, target audience
- Content calendar shows planned vs published content
- Email campaigns can be sent with templates
- Lead attribution tracks source campaign
- Marketing team has dedicated sidebar navigation

---

## Rules to Follow

1. **Merge Digital Marketing**: Consolidate `digital-marketing/` into `marketing/` module
2. **Attribution First**: Every lead must track its source campaign/channel
3. **Existing Components**: Reuse DataTable, MetricCard, FilterBar from shared components
4. **Existing Charts**: Use Recharts (already installed) for all visualizations
5. **Existing Email**: Leverage existing email templates system, don't rebuild
6. **Role Access**: Marketing module accessible to CEO, HR, MARKETING, DIGITAL_MARKETING roles

---

## Implementation Steps

### Step 1: Database Schema

**New tables**:
```ts
export const marketingCampaigns = pgTable("marketing_campaigns", {
  id: text("id").primaryKey(),
  orgId: text("org_id").notNull().references(() => organizations.id),
  name: text("name").notNull(),
  type: text("type").notNull(), // "email", "social", "event", "content", "referral", "paid"
  status: text("status").default("draft").notNull(), // "draft", "active", "paused", "completed", "cancelled"
  budget: numeric("budget"),
  spent: numeric("spent").default("0"),
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  targetAudience: jsonb("target_audience"),
  channels: jsonb("channels").$type<string[]>(), // ["email", "linkedin", "twitter", "instagram"]
  goals: jsonb("goals"), // { leads: 100, conversions: 10, revenue: 500000 }
  metrics: jsonb("metrics"), // auto-updated: { impressions, clicks, leads, conversions }
  createdBy: text("created_by").notNull().references(() => users.id),
  updatedBy: text("updated_by"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const contentCalendar = pgTable("content_calendar", {
  id: text("id").primaryKey(),
  orgId: text("org_id").notNull().references(() => organizations.id),
  campaignId: text("campaign_id").references(() => marketingCampaigns.id),
  title: text("title").notNull(),
  type: text("type").notNull(), // "blog", "social_post", "email", "video", "webinar", "event"
  platform: text("platform"), // "linkedin", "twitter", "instagram", "website", "email"
  status: text("status").default("planned").notNull(), // "planned", "in_progress", "review", "approved", "published"
  scheduledDate: timestamp("scheduled_date"),
  publishedDate: timestamp("published_date"),
  content: text("content"),
  attachments: jsonb("attachments").$type<string[]>(),
  assignedTo: text("assigned_to").references(() => users.id),
  createdBy: text("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
```

### Step 2: Marketing Dashboard Page

**File**: `app/(dashboard)/marketing/page.tsx` (rewrite)

**Layout**:
```
┌─────────────────────────────────────────────────┐
│ Marketing Dashboard                              │
├──────────┬──────────┬──────────┬────────────────┤
│ Active   │ Leads    │ Conv.    │ Marketing      │
│ Campaigns│ Generated│ Rate     │ Spend/ROI      │
├──────────┴──────────┴──────────┴────────────────┤
│ ┌─────────────────────┐ ┌─────────────────────┐ │
│ │ Lead Source          │ │ Campaign            │ │
│ │ Distribution (Pie)   │ │ Performance (Bar)   │ │
│ └─────────────────────┘ └─────────────────────┘ │
├─────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────┐ │
│ │ Lead Trend Over Time (Area Chart)           │ │
│ └─────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────┤
│ Active Campaigns Table                           │
│ [Campaign | Status | Budget | Leads | Conv | ROI]│
└─────────────────────────────────────────────────┘
```

### Step 3: Campaign Management Pages

**Files**:
- `app/(dashboard)/marketing/campaigns/page.tsx` - Campaign list with filters
- `app/(dashboard)/marketing/campaigns/[id]/page.tsx` - Campaign detail
- `app/(dashboard)/marketing/campaigns/new/page.tsx` - Create campaign form

### Step 4: Content Calendar

**Files**:
- `app/(dashboard)/marketing/content/page.tsx` - Content calendar (FullCalendar or custom)
- Drag-and-drop to reschedule content
- Color-coded by type (blog=blue, social=purple, email=green, video=red)
- Side panel for content details

### Step 5: Email Campaigns

**Files**:
- `app/(dashboard)/marketing/email/page.tsx` - Email campaign builder
- Template selection from existing CRM email templates
- Recipient list from leads/contacts
- Schedule sending
- Track opens/clicks (via SendGrid webhooks or pixel tracking)

### Step 6: Merge Digital Marketing Module

- Move `digital-marketing/campaigns` → `marketing/campaigns`
- Move `digital-marketing/leads` → `marketing/leads`
- Move `digital-marketing/social` → `marketing/social`
- Update sidebar navigation
- Redirect old routes to new ones
- Delete old `digital-marketing/` directory

### Step 7: Update Sidebar Navigation

Add marketing sub-items:
```
Marketing
├── Dashboard
├── Campaigns
├── Content Calendar
├── Email Campaigns
├── Social Media
├── Marketing Leads
└── Analytics
```

---

## Checklist

- [ ] Create `marketing_campaigns` table migration
- [ ] Create `content_calendar` table migration
- [ ] Create marketing tRPC router
- [ ] Build marketing dashboard page with metrics
- [ ] Build campaign list page with filters
- [ ] Build campaign detail page
- [ ] Build campaign creation form
- [ ] Build content calendar page
- [ ] Build email campaign builder
- [ ] Merge digital-marketing pages into marketing module
- [ ] Update sidebar navigation for marketing
- [ ] Add lead source attribution tracking
- [ ] Create Recharts visualizations (pie, bar, area)
- [ ] Add loading/error/empty states
- [ ] Test: Create campaign, track leads, view metrics
- [ ] `pnpm build` passes

---

## Acceptance Criteria

1. Marketing dashboard shows live metrics
2. Campaigns can be created, edited, and tracked
3. Content calendar allows drag-and-drop scheduling
4. Email campaigns can be sent to lead segments
5. Lead attribution tracks source campaign
6. Digital marketing module merged into marketing
7. Marketing team sees only their authorized content
