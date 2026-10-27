import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tmpdir } from 'node:os';
import { basename, dirname, join } from 'node:path';
import type { DownloadItem, Session, WebContents } from 'electron';
import { denyWebsitePermissionsByDefault } from '../../src/services/permissions/denyByDefault';
import { configureDownloadSaveDialogs, downloadSaveDialogOptions } from '../../src/services/downloads/saveDialog';

test('website permission requests and checks are denied by default', () => {
  const handlers: {
    request?: Parameters<Session['setPermissionRequestHandler']>[0];
    check?: Parameters<Session['setPermissionCheckHandler']>[0];
    device?: Parameters<Session['setDevicePermissionHandler']>[0];
  } = {};
  const session = {
    setPermissionRequestHandler: (handler: Parameters<Session['setPermissionRequestHandler']>[0]) => { handlers.request = handler; },
    setPermissionCheckHandler: (handler: Parameters<Session['setPermissionCheckHandler']>[0]) => { handlers.check = handler; },
    setDevicePermissionHandler: (handler: Parameters<Session['setDevicePermissionHandler']>[0]) => { handlers.device = handler; }
  } as unknown as Session;

  denyWebsitePermissionsByDefault(session);

  let granted: boolean | undefined;
  handlers.request?.(
    {} as WebContents,
    'media',
    (allowed) => { granted = allowed; },
    {} as Parameters<NonNullable<typeof handlers.request>>[3]
  );
  assert.equal(granted, false);
  assert.equal(
    handlers.check?.(
      {} as WebContents,
      'notifications',
      'https://example.com',
      {} as Parameters<NonNullable<typeof handlers.check>>[3]
    ),
    false
  );
  assert.equal(handlers.device?.({ deviceType: 'usb', origin: 'https://example.com', device: {} } as Parameters<NonNullable<typeof handlers.device>>[0]), false);
});

test('download suggestions stay directly inside Downloads for unsafe and cross-platform filenames', () => {
  const downloadsDirectory = join(tmpdir(), 'open-browser-download-policy-test');
  const cases = [
    ['report.pdf', 'report.pdf'],
    ['..\\..\\private\\report.pdf', 'report.pdf'],
    ['../../private/report.pdf', 'report.pdf'],
    ['C:\\private\\report.pdf', 'report.pdf'],
    ['\\\\server\\share\\report.pdf', 'report.pdf'],
    ['..', 'download'],
    ['.', 'download'],
    ['', 'download'],
    ['report.pdf. ', 'report.pdf'],
    ['CON.txt', '_CON.txt'],
    ['nul', '_nul'],
    ['report.txt:stream', 'report.txt_stream'],
    ['bad\u0000name.txt', 'bad_name.txt'],
  ];
  for (const [input, expected] of cases) {
    const options = downloadSaveDialogOptions(downloadsDirectory, input);
    assert.equal(dirname(options.defaultPath!), downloadsDirectory, `Directory escaped for ${JSON.stringify(input)}`);
    assert.equal(basename(options.defaultPath!), expected);
    assert.equal(options.title, 'Save download');
  }
});

test('download session configures the native dialog and retains the user choice', () => {
  const captured: { listener?: (event: Electron.Event, item: DownloadItem) => void } = {};
  const session = {
    on: (eventName: 'will-download', handler: (event: Electron.Event, item: DownloadItem) => void) => {
      assert.equal(eventName, 'will-download');
      captured.listener = handler;
    }
  } as unknown as Session;
  let options: ReturnType<typeof downloadSaveDialogOptions> | undefined;
  const item = {
    getFilename: () => 'report.pdf',
    setSaveDialogOptions: (value: ReturnType<typeof downloadSaveDialogOptions>) => { options = value; },
    setSavePath: () => { assert.fail('The policy must let the user choose the final save path'); }
  } as unknown as DownloadItem;

  const downloadsDirectory = join(tmpdir(), 'open-browser-download-policy-test');
  configureDownloadSaveDialogs(session, downloadsDirectory);
  captured.listener?.({} as Electron.Event, item);

  assert.equal(options?.defaultPath, join(downloadsDirectory, 'report.pdf'));
});
