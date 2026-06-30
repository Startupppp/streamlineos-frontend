# 16_Navigation_State_Management

## Purpose
Centralize all navigation state.

State includes:
- Active workspace
- Active product
- Active page
- Sidebar expanded/collapsed
- Favorites
- Recent items
- Search history

Rules:
- Persist per user
- Sync across tabs
- Restore on login
- Reset on workspace switch

Acceptance:
Predictable, cached, RBAC-safe navigation state.
