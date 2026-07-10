# Tax Pressure Capital Estimator

This repository is configured for a framework-free static deployment. 

## 🚨 PRODUCTION SOURCE OF TRUTH
The **`/site`** directory is the absolute production source of truth. All functional code, style sheets, embed widgets, and calculations live inside this folder.

### Vercel Deployment Instructions
When deploying this project to Vercel, use the following configuration in your Vercel Dashboard:
- **Root Directory:** `site`
- **Framework Preset:** `Other` (or `null` / No Framework)
- **Build Command:** *Leave Empty* (No build command)
- **Install Command:** *Leave Empty* (No install command)

### Key Architecture Notes
- **No Node/React Runtime Needed:** The production application runs completely in the client's browser as clean, native HTML5, CSS3, and JavaScript.
- **No API Keys Required:** The production application does not communicate with external private APIs or require any sensitive environment variables or secrets.
- **No Gemini Runtime Dependency:** This tool relies on pure, deterministic financial equations computed entirely locally for maximum speed, security, and enterprise privacy.

---

## Directory Index (`/site`)
* `/site/index.html` - Premium standalone landing page & full advisory worksheet.
* `/site/embed.html` - Ultra-lightweight widget designed to be safely iframe-embedded.
* `/site/styles.css` - Unified stylesheet supporting beautiful, responsive layouts with custom print media styles and cohesive light/dark variable schemes.
* `/site/config.js` - Global white-label settings, partner defaults, and brand parameters.
* `/site/calculator.js` - Pure, unit-tested deterministic financial math calculations.
* `/site/app.js` - DOM managers, browser state persistors, and iframe auto-resize listeners.
* `/site/widget.js` - Non-blocking script used by external CPA partner sites to dynamically inject the calculator iframe.
