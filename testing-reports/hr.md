# HR — still pending

Code-complete items were removed. A browser check is not treated as remaining work.

## HRMS-008 — needs a product decision

Permission enforcement is in code: `assertModuleAccessPolicy` requires `hr:access:view`, and the HR member role was narrowed in `seed-system-roles.ts` (commit `258079a9b`).

Still not built: a per-resource capabilities hint, for example `capabilities: { canEdit }` on the employee detail response. That needs a decision on shape and scope before anyone implements it.
