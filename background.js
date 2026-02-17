// Cache for resolved URLs to avoid repeated lookups
const urlCache = new Map();
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

// Show success badge on extension icon
function showSuccessBadge(tabId) {
  chrome.action.setBadgeText({ text: '✓', tabId });
  chrome.action.setBadgeBackgroundColor({ color: '#4CAF50', tabId });

  // Clear badge after 3 seconds
  setTimeout(() => {
    chrome.action.setBadgeText({ text: '', tabId });
  }, 3000);
}

// Mavely domain patterns
const MAVELY_DOMAINS = ['mave.ly', 'mavely.co', 'mavely.app', 'mavely.app.link', 'joinmavely.com', 'mavelyinfluencer.com'];

// Affiliate redirect domains that wrap the real destination in a parameter
const AFFILIATE_REDIRECT_DOMAINS = {
  'goto.walmart.com': 'u',
  'goto.target.com': 'u',
  'click.linksynergy.com': 'murl',
  'www.anrdoezrs.net': 'url',
  'www.kqzyfj.com': 'url',
  'www.dpbolvw.net': 'url',
  'www.jdoqocy.com': 'url',
  'www.tkqlhce.com': 'url',
  'prf.hn': 'destination'
};

// Tracking parameters to strip from final URLs
const TRACKING_PARAMS = [
  // UTM parameters
  'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'utm_id',
  // Affiliate tracking
  'ref', 'aff', 'affiliate', 'affiliates_ad_id', 'afsrc', 'campaign_id',
  'clickid', 'irgwc', 'irclickid', 'sharedid', 'sourceid', 'veh', 'wmlspartner',
  'subId1', 'subId2', 'subId3', 'sid', 'oid', 'affid', 'aff_id',
  // Branch.io
  '_branch_match_id', '_branch_referrer',
  // Impact
  'irpid', 'iradid', 'irmpname', 'irmptype',
  // General tracking
  'srsltid', 'tag', 'linkCode', 'linkId', 'ref_', 'pd_rd_w', 'pf_rd_p',
  'mc_cid', 'mc_eid', 'fbclid', 'gclid', 'gclsrc', 'msclkid', 'dclid',
  '_ga', '_gl', 'oly_anon_id', 'oly_enc_id', 'otm_source', 'otm_medium', 'otm_campaign'
];

// Extract real URL from affiliate redirect wrappers
function unwrapAffiliateRedirect(url) {
  try {
    const urlObj = new URL(url);
    const paramName = AFFILIATE_REDIRECT_DOMAINS[urlObj.hostname];
    if (paramName) {
      const realUrl = urlObj.searchParams.get(paramName);
      if (realUrl) {
        return realUrl;
      }
    }
  } catch {}
  return url;
}

// Strip tracking parameters from URL
function stripTrackingParams(url) {
  try {
    const urlObj = new URL(url);
    TRACKING_PARAMS.forEach(param => urlObj.searchParams.delete(param));
    return urlObj.toString();
  } catch {
    return url;
  }
}

// Clean a URL: unwrap affiliate redirects and strip tracking params
function cleanUrl(url) {
  let cleaned = unwrapAffiliateRedirect(url);
  cleaned = stripTrackingParams(cleaned);
  return cleaned;
}

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

async function resolveUrl(mavelyUrl) {
  // Check cache first
  const cached = urlCache.get(mavelyUrl);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.resolvedUrl;
  }

  try {
    // Single GET request with redirect follow - matches what browser would do anyway
    // Using AbortController for timeout to avoid hanging on slow responses
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(mavelyUrl, {
      method: 'GET',
      redirect: 'follow',
      signal: controller.signal
    });

    clearTimeout(timeout);
    let resolvedUrl = response.url;

    // Clean the URL: unwrap affiliate redirects and strip tracking params
    resolvedUrl = cleanUrl(resolvedUrl);

    // Cache if we got a different, non-Mavely URL
    if (resolvedUrl !== mavelyUrl && !isMavelyUrl(resolvedUrl)) {
      urlCache.set(mavelyUrl, {
        resolvedUrl,
        timestamp: Date.now()
      });
      return resolvedUrl;
    }

    return mavelyUrl;
  } catch (error) {
    console.error('Mavely Decoder: Error resolving URL', error);
    return mavelyUrl;
  }
}

// Listen for messages from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'RESOLVE_MAVELY_URL') {
    resolveUrl(message.url).then(resolvedUrl => {
      // Show badge if successfully decoded
      if (resolvedUrl !== message.url && sender.tab?.id) {
        showSuccessBadge(sender.tab.id);
      }
      sendResponse({ resolvedUrl });
    });
    return true; // Keep channel open for async response
  }

  if (message.type === 'CHECK_ENABLED') {
    chrome.storage.local.get(['enabled'], (result) => {
      sendResponse({ enabled: result.enabled !== false }); // Default to enabled
    });
    return true;
  }
});

// Initialize extension state
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({ enabled: true });
});

// Intercept direct navigation to Mavely URLs (pasted links, bookmarks, etc.)
chrome.webNavigation.onBeforeNavigate.addListener(async (details) => {
  // Only intercept main frame navigation
  if (details.frameId !== 0) return;

  // Check if enabled
  const { enabled } = await chrome.storage.local.get(['enabled']);
  if (enabled === false) return;

  // Check if it's a Mavely URL
  if (!isMavelyUrl(details.url)) return;

  // Resolve the URL
  const resolvedUrl = await resolveUrl(details.url);

  // If we got a different URL, redirect and show badge
  if (resolvedUrl !== details.url) {
    chrome.tabs.update(details.tabId, { url: resolvedUrl });
    showSuccessBadge(details.tabId);
  }
}, {
  url: [
    { hostEquals: 'mave.ly' },
    { hostEquals: 'mavely.co' },
    { hostEquals: 'mavely.app' },
    { hostEquals: 'mavely.app.link' },
    { hostSuffix: '.joinmavely.com' }
  ]
});
