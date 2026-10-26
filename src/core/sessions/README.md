# Sessions

`SessionStore` persists open HTTP(S) tab URLs and browsing history in a
versioned JSON file in Electron's `userData` directory. At startup, the
selected page loads first; inactive restored tabs create no native view until
selected. History
has no time-based expiry. The toolbar's Clear history action removes both
history and saved restore tabs, but leaves currently open pages alone.

This is not profile isolation: Chromium continues to use Electron's default
session and its normal cookies/site storage. Profiles and per-profile storage
partitioning remain future work. See
[`ADR-002`](../../../docs/decisions/ADR-002-local-session-persistence.md)
and `docs/SECURITY.md` for data-handling details.
