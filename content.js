// Mavely domain patterns
const MAVELY_DOMAINS = ['mave.ly', 'mavely.co', 'mavely.app', 'mavely.app.link', 'joinmavely.com'];

let isEnabled = true;

function isMavelyUrl(url) {
  try {
    const hostname = new URL(url).hostname;
    return MAVELY_DOMAINS.some(domain =>
      hostname === domain || hostname.endsWith('.' + domain)
    );
  } catch {
    return false;
  }
}

function showLoadingIndicator(link) {
  const indicator = document.createElement('span');
  indicator.className = 'mavely-decoder-loading';
  indicator.textContent = ' (decoding...)';
  indicator.style.cssText = 'font-size: 11px; color: #666; font-style: italic;';
  link.appendChild(indicator);
  return indicator;
}

function removeLoadingIndicator(indicator) {
  if (indicator && indicator.parentNode) {
    indicator.parentNode.removeChild(indicator);
  }
}

async function handleMavelyClick(event) {
  if (!isEnabled) return;

  const link = event.target.closest('a');
  if (!link || !link.href) return;

  if (!isMavelyUrl(link.href)) return;

  event.preventDefault();
  event.stopPropagation();

  const indicator = showLoadingIndicator(link);

  try {
    const response = await chrome.runtime.sendMessage({
      type: 'RESOLVE_MAVELY_URL',
      url: link.href
    });

    removeLoadingIndicator(indicator);

    if (response && response.resolvedUrl) {
      // Respect target attribute for new tabs
      if (link.target === '_blank') {
        window.open(response.resolvedUrl, '_blank');
      } else {
        window.location.href = response.resolvedUrl;
      }
    } else {
      // Fallback to original behavior if resolution failed
      window.location.href = link.href;
    }
  } catch (error) {
    console.error('Mavely Decoder: Error', error);
    removeLoadingIndicator(indicator);
    window.location.href = link.href;
  }
}

// Use event delegation on document for efficiency
document.addEventListener('click', handleMavelyClick, true);

// Check if extension is enabled
chrome.runtime.sendMessage({ type: 'CHECK_ENABLED' }, (response) => {
  if (response) {
    isEnabled = response.enabled;
  }
});

// Listen for enable/disable changes
chrome.storage.onChanged.addListener((changes) => {
  if (changes.enabled) {
    isEnabled = changes.enabled.newValue;
  }
});
