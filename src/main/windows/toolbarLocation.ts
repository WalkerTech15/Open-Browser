import { app } from 'electron';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

/** One location for loading the toolbar and validating messages from it. */
export function getToolbarEntryPath(): string {
  return join(app.getAppPath(), 'src/renderer/layout/index.html');
}

export function getToolbarEntryUrl(): string {
  return pathToFileURL(getToolbarEntryPath()).href;
}
