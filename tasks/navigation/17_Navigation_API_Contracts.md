# 17_Navigation_API_Contracts

Endpoints:
GET /navigation
GET /navigation/menu
GET /navigation/favorites
PATCH /navigation/favorites
GET /navigation/recent
GET /navigation/search

Responses must already be filtered by:
- Authentication
- Organization
- RBAC
- Subscription
- Feature Flags

Acceptance:
Stable, versioned APIs.
