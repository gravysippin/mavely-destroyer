# Mavely Link Stripper

A Chrome extension that automatically decodes Mavely affiliate links and redirects you to the actual destination, with tracking parameters removed.

## What it does

When you click a Mavely link (mave.ly, mavely.co, etc.), the extension:

1. Intercepts the click before your browser follows the redirect
2. Resolves the short link to its final destination
3. Strips tracking and affiliate parameters from the URL
4. Navigates you directly to the clean destination

It also handles direct navigation — if you paste a Mavely URL into the address bar, it will redirect you automatically.

## Supported domains

- `mave.ly`
- `mavely.co`
- `mavely.app`
- `mavely.app.link`
- `joinmavely.com`
- `mavelyinfluencer.com`

## Installing locally (unpacked)

1. Clone or download this repository
2. Open Chrome and go to `chrome://extensions`
3. Enable **Developer mode** (toggle in the top right)
4. Click **Load unpacked**
5. Select the project folder

The extension icon will appear in your toolbar.

## Usage

- The extension is enabled by default
- Click the toolbar icon to open the popup and toggle it on or off
- When a link is successfully decoded, a green checkmark badge appears on the icon briefly

## Files

| File | Purpose |
|------|---------|
| `manifest.json` | Extension config and permissions |
| `background.js` | Service worker — resolves URLs and strips tracking params |
| `content.js` | Intercepts Mavely link clicks on pages |
| `popup.html` / `popup.js` | Toggle UI |

## Permissions

- `storage` — saves the enabled/disabled state
- `webNavigation` — intercepts direct navigation to Mavely URLs
- Host permissions for Mavely domains and common affiliate redirect domains
