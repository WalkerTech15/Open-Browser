const backButton = document.getElementById('back-button') as HTMLButtonElement;
const forwardButton = document.getElementById('forward-button') as HTMLButtonElement;
const reloadButton = document.getElementById('reload-button') as HTMLButtonElement;
const addressInput = document.getElementById('address-input') as HTMLInputElement;
const loadingBar = document.getElementById('loading-bar') as HTMLDivElement;
const errorBanner = document.getElementById('error-banner') as HTMLDivElement;

let addressHasFocus = false;

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
