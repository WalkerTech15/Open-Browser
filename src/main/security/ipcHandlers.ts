import { ipcMain } from 'electron';
import { IpcChannel } from '../../shared/constants/ipcChannels';
import { getBrowserWindowController } from '../../core/browser/BrowserWindowController';

/**
 * Registers the only IPC entry points a renderer can reach. This is the
 * trust boundary between the (sandboxed, no-Node) renderer processes and the
 * privileged main process — see docs/SECURITY.md before changing it.
 *
 * Two rules enforced here:
 *  1. Every handler resolves the acting window from Electron's own
 *     `event.sender`, never from a renderer-supplied id — a window can only
 *     ever affect itself.
 *  2. Payloads are validated before use (`typeof input !== 'string'` is
 *     rejected outright). The actual navigation target is still validated
 *     again downstream in core/navigation/navigation.ts before anything
 *     loads — this handler only guards the shape of the IPC message.
 */
export function registerNavigationIpcHandlers(): void {
  ipcMain.on(IpcChannel.Navigate, (event, input: unknown) => {
    if (typeof input !== 'string') return;
    getBrowserWindowController(event.sender.id)?.handleNavigate(input);
  });

  ipcMain.on(IpcChannel.Back, (event) => {
    getBrowserWindowController(event.sender.id)?.goBack();
  });

  ipcMain.on(IpcChannel.Forward, (event) => {
    getBrowserWindowController(event.sender.id)?.goForward();
  });

  ipcMain.on(IpcChannel.Reload, (event) => {
    getBrowserWindowController(event.sender.id)?.reload();
  });

  ipcMain.on(IpcChannel.Stop, (event) => {
    getBrowserWindowController(event.sender.id)?.stop();
  });

  ipcMain.on(IpcChannel.NewTab, (event) => {
    getBrowserWindowController(event.sender.id)?.createTab();
  });

  ipcMain.on(IpcChannel.ActivateTab, (event, tabId: unknown) => {
    if (!isTabId(tabId)) return;
    getBrowserWindowController(event.sender.id)?.activateTab(tabId);
  });

  ipcMain.on(IpcChannel.CloseTab, (event, tabId: unknown) => {
    if (!isTabId(tabId)) return;
    getBrowserWindowController(event.sender.id)?.closeTab(tabId);
  });

  ipcMain.on(IpcChannel.HistoryOpen, (event) => {
    getBrowserWindowController(event.sender.id)?.showHistoryMenu();
  });

  ipcMain.on(IpcChannel.ProfilesOpen, (event) => {
    getBrowserWindowController(event.sender.id)?.showProfilesMenu();
  });

  ipcMain.on(IpcChannel.WorkspacesOpen, (event) => {
    void getBrowserWindowController(event.sender.id)?.showWorkspacesMenu();
  });
}

function isTabId(value: unknown): value is string {
  return typeof value === 'string' && /^tab-\d{1,8}$/.test(value);
}
