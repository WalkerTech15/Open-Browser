import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveAddressInput, isNavigableUrl, buildSearchUrl } from './navigation';

test('resolveAddressInput: empty input is a no-op', () => {
  assert.equal(resolveAddressInput(''), null);
  assert.equal(resolveAddressInput('   '), null);
});

test('resolveAddressInput: passes through valid http/https URLs', () => {
  assert.equal(resolveAddressInput('https://example.com'), 'https://example.com');
  assert.equal(resolveAddressInput('http://example.com/path?q=1'), 'http://example.com/path?q=1');
  assert.equal(resolveAddressInput('  https://example.com  '), 'https://example.com');
});

test('resolveAddressInput: upgrades bare domains to https', () => {
  assert.equal(resolveAddressInput('example.com'), 'https://example.com');
  assert.equal(resolveAddressInput('sub.example.com/page'), 'https://sub.example.com/page');
  assert.equal(resolveAddressInput('localhost:3000'), 'https://localhost:3000');
});

test('resolveAddressInput: falls back to search for plain text', () => {
  assert.equal(resolveAddressInput('best pizza near me'), buildSearchUrl('best pizza near me'));
  assert.equal(resolveAddressInput('single-word'), buildSearchUrl('single-word'));
});

test('resolveAddressInput: falls back to search for unsafe/non-http protocols', () => {
  assert.equal(resolveAddressInput('javascript:alert(1)'), buildSearchUrl('javascript:alert(1)'));
  assert.equal(resolveAddressInput('file:///etc/passwd'), buildSearchUrl('file:///etc/passwd'));
});

test('isNavigableUrl: only accepts http/https', () => {
  assert.equal(isNavigableUrl('https://example.com'), true);
  assert.equal(isNavigableUrl('http://example.com'), true);
  assert.equal(isNavigableUrl('ftp://example.com'), false);
  assert.equal(isNavigableUrl('javascript:alert(1)'), false);
  assert.equal(isNavigableUrl('not a url'), false);
});
