import type { Session } from 'electron';

/** Denies all website permission checks until the browser has a user-facing permission manager. */
export function denyWebsitePermissionsByDefault(session: Session): void {
  session.setPermissionRequestHandler((_webContents, _permission, callback) => {
    callback(false);
  });
  session.setPermissionCheckHandler(() => false);
  session.setDevicePermissionHandler(() => false);
}
