import type { App, BrowserWindow } from 'electron';
import { captureWarningStore, warningWindowTitle, type CaptureWarningStore } from '../../services/permissions/captureWarning';

/** Keeps a warning in native window titles, including site-created popups. */
export function registerCaptureWarningTitles(application: Pick<App, 'on'>, warnings: CaptureWarningStore = captureWarningStore): void {
  application.on('browser-window-created', (_event, window: BrowserWindow) => {
    const update = () => {
      const state = warnings.snapshot();
      if (!window.isDestroyed() && (state.camera || state.microphone)) {
        window.setTitle(warningWindowTitle(state));
      }
    };
    const unsubscribe = warnings.subscribe(update);
    window.on('page-title-updated', (event) => {
      const state = warnings.snapshot();
      if (state.camera || state.microphone) {
        event.preventDefault();
        update();
      }
    });
    window.once('closed', unsubscribe);
    update();
  });
}
