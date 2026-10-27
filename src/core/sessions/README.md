# Sessions

`SessionStore` persists open HTTP(S) tab URLs and browsing history in a
versioned JSON file in Electron's `userData` directory. Each profile has its
own store. The initial Personal profile keeps the original `browser-data.json`
path so existing history and saved tabs remain available. At startup, the
selected page loads first; inactive restored tabs create no native view until
selected. History
has no time-based expiry. The toolbar's Clear history action removes both
history and saved restore tabs, but leaves currently open pages alone.

The Personal profile preserves Electron's original default Chromium session.
New profiles use their own persistent Chromium partition and session file.
See
[`ADR-002`](../../../docs/decisions/ADR-002-local-session-persistence.md)
and [`ADR-003`](../../../docs/decisions/ADR-003-profile-isolation.md) plus
`docs/SECURITY.md` for data-handling details.
