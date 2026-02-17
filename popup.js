const toggle = document.getElementById('enableToggle');
const status = document.getElementById('status');

// Load current state
chrome.storage.local.get(['enabled'], (result) => {
  const isEnabled = result.enabled !== false;
  toggle.checked = isEnabled;
  updateStatus(isEnabled);
});

// Handle toggle changes
toggle.addEventListener('change', () => {
  const isEnabled = toggle.checked;
  chrome.storage.local.set({ enabled: isEnabled });
  updateStatus(isEnabled);
});

function updateStatus(isEnabled) {
  status.textContent = isEnabled
    ? 'Decoding Mavely links'
    : 'Disabled - links unchanged';
}
