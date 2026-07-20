# Product

## Register

product

## Platform

web

## Users

Every employee of a tenant organization is the primary user — they live in StreamlineOS for hours a day across chat, projects, HR self-service, support, calendar, and knowledge. Org owners and ops/admin leads (HR, finance, operations) are the secondary audience: they configure the workspace, run approvals, billing, roles, and reporting. Both audiences are in a task when they arrive; the interface must disappear into the work.

## Product Purpose

StreamlineOS is a multi-tenant business operating system: HR/people, projects, CRM, support, accounting, inventory, payroll, timesheets, chat, knowledge base, calendar, and contextual AI in one workspace. It exists so an organization can run its entire day-to-day operation in one place instead of stitching together a stack of point tools. Success looks like a tenant org onboarding, enabling the modules it needs, and never leaving — with enterprise-grade security (tenant isolation, server-resolved RBAC) underneath every screen.

## Positioning

Run the entire company — HR, projects, CRM, support, accounting, inventory, chat, knowledge — in one workspace instead of ten subscriptions.

## Brand Personality

Calm, dense, trustworthy. Ink-first in the Linear/Stripe lane: neutral slate chrome, one accent carried by the active theme, color reserved for meaning. Every page should feel like a $10k+ SaaS product — polished, compact, purposeful — never like an admin template. The multi-theme system (light/dark/system × 18 accent palettes) is part of the identity: the default Ink theme is pure monochrome, and richness is opt-in per user, not imposed.

## Anti-references

- The retired violet/indigo gradient SaaS look — brand gradients belong on landing/marketing surfaces only, never inside the authenticated shell.
- Rainbow dashboards: decorative color on chrome, multi-hue accents, full-saturation tints on inactive states.
- Airy marketing layouts inside the shell — oversized padding, glassy blurred cards, heavy shadows, page-level gradients.
- Generic admin-template output: default buttons, flat identical card grids, spinners instead of skeletons.
- Exception by design: the HR module keeps its rich hero/tone surface — do not flatten it to ink in conformance passes.

## Design Principles

1. **Density with restraint.** Power users need 50 rows at once; compact rows and tight cells that still breathe through deliberate section separation, never random gaps.
2. **One accent, semantic color only.** Theme tokens (`bg-primary`, tints, `--ring`) carry every interactive accent; emerald/amber/red/blue are reserved for status meaning.
3. **Same skeleton everywhere.** Every screen shares the PageWrapper anatomy — compact header, flat filter toolbar, content body — so 30+ modules feel like one product.
4. **Motion communicates state.** 150–250 ms on composited properties, telling the user where something came from and that the system responded; never decoration, never choreography.
5. **Every state is designed.** Loading skeletons that match the real layout, empty states that teach with one action, friendly errors with retry, and layouts that hold at sparse and dense extremes.

## Accessibility & Inclusion

ARIA semantics and full keyboard navigation on interactive surfaces. Responsive verification at 375 / 768 / 1280 px. `prefers-reduced-motion` honored on every animation. Hover and tinted states keep readable contrast, and every light-tint color pairing carries a dark-mode variant; all 36 theme combinations (light/dark × 18 accents) must preserve contrast.
