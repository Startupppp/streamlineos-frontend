# StreamlineOS Product Bible

# Platform Navigation, Sidebar & Settings
## PRD 01 — Information Architecture, UI & UX

### Purpose
Design a scalable, responsive, permission-aware navigation system for StreamlineOS.

## Global Header
- Workspace Switcher
- Global Search
- AI Assistant
- Calendar
- Chat
- Notifications
- Create (+)
- User Avatar

## Product Switcher
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

Show only products enabled by Subscription + RBAC.

## Administration Sidebar

### Organization
- Overview
- Structure
- Business Units
- Departments
- Teams
- Branches
- Locations
- Cost Centers
- Organization Chart
- Branding

### People
- Users
- Invitations
- Suspended Users
- Archived Users
- Import / Export

### Access Control
- Roles
- Permission Matrix
- Role Assignment
- Access Policies

### Subscription
- Current Plan
- Usage
- Seats
- AI Credits
- Billing
- Invoices
- Payment Methods

### Platform
- Modules
- Custom Fields
- Automation
- Notification Templates
- Integrations
- Webhooks
- API Keys
- AI Configuration
- Data Hub

### Security
- Password Policy
- MFA Policy
- SSO
- SCIM
- Domain Verification
- Session Policy
- IP Allow List
- Audit Logs

### Developer
- Events
- Webhooks
- API Tokens
- Logs
- Sandbox

## Personal Settings (All Users)
Accessible from avatar only:
- My Profile
- My Account
- Security
- Password
- MFA
- Sessions & Devices
- Connected Accounts
- Notification Preferences
- Appearance
- Language
- Time Zone
- Accessibility
- API Keys (if permitted)

## Remove
- Billing as standalone product
- Sales as standalone product
- Customer Success as standalone product
- Knowledge Base as standalone product
- Duplicate Branches page
- Duplicate Audit pages
- Reports inside Settings

## Role Experience
Employee: Assigned products + personal settings.
Manager: Team + approvals.
Department Head: Department management.
HR: HRMS & Recruitment.
Sales: CRM.
Finance: Finance.
IT: Administration & Security.
Org Admin: Full administration.
Super Admin: Entire platform.

## Mobile
Bottom Navigation:
- Home
- Search
- Create
- Notifications
- Me

Hamburger opens current product only.

## Acceptance Criteria
- Context-aware sidebar
- RBAC aware
- Subscription aware
- Mobile responsive
- WCAG AA
- No duplicate navigation
- Enterprise ready
