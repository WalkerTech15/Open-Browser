import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const toolbarHtml = readFileSync(resolve(process.cwd(), 'src/renderer/layout/index.html'), 'utf8');

test('toolbar HTML has a restrictive Content Security Policy', () => {
  const policyMeta = toolbarHtml.match(/<meta\b[^>]*http-equiv="Content-Security-Policy"[^>]*>/gi) ?? [];
  assert.equal(policyMeta.length, 1, 'The toolbar must declare one CSP meta tag');
  const policy = policyMeta[0].match(/\bcontent="([^"]+)"/i)?.[1];
  assert.ok(policy, 'The CSP must be in the meta tag content attribute');
  const directives = new Map<string, string>();
  for (const part of policy.split(';').map((part) => part.trim()).filter(Boolean)) {
    const [name, ...values] = part.split(/\s+/);
    assert.ok(!directives.has(name), `Duplicate CSP directive ${name}`);
    directives.set(name, values.join(' '));
  }

  for (const directive of [
    "default-src 'none'",
    "script-src 'self'",
    "style-src 'self'",
    "connect-src 'none'",
    "object-src 'none'",
    "base-uri 'none'",
    "form-action 'none'",
    "frame-src 'none'",
  ]) {
    const [name, value] = directive.split(' ');
    assert.equal(directives.get(name), value, `CSP must enforce ${directive}`);
  }
  const firstResource = toolbarHtml.search(/<(?:script|link)\b/i);
  assert.ok(firstResource > toolbarHtml.indexOf(policyMeta[0]), 'CSP must precede toolbar resources');
});
