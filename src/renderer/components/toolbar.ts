const backButton = document.getElementById('back-button') as HTMLButtonElement;
const forwardButton = document.getElementById('forward-button') as HTMLButtonElement;
const reloadButton = document.getElementById('reload-button') as HTMLButtonElement;
const addressInput = document.getElementById('address-input') as HTMLInputElement;
const loadingBar = document.getElementById('loading-bar') as HTMLDivElement;
const errorBanner = document.getElementById('error-banner') as HTMLDivElement;
const tabList = document.getElementById('tab-list') as HTMLDivElement;
const newTabButton = document.getElementById('new-tab-button') as HTMLButtonElement;
const historyButton = document.getElementById('history-button') as HTMLButtonElement;
const profilesButton = document.getElementById('profiles-button') as HTMLButtonElement;
const workspacesButton = document.getElementById('workspaces-button') as HTMLButtonElement;
const mediaSessionWarning = document.getElementById('media-session-warning') as HTMLSpanElement;

let addressHasFocus = false;
let focusAddressAfterTabCreation = false;
let focusActiveTabAfterClose = false;

function renderTabs(state: import('../../shared/types/browserTabs').BrowserTabsState): void {
  tabList.replaceChildren();

  const sessionAccess = state.sessionMediaAccess;
  const sessionDevice = sessionAccess?.camera && sessionAccess.microphone ? 'Camera and microphone'
    : sessionAccess?.camera ? 'Camera' : sessionAccess?.microphone ? 'Microphone' : '';
  mediaSessionWarning.hidden = !sessionDevice;
  mediaSessionWarning.textContent = sessionDevice ? `${sessionDevice} may be in use` : '';
  const sessionExplanation = `${sessionDevice} access was allowed in this browser session and may still be in use, including in a popup. This is not live status. To be safe, close all Open Browser windows.`;
  mediaSessionWarning.title = sessionDevice ? sessionExplanation : '';
  if (sessionDevice) mediaSessionWarning.setAttribute('aria-label', sessionExplanation);
  else mediaSessionWarning.removeAttribute('aria-label');

  for (const tab of state.tabs) {
    const item = document.createElement('div');
    item.className = 'tab-item';

    const selectButton = document.createElement('button');
    selectButton.type = 'button';
    selectButton.className = 'tab-select';
    selectButton.dataset.selectTabId = tab.id;
    selectButton.setAttribute('aria-pressed', String(tab.isActive));
    const access = tab.possibleMediaAccess;
    const devices = access?.camera && access.microphone ? 'Camera and microphone'
      : access?.camera ? 'Camera' : access?.microphone ? 'Microphone' : '';
    const explanation = `${devices} access was allowed in this tab and may still be in use. This is not live status.`;
    selectButton.title = devices ? `${tab.url || tab.label}\n${explanation}` : tab.url || tab.label;
    if (devices) selectButton.setAttribute('aria-label', `${tab.label}. ${explanation}`);
    const label = document.createElement('span');
    label.className = 'tab-label';
    label.textContent = tab.label;
    selectButton.append(label);
    for (const [enabled, text] of [[access?.camera, 'CAM?'], [access?.microphone, 'MIC?']] as const) {
      if (!enabled) continue;
      const warning = document.createElement('span');
      warning.className = 'tab-media-warning';
      warning.setAttribute('aria-hidden', 'true');
      warning.textContent = text;
      selectButton.append(warning);
    }

    const closeButton = document.createElement('button');
    closeButton.type = 'button';
    closeButton.className = 'tab-close';
    closeButton.dataset.closeTabId = tab.id;
    closeButton.setAttribute('aria-label', `Close ${tab.label}`);
    closeButton.title = `Close ${tab.label}`;
    closeButton.textContent = '×';

    item.append(selectButton, closeButton);
    tabList.append(item);
  }

  if (focusAddressAfterTabCreation) {
    focusAddressAfterTabCreation = false;
    addressInput.focus();
    addressInput.select();
  } else if (focusActiveTabAfterClose) {
    focusActiveTabAfterClose = false;
    const activeButton = tabList.querySelector<HTMLButtonElement>('[aria-pressed="true"]');
    activeButton?.focus();
  }
}

tabList.addEventListener('click', (event) => {
  if (!(event.target instanceof Element)) return;
  const closeButton = event.target.closest<HTMLButtonElement>('[data-close-tab-id]');
  if (closeButton) {
    focusActiveTabAfterClose = true;
    window.openBrowser.closeTab(closeButton.dataset.closeTabId ?? '');
    return;
  }

  const selectButton = event.target.closest<HTMLButtonElement>('[data-select-tab-id]');
  if (selectButton?.dataset.selectTabId) {
    window.openBrowser.activateTab(selectButton.dataset.selectTabId);
  }
});

newTabButton.addEventListener('click', () => {
  focusAddressAfterTabCreation = true;
  window.openBrowser.newTab();
});

addressInput.addEventListener('focus', () => {
  addressHasFocus = true;
});
addressInput.addEventListener('blur', () => {
  addressHasFocus = false;
});
addressInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    addressInput.blur();
    window.openBrowser.navigate(addressInput.value);
  }
});

backButton.addEventListener('click', () => window.openBrowser.goBack());
forwardButton.addEventListener('click', () => window.openBrowser.goForward());
reloadButton.addEventListener('click', () => {
  if (reloadButton.dataset.mode === 'stop') {
    window.openBrowser.stop();
  } else {
    window.openBrowser.reload();
  }
});

window.openBrowser.onState((state) => {
  backButton.disabled = !state.canGoBack;
  forwardButton.disabled = !state.canGoForward;

  reloadButton.dataset.mode = state.isLoading ? 'stop' : 'reload';
  reloadButton.textContent = state.isLoading ? '×' : '↻';
  reloadButton.setAttribute('aria-label', state.isLoading ? 'Stop' : 'Reload');

  loadingBar.classList.toggle('visible', state.isLoading);

  if (!addressHasFocus) {
    addressInput.value = state.url;
  }

  if (state.error) {
    errorBanner.textContent = `Can't reach this page — ${state.error}`;
    errorBanner.classList.add('visible');
  } else {
    errorBanner.classList.remove('visible');
  }
});

window.openBrowser.onTabs(renderTabs);
historyButton.addEventListener('click', () => window.openBrowser.showHistory());
profilesButton.addEventListener('click', () => window.openBrowser.showProfiles());
workspacesButton.addEventListener('click', () => window.openBrowser.showWorkspaces());
