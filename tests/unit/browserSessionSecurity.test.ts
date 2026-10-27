import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tmpdir } from 'node:os';
import { basename, dirname, join } from 'node:path';
import type { DownloadItem, Session } from 'electron';
import { configureDownloadSaveDialogs, downloadSaveDialogOptions } from '../../src/services/downloads/saveDialog';

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
