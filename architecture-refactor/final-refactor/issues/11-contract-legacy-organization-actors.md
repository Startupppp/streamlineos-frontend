# 11: Contract legacy organization-actor references

**What to build:** After all domains use OrganizationActor, obsolete global-user organizational references and compatibility paths are safely removed.

**Blocked by:** 07, 08, 09 and 10.

**Status:** ready-for-agent

- [ ] Telemetry and repository scans prove no legacy writer or required reader remains.
- [ ] Contract migrations remove obsolete columns/constraints without losing audit history.
- [ ] Cold bootstrap, upgrade migration and representative domain tests pass.
- [ ] Compatibility code and dead types are removed with module-graph proof.
