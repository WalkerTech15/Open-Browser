import type { BrowserWindow, PermissionRequest, Session, WebContents } from 'electron';

export type PromptablePermission = 'media' | 'geolocation' | 'notifications';
export interface PermissionPrompt {
  origin: string;
  permission: PromptablePermission;
  description: string;
}
export type AskPermission = (window: BrowserWindow, prompt: PermissionPrompt) => Promise<boolean>;
const pendingWindows = new WeakSet<BrowserWindow>();

interface ContentContext {
  contents: WebContents;
  window: BrowserWindow;
  active: boolean;
  generation: number;
  notificationOrigin: string | null;
  cancelPending: (() => void) | null;
}

/** Session-local policy. Grants are held in memory only for the current tab. */
export class PermissionPolicy {
  private readonly contexts = new Map<number, ContentContext>();

  constructor(session: Session, private readonly ask: AskPermission) {
    session.setPermissionRequestHandler((contents, permission, callback, details) => {
      this.request(contents, permission, callback, details);
    });
    session.setPermissionCheckHandler((contents, permission, origin, details) => {
      if (!contents || contents.isDestroyed() || permission !== 'notifications' || !details.isMainFrame) return false;
      const context = this.contexts.get(contents.id);
      const normalized = trustedOrigin(origin);
      return !!context && context.active
        && !context.window.isDestroyed() && normalized !== null
        && context.notificationOrigin === normalized
        && trustedOrigin(contents.getURL()) === normalized
        && (!details.requestingUrl || trustedOrigin(details.requestingUrl) === normalized);
    });
    session.setDevicePermissionHandler(() => false);
  }

  track(contents: WebContents, window: BrowserWindow): { setActive(active: boolean): void; dispose(): void } {
    const contentId = contents.id;
    const context: ContentContext = { contents, window, active: false, generation: 0, notificationOrigin: null, cancelPending: null };
    this.contexts.set(contentId, context);
    const onNavigation = (_event: Electron.Event, _url: string, _inPlace: boolean, isMainFrame: boolean) => {
      if (isMainFrame) this.invalidate(context);
    };
    const onDestroyed = () => { this.invalidate(context); this.contexts.delete(contentId); };
    contents.on('did-start-navigation', onNavigation);
    contents.once('destroyed', onDestroyed);
    return {
      setActive: (active) => {
        if (context.active && !active) this.invalidate(context);
        context.active = active;
      },
      dispose: () => {
        this.invalidate(context);
        this.contexts.delete(contentId);
        contents.off('did-start-navigation', onNavigation);
        contents.off('destroyed', onDestroyed);
      }
    };
  }

  private invalidate(context: ContentContext): void {
    context.generation++;
    context.notificationOrigin = null;
    context.cancelPending?.();
  }

  private request(contents: WebContents, permission: string, callback: (allowed: boolean) => void, details: PermissionRequest): void {
    if (contents.isDestroyed()) { callback(false); return; }
    const context = this.contexts.get(contents.id);
    const origin = trustedOrigin(details.requestingUrl);
    const prompt = origin && describeRequest(origin, permission, details);
    if (!context || !context.active || context.window.isDestroyed()
      || !context.window.isFocused() || !details.isMainFrame || !origin || !prompt
      || trustedOrigin(contents.getURL()) !== origin || pendingWindows.has(context.window)) {
      callback(false);
      return;
    }

    const generation = context.generation;
    let completed = false;
    const finish = (allowed: boolean) => {
      if (completed) return;
      completed = true;
      context.cancelPending = null;
      if (allowed && prompt.permission === 'notifications') context.notificationOrigin = origin;
      callback(allowed);
    };
    context.cancelPending = () => finish(false);
    pendingWindows.add(context.window);
    void Promise.resolve().then(() => completed ? false : this.ask(context.window, prompt)).then((allowed) => {
      const valid = context.active && context.generation === generation && !contents.isDestroyed()
        && !context.window.isDestroyed() && trustedOrigin(contents.getURL()) === origin;
      finish(allowed === true && valid);
    }).catch(() => finish(false)).finally(() => { pendingWindows.delete(context.window); });
  }
}

function trustedOrigin(raw: string): string | null {
  try {
    const url = new URL(raw);
    const loopback = url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
    return (url.protocol === 'https:' || loopback) && !url.username && !url.password ? url.origin : null;
  } catch { return null; }
}

function describeRequest(origin: string, permission: string, details: PermissionRequest): PermissionPrompt | null {
  if (permission === 'geolocation') return { origin, permission, description: 'your location' };
  if (permission === 'notifications') return { origin, permission, description: 'send notifications' };
  if (permission !== 'media') return null;
  const media = details as Electron.MediaAccessPermissionRequest;
  if (media.securityOrigin && trustedOrigin(media.securityOrigin) !== origin) return null;
  if (!media.mediaTypes?.length || media.mediaTypes.some(type => type !== 'audio' && type !== 'video')) return null;
  const audio = media.mediaTypes.includes('audio');
  const video = media.mediaTypes.includes('video');
  return { origin, permission, description: audio && video ? 'your camera and microphone' : audio ? 'your microphone' : 'your camera' };
}
