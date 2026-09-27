# Permissions service (reserved, not implemented)

Planned home for mediating renderer permission requests (camera, microphone,
geolocation, notifications, etc.) via Electron's
`session.setPermissionRequestHandler`.

**Current state:** no custom handler is installed anywhere in this app, so
Electron's built-in default behavior applies. This is a gap, not a feature —
see `docs/SECURITY.md` for how this is labeled there, and `docs/ROADMAP.md`
for when this is planned.
