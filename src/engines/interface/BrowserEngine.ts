import type { BrowserWindow } from 'electron';
import type { NavigationState, NavigationStateListener } from '../../shared/types/navigationState';

/**
 * The contract every browser engine (Chromium today, Gecko in the future —
 * see src/engines/gecko/README.md) must implement. Nothing outside
 * src/engines/ should depend on a concrete engine class directly; depend on
 * this interface instead so engines stay swappable.
 */
export interface BrowserEngine {
  readonly name: string;

  /** Mounts the engine's content view into a window, below a toolbar of the given height. */
  attach(window: BrowserWindow, toolbarHeight: number): void;

  /** Shows or hides this tab's content view without destroying its page state. */
  setVisible(visible: boolean): void;

  navigate(url: string): Promise<void>;
  goBack(): void;
  goForward(): void;
  reload(): void;
  stop(): void;

  getState(): NavigationState;
  onStateChange(listener: NavigationStateListener): () => void;

  destroy(): void;
}
