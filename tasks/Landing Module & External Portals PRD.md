**PRODUCT REQUIREMENTS DOCUMENT**

Landing Module & External Portals

**Project:** Vaivamm Capital CRM — Landing Pages Module **Version:** 1.0 **Date:** April 11, 2026 **Author:** Tarun (Product Owner) **Status:** Draft

**Table of Contents**

1. Overview & Objective  
2. Current Flow Analysis  
3. Proposed Enhanced Flow  
4. Feature Specifications  
5. Database Schema Changes  
6. API Endpoints  
7. UI/UX Wireframe Descriptions  
8. Roles & Permissions  
9. Edge Cases & Error Handling  
10. Technical Implementation Notes  
11. Success Metrics  
12. Timeline & Milestones

---

**1\. Overview & Objective**

**1.1 Background**

The CRM needs an external face to directly capture raw leads generated from marketing efforts. The landing module bridges the gap between public unauthenticated web traffic and the internal CRM database.

**1.2 Objective**

Develop high-converting, public-facing Next.js pages hosting dynamic forms that inject directly into the CRM's deals/leads tables without third-party integration tools like Zapier.

**2\. Current Flow Analysis**

**2.1 Current Process**

Using external landing page builders (e.g. Unbounce or WordPress) requires fragile API keys, webhooks, or manual CSV exports.

**3\. Proposed Enhanced Flow**

**3.1 Direct Injection**

The landing module serves as a lightweight CMS serving routes like /landing/q3-promo. Visitors hit the page, read the copy, and fill out a contact form. Upon submit, the backend executes INSERT INTO leads, pings the Sales team over the chat module, and displays a success thank-you page to the visitor.

**4\. Feature Specifications**

**4.1 UTM Tracking**

The landing page must aggressively parse URL query parameters (e.g., ?utm\_source=facebook\&utm\_campaign=spring2026) and append this attribution data silently to the lead payload.

**4.2 Bot Protection**

Invisible ReCAPTCHA v3 or Turnstile integration on all external submit forms to prevent spam submissions from cluttering the Sales Kanban.

**4.3 A/B Routing (Future Scope)**

Mechanism to serve two variations of the hero copy based on randomization to maximize conversion metrics.

**5\. Database Schema Changes**

**5.1 Modified/New Tables**

leads (Or deals extension)

| Column | Type | Description |
| :---- | :---- | :---- |
| utmSource | text | Attribution (e.g. 'google') |
| utmCampaign | text | Attribution (e.g. 'ads\_v1') |
| ipAddress | text | For geolocation/spam checks |

**6\. API Endpoints**

| Method | Endpoint | Description | Auth |
| :---- | :---- | :---- | :---- |
| POST | /api/landing/submit | Accepts form payload and creates lead | Public |

**7\. UI/UX Wireframe Descriptions**

* **Marketing Page:** A slick, fast-loading unauthenticated page conforming to Vaivamm's brand colors. Large Hero Title, Trust Badges, and a Sticky "Get a Query" Form embedded on the right or heavily prompted via CTA buttons.

**8\. Roles & Permissions**

| Permission | Marketing / Admin | Sales | General Employee |
| :---- | :---- | :---- | :---- |
| Create new routes | ✓ (Via code/CMS) | ✘ | ✘ |
| View UTM data | ✓ | ✓ | ✘ |

**9\. Edge Cases & Error Handling**

* **Rate Limiting:** Because the /api/landing/submit endpoint is public, it must use IP-based rate limiting (e.g., Max 5 submissions per minute per IP) to prevent malicious database flooding.

**10\. Technical Implementation Notes**

* External pages should heavily utilize Next.js generateStaticParams or ISSG (Incremental Static Regeneration) to ensure instant PageSpeed scores for SEO and better conversion.

**11\. Success Metrics**

* Form-to-CRM API latency \< 300ms.  
* 100% of organic/paid leads correctly tagged with UTM attribution metrics.

**12\. Timeline & Milestones**

* **Phase 1:** Marketing Page UI design and React build (4 Days)  
* **Phase 2:** Public Endpoint & Bot Protections (3 Days)  
* **Phase 3:** UTM mapping into CRM Deal creation (2 Days)  
* **Estimated Total: \~1.5 Weeks**

 


---

## Status: IN PROGRESS

## Checklist

