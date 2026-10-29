# ADR-006 — Conservative camera and microphone reminders

## Status
Accepted for the current prototype after the user chose a tab reminder and a
browser-wide warning for the session. This does not decide V1 membership.

## Context
Electron's exposed `isBeingCaptured()` measures whether a page is being
captured, not whether it is using a camera or microphone. A Windows Electron
test with a fake microphone found it stayed false while the device track was
live. The test also copied the track to a popup; one sample showed the copy live just
after the originating page was destroyed, before the popup closed. A separate
test observed the copy ended after the tab closed. Treating either signal as live capture status
would be misleading.

## Decision
- When the user approves camera or microphone access, record a conservative
  reminder for that tab and in the main process for the browser session before
  allowing the request. If the warning cannot be recorded, deny the request.
- Tab badges remain until their tab closes, including across navigation. A
  browser-wide reminder persists across tabs and profile changes until the
  application process exits, and is also placed in native window titles,
  including popup windows. No origin, page content, or history is stored in the
  session reminder; it is never written to disk.
- The UI says the devices **may** be in use. It does not claim to detect live
  capture. The warning can remain after a stream stops or access fails. Native
  window titles may not be visible in fullscreen; there is no exact live capture
  indicator yet. To be safe, close all Open Browser windows when finished.

## Security and privacy
No untrusted page scripts are injected and no additional renderer privileges are
introduced. Popups keep their normal behavior; when a reminder is active their
native window titles show the reminder instead of website-controlled titles.
Accurate device capture and stop detection require a separate investigation.
