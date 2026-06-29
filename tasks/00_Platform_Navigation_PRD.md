# StreamlineOS Product Bible

# Platform Navigation & Information Architecture

# 00_Platform_Navigation_PRD.md

## Purpose
Define the global navigation architecture for StreamlineOS across Desktop, Tablet and Mobile.

## Goals
- Workspace-first navigation
- Product switcher
- Context-aware sidebar
- Mobile-first
- Permission-aware
- Subscription-aware
- Enterprise scalable

## Global Layout
Top Header: Workspace | Global Search | AI | Calendar | Chat | Notifications | Profile

Below Header: Product Switcher
- Home
- CRM
- HRMS
- Projects
- Inventory
- Finance
- Helpdesk
- Documents
- Analytics
- AI
- Administration

Sidebar only displays the currently selected product.

## Merge Existing Sections
- Billing -> Administration/Subscription
- Sales -> CRM
- Customer Success -> CRM
- Knowledge Base -> Helpdesk
- People + Organization -> Administration

## Administration
- Organization
- Users
- Roles & Permissions
- Subscription
- Integrations
- Security
- Audit
- System Settings

## Desktop
- Collapsible sidebar
- Favorites
- Recent pages
- Breadcrumbs
- Keyboard shortcuts

## Mobile
Bottom navigation:
- Home
- Search
- Create
- Notifications
- Me

Hamburger opens current product navigation only.

## Rules
- Context-aware navigation
- RBAC aware
- Subscription aware
- Multi-tenant aware
- Lazy loaded
- Accessible (WCAG AA)

## Acceptance Criteria
- <10 top-level products
- Responsive
- Scalable to 100+ modules
- No duplicate navigation
- Production ready