### Database
- [x] `landing_pages` table — `id, orgId, slug, title, content, isPublished`
- [x] `page_views` table — visitor tracking
- [x] `web_lead_forms` — web form submissions
- [ ] `leads.utmSource`, `utmMedium`, `utmCampaign`, `utmContent`, `utmTerm` — UTM attribution columns
- [ ] `leads.ipAddress` — for geolocation/spam detection
- [ ] `leads.referrerUrl` — where the visitor came from
- [ ] `page_views.utmSource` — track UTM per visit
- [ ] Landing page A/B test flag: `ab_variant` column

### API
- [x] `GET /api/public/[slug]` — serve public landing page data
- [ ] `POST /api/landing/submit` — public form submission → creates lead + parses UTMs + applies rate limit
- [ ] `GET /api/landing/pages` — Admin: list all landing pages (internal)
- [ ] `POST /api/landing/pages` — Admin: create new landing page
- [ ] `PUT /api/landing/pages/[id]` — Admin: update page content + toggle publish
- [ ] `GET /api/landing/pages/[id]/analytics` — view count, submission count, conversion rate
- [ ] IP-based rate limiting: 5 submissions/min per IP (via `checkRateLimit`)
- [ ] Cloudflare Turnstile or reCAPTCHA v3 bot protection on submit
- [ ] UTM parameter extraction from request headers/query string → stored on lead

### Frontend — Public Pages
- [x] `app/(dashboard)/marketing/landing-pages/page.tsx` — landing page manager exists
- [ ] `app/(public)/[slug]/page.tsx` — public-facing landing page (unauthenticated route)
- [ ] ISR (Incremental Static Regeneration) with `revalidate: 60` for public pages
- [ ] Hero section: brand colors, headline, subheadline, CTA button
- [ ] Contact form: Name, Phone, Email, Message — validate client + server side
- [ ] UTM-aware: `useSearchParams` to silently capture utm_source/campaign
- [ ] Bot protection: Turnstile widget in form footer
- [ ] Thank-you page / success state after submission
- [ ] Trust badges / testimonials section (configurable per page)
- [ ] Mobile-optimized: works at 375px width

### Frontend — Admin CMS
- [ ] Landing page builder at `/marketing/landing-pages/new` — WYSIWYG or structured form editor
- [ ] Live preview pane: see how the page looks as you edit
- [ ] Publish/Unpublish toggle with URL display
- [ ] Analytics panel per page: visits, form submissions, conversion %
- [ ] UTM source breakdown chart: where are leads coming from

### New Features (Extended)
- [ ] **Multi-step form** — guide visitors through 3-step form for higher completion
- [ ] **Lead magnet download** — visitor submits form → receives PDF/ebook download
- [ ] **Chatbot widget** — embedded chat widget on landing pages for instant engagement
- [ ] **Social sharing meta tags** — OG tags populated from page content for Link Preview
- [ ] **Countdown timer** — urgency widget (e.g., "Offer ends in 2 days")
- [ ] **Exit intent popup** — show offer when cursor moves to close tab
- [ ] **Google Analytics integration** — send `page_view` and `form_submit` events to GA4
- [ ] **Heat map integration** — Clarity or Hotjar snippet injected via org settings

### Verification
- [ ] Form submission rate-limited (6th submission per IP returns 429)
- [ ] UTM parameters saved on created lead record
- [ ] Public page loads in < 1s (Lighthouse score > 90)
- [ ] Bot spam blocked by Turnstile
- [ ] `pnpm build` passes

---

## Implementation Plan

### Phase 1 — Public Form Endpoint (3 days)
1. Add UTM columns to `leads` table migration
2. `POST /api/landing/submit`: parse UTM from query params → insert lead → rate limit by IP
3. Turnstile server-side verification: `POST https://challenges.cloudflare.com/turnstile/v0/siteverify`
4. Auto-assign lead via existing assignment rules

### Phase 2 — Public Page Route (2 days)
1. `app/(public)/[slug]/page.tsx` — fetch page from DB; ISR revalidate 60s
2. Form component with Turnstile widget + UTM hidden fields
3. Success state: confetti + "Thank you" message; trigger internal chat notification to sales team

### Phase 3 — Admin CMS (3 days)
1. Landing page builder form: structured sections (hero, features, CTA, form)
2. Live preview iframe using `data:text/html` or Next.js preview mode
3. Analytics endpoint: count `page_views + web_lead_forms` grouped by date

### Phase 4 — Advanced (2 days)
1. OG meta tags: `<meta property="og:title">` etc. from page content
2. Multi-step form: Zod schema per step; progress bar; state persisted in sessionStorage
