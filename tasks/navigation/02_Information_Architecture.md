# StreamlineOS Product Bible

# Platform Navigation & Workspace Shell

# 02_Information_Architecture.md

## Purpose
Define the Information Architecture (IA) for StreamlineOS so navigation remains clean, scalable and consistent across Desktop, Tablet and Mobile.

## Core Principles
- Workspace First
- Product Second
- Feature Third
- Page Fourth
- Action Last
- RBAC Aware
- Subscription Aware
- Mobile First

## Product Hierarchy
Workspace
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

Only entitled products are visible.

## Administration
Organization
- Overview
- Structure
- Business Units
- Departments
- Teams
- Branches
- Locations
- Cost Centers
- Branding

People
- Users
- Invitations
- Suspended
- Archived
- Import / Export

Access Control
- Roles
- Permission Matrix
- Access Policies

Subscription
- Plan
- Usage
- Seats
- AI Credits
- Billing
- Invoices
- Payment Methods

Platform
- Modules
- Integrations
- Automation
- Notification Templates
- Custom Fields
- AI
- Data Hub

Security
- Password Policy
- MFA
- SSO
- SCIM
- Session Policy
- Domain Verification
- Audit Logs

Developer
- API Keys
- Webhooks
- Events
- Logs
- Sandbox

## Personal Space
- My Profile
- My Account
- My Tasks
- My Notifications
- Security
- Sessions & Devices
- Connected Apps
- Appearance
- Language
- Preferences

## Rules
- One page belongs to one product only.
- No duplicate navigation.
- Personal settings never appear in Administration.
- Platform settings belong only to Administration.
- Business settings stay inside their respective product.

## Search
Global search returns pages, records, users, documents and commands filtered by RBAC.

## Favorites
Users can pin pages, reports, dashboards and records.

## Mobile
Bottom navigation:
Home
Search
Create
Notifications
Me

Hamburger opens current product navigation only.

## Acceptance Criteria
- <=3 clicks to any page
- Context-aware sidebar
- RBAC aware
- Subscription aware
- Responsive
- Accessible
- Enterprise ready
