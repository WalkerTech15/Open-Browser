# ADR-005 — Temporary website permission prompts

## Status
Accepted for the current prototype after the user requested the recommended
Allow once / Block permission milestone. This does not decide V1 membership.

## Decision
- The main process prompts for camera, microphone, location, and notifications
  requested by the active top-level page. The dialog identifies the requesting
  origin, defaults to Block, and offers Allow once.
- HTTPS and loopback HTTP origins are eligible. Child frames, background tabs,
  unfocused windows, opaque or mismatched origins, unsupported permissions,
  and device permissions are denied.
- Each Chromium session has its own policy; tracked tabs are scoped to that
  session. There are no saved grants or changes to profile storage formats.
- Camera, microphone, and location approval applies to the current request.
  The page may keep an active stream/watch until it stops or its tab closes,
  even after a tab switch. A capture indicator is not yet implemented.
- Notification checks are allowed only for the approved active tab and origin;
  navigation, switching tabs, and closing revoke that in-memory grant.
- A pending request fails closed if the tab navigates, becomes inactive, closes,
  or the prompt fails. Only one permission dialog per window may be pending.

## Security and privacy
The prompt lives in the trusted main process and shows a normalized origin.
Websites cannot supply a renderer-based prompt or select a saved grant.
Approving a browser request does not override operating-system permissions.
Persistent per-site settings, revocation UI, and capture indicators remain
future work and need their own design. No telemetry or sync is introduced.
