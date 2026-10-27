import { ipcMain } from 'electron';
import type { IpcMainEvent } from 'electron';
import { IpcChannel } from '../../shared/constants/ipcChannels';
import { getBrowserWindowController } from '../../core/browser/BrowserWindowController';
import { getToolbarEntryUrl } from '../windows/toolbarLocation';
import { isTrustedToolbarSender } from './trustedToolbarSender';

/**
 * Registers the only IPC entry points a renderer can reach. This is the
 * trust boundary between the (sandboxed, no-Node) renderer processes and the
 * privileged main process — see docs/SECURITY.md before changing it.
 *
 * Three rules enforced here:
 *  1. Every handler resolves the acting window from Electron's own
 *     `event.sender`, never from a renderer-supplied id — a window can only
 *     ever affect itself.
 *  2. Only the main frame at the exact toolbar file URL is trusted. A
 *     subframe or another document in the same window cannot act as toolbar.
 *  3. Payloads are validated before use (`typeof input !== 'string'` is
 *     rejected outright). The actual navigation target is still validated
 *     again downstream in core/navigation/navigation.ts before anything
 *     loads — this handler only guards the shape of the IPC message.
 */
export function registerNavigationIpcHandlers(): void {
  const toolbarUrl = getToolbarEntryUrl();
  const controllerForEvent = (event: IpcMainEvent) => {
    if (!isTrustedToolbarSender(event, toolbarUrl)) return undefined;
    return getBrowserWindowController(event.sender.id);
  };

  ipcMain.on(IpcChannel.Navigate, (event, input: unknown) => {
    if (typeof input !== 'string') return;
    controllerForEvent(event)?.handleNavigate(input);
  });

  ipcMain.on(IpcChannel.Back, (event) => {
    controllerForEvent(event)?.goBack();
  });

  ipcMain.on(IpcChannel.Forward, (event) => {
    controllerForEvent(event)?.goForward();
  });

  ipcMain.on(IpcChannel.Reload, (event) => {
    controllerForEvent(event)?.reload();
  });

  ipcMain.on(IpcChannel.Stop, (event) => {
    controllerForEvent(event)?.stop();
  });

  ipcMain.on(IpcChannel.NewTab, (event) => {
    controllerForEvent(event)?.createTab();
  });

  ipcMain.on(IpcChannel.ActivateTab, (event, tabId: unknown) => {
    if (!isTabId(tabId)) return;
    controllerForEvent(event)?.activateTab(tabId);
  });

  ipcMain.on(IpcChannel.CloseTab, (event, tabId: unknown) => {
    if (!isTabId(tabId)) return;
    controllerForEvent(event)?.closeTab(tabId);
  });

  ipcMain.on(IpcChannel.HistoryOpen, (event) => {
    controllerForEvent(event)?.showHistoryMenu();
  });

  ipcMain.on(IpcChannel.ProfilesOpen, (event) => {
    controllerForEvent(event)?.showProfilesMenu();
  });

  ipcMain.on(IpcChannel.WorkspacesOpen, (event) => {
    void controllerForEvent(event)?.showWorkspacesMenu();
  });
}

function isTabId(value: unknown): value is string {
  return typeof value === 'string' && /^tab-\d{1,8}$/.test(value);
}
