import { join, win32 } from 'node:path';
import type { DownloadItem, SaveDialogOptions, Session } from 'electron';

/** Suggests a filename inside the user's Downloads folder without trusting path components from a site. */
export function downloadSaveDialogOptions(downloadsDirectory: string, suggestedFilename: string): SaveDialogOptions {
  // win32.basename handles both slash styles on every host. Treat Windows
  // filename restrictions consistently on every supported host.
  let filename = win32.basename(suggestedFilename)
    .replace(/[<>:"/\\|?*\u0000-\u001f\u007f]/g, '_')
    .replace(/[. ]+$/g, '');
  if (!filename) filename = 'download';
  if (/^(con|prn|aux|nul|com[1-9¹²³]|lpt[1-9¹²³])(\.|$)/i.test(filename)) {
    filename = `_${filename}`;
  }
  return {
    title: 'Save download',
    defaultPath: join(downloadsDirectory, filename)
  };
}

/** Keeps Electron's native save prompt and gives it a safe, useful initial filename. */
export function configureDownloadSaveDialogs(session: Session, downloadsDirectory: string): void {
  session.on('will-download', (_event, item: DownloadItem) => {
    item.setSaveDialogOptions(downloadSaveDialogOptions(downloadsDirectory, item.getFilename()));
  });
}
