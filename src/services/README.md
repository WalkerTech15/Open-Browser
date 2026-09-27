# Services

Cross-cutting app services that sit alongside browsing itself — not engine
logic, not UI. None of these are implemented yet; each subfolder explains
its planned scope. See `docs/ROADMAP.md`.

- `permissions/` — mediating site permission requests (camera, microphone,
  geolocation, notifications).
- `downloads/` — managing file downloads.
- `settings/` — user preferences/configuration.
