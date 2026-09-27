# Sessions (reserved, not implemented)

This folder is reserved for browsing-session/profile persistence — history,
cookies/storage partitioning across profiles, "who is browsing" state. Not
implemented in the current single-window prototype, which uses Electron's
default session with no persistence layer of its own.

See `docs/ROADMAP.md` for planned profile/workspace work, and
`docs/SECURITY.md` for how the current (default, unpartitioned) session is
handled today.
