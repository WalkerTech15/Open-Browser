/**
 * Pure address-bar resolution logic, kept independent of Electron so it can
 * run under a plain test runner.
 */

const SEARCH_URL_PREFIX = 'https://duckduckgo.com/?q=';

/** Matches host.tld[:port][/path] with no whitespace, e.g. "example.com" or "localhost:3000". */
const DOMAIN_LIKE = /^([a-z0-9-]+\.)+[a-z]{2,}(:\d+)?(\/.*)?$/i;
const LOCALHOST_LIKE = /^localhost(:\d+)?(\/.*)?$/i;

export function isNavigableUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

export function buildSearchUrl(query: string): string {
  return `${SEARCH_URL_PREFIX}${encodeURIComponent(query)}`;
}

/**
 * Resolves free-form address-bar input into a URL to navigate to.
 * Returns null for empty input (no-op), otherwise always a valid http(s) URL,
 * falling back to a search query when the input isn't a navigable address.
 */
export function resolveAddressInput(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  if (/^https?:\/\//i.test(trimmed)) {
    return isNavigableUrl(trimmed) ? trimmed : buildSearchUrl(trimmed);
  }

  if (!/\s/.test(trimmed) && (DOMAIN_LIKE.test(trimmed) || LOCALHOST_LIKE.test(trimmed))) {
    const candidate = `https://${trimmed}`;
    if (isNavigableUrl(candidate)) return candidate;
  }

  return buildSearchUrl(trimmed);
}
