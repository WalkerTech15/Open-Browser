/**
 * Channel names for the only IPC surface exposed to the renderer. See
 * src/main/security/preload.ts (exposes these) and
 * src/main/security/ipcHandlers.ts (handles these) — this is the full list,
 * there is no wildcard or generic passthrough channel.
 */
export const IpcChannel = {
  Navigate: 'nav:navigate',
  Back: 'nav:back',
  Forward: 'nav:forward',
  Reload: 'nav:reload',
  Stop: 'nav:stop',
  State: 'nav:state'
} as const;
