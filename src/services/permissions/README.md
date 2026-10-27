# Permissions service

`denyByDefault.ts` denies website permission checks, permission requests, and
device permissions for each Chromium session. This is a restrictive prototype
default; there is no user permission prompt or allowlist yet.

The checks and request handler are both installed because Electron requires
both for complete permission handling. User-configurable permission controls
remain future work; see `docs/SECURITY.md` and `docs/ROADMAP.md`.
