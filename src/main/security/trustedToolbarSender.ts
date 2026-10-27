import type { IpcMainEvent } from 'electron';

/** Only the loaded toolbar's top-level frame can request privileged actions. */
export function isTrustedToolbarSender(event: Pick<IpcMainEvent, 'sender' | 'senderFrame'>, toolbarUrl: string): boolean {
  if (event.sender.isDestroyed()) return false;
  const frame = event.senderFrame;
  return frame !== null
    && frame === event.sender.mainFrame
    && frame.url === toolbarUrl;
}
