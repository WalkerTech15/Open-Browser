import type { PossibleMediaAccess, RequestedMediaType } from '../../shared/types/mediaAccess';

/** Remembers possible access for this app process; it is never written to disk. */
export class CaptureWarningStore {
  private state: PossibleMediaAccess = { camera: false, microphone: false };
  private readonly listeners = new Set<() => void>();

  snapshot(): PossibleMediaAccess {
    return { ...this.state };
  }

  mark(types: readonly RequestedMediaType[]): void {
    const next = {
      camera: this.state.camera || types.includes('video'),
      microphone: this.state.microphone || types.includes('audio')
    };
    if (next.camera === this.state.camera && next.microphone === this.state.microphone) return;
    this.state = next;
    for (const listener of this.listeners) listener();
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  }
}

export const captureWarningStore = new CaptureWarningStore();

export function warningWindowTitle(state: PossibleMediaAccess, fallback = 'Open Browser'): string {
  const device = state.camera && state.microphone ? 'Camera and microphone'
    : state.camera ? 'Camera' : state.microphone ? 'Microphone' : '';
  return device ? `${device} may be in use — ${fallback}` : fallback;
}
