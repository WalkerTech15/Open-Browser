export interface BrowserEngine {
  readonly name: string;
  createTab(url?: string): Promise<void>;
  navigate(url: string): Promise<void>;
  reload(): Promise<void>;
  stop(): Promise<void>;
}
