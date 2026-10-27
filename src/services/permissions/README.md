# Permissions service

`permissionPolicy.ts` handles requests for camera, microphone, location, and
notifications from an eligible active top-level page. A native prompt displays
the origin and offers Block or Allow once; Block is the default. HTTPS and
loopback HTTP origins are eligible. All other permission and device requests
remain denied. See `docs/decisions/ADR-005-temporary-permissions.md`.

Media and location approval apply to the current request. A permitted media
stream or location watch can continue until the page stops it or the tab
closes. Notifications may be sent while the approved page stays active; the
grant is revoked on navigation, tab switch, or close. Grants are not persisted.
Permission checks and requests are both handled; persistent site settings and
active capture indicators are future work.
