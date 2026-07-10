# Tax Pressure Capital Estimator

A premium, professional, framework-free financial worksheet and emergency liquidity dashboard. It is designed to help CPAs, bookkeepers, tax preparers, and fractional CFOs turn tax-season cash pressure into structured, responsible capital-advisory referral opportunities.

This tool does **not** estimate or calculate tax liability. Instead, it takes a known tax obligation and reveals the **estimated liquidity gap** that will exist after paying the tax, covering projected operating expenses, and maintaining a selected cash reserve.

---

## Required File Structure

The project is built as a framework-free, zero-build static website inside `/site`:
* `index.html` - Standalone full-page landing page with heroes, FAQS, and trust badges.
* `embed.html` - Compact distraction-free iframe widget.
* `styles.css` - Unified stylesheet with full light/dark theme variables, print support, and responsive layouts.
* `config.js` - Global configuration definitions (brand names, default parameters, CTA redirection links).
* `calculator.js` - Pure, deterministic financial calculation engine functions.
* `app.js` - Client-side form handlers, clipboard copies, state storage, and postMessage frame sizers.
* `widget.js` - Zero-dependency widget loader that injects and auto-resizes iframe instances.

---

## Embed Installation Snippet

To embed the compact calculator on any partner page (e.g. WordPress, Wix, Webflow, custom HTML), insert this markup:

```html
<!-- 1. The container element where the widget will mount -->
<div id="tax-pressure-estimator"></div>

<!-- 2. Zero-dependency embed loader script with custom data parameters -->
<script
  src="https://YOUR-DOMAIN.com/site/widget.js"
  data-target="tax-pressure-estimator"
  data-partner-id="PARTNER-123"
  data-source="cpa-website"
  data-campaign="tax-season"
  data-theme="light"
  data-cta-url="https://YOUR-REFERRAL-FORM-URL.example"
  async>
</script>
```

---

## Supported Customizations

### 1. Script Data Attributes (`widget.js`)
You can control the widget configuration dynamically by setting any of the following attributes on your loader script:

| Attribute | Parameter Passed | Description | Default Fallback |
| :--- | :--- | :--- | :--- |
| `data-target` | *N/A* | Matches the `id` of the HTML container where the widget mounts. | `tax-pressure-estimator` |
| `data-partner-id` | `partner_id` | Unique identifier for tracking partner referrals. | `partner-default` (from config) |
| `data-source` | `source` | Identifies where traffic originates (e.g., email-blast, sidebar). | `cpa-calc` (from config) |
| `data-campaign` | `campaign` | Tracks seasonal campaigns (e.g., q2-estimated-taxes). | `tax-pressure-estimator` |
| `data-theme` | `theme` | Forces a visual mode inside the widget. Choices: `light`, `dark`, `auto`. | `light` (from config) |
| `data-cta-url` | `cta_url` | Overrides the destination redirect when clicking the referral button. | `https://YOUR-REFERRAL-FORM-URL.example` |
| `data-accent` | `accent` | Standard CSS color string (e.g., `#2E5A44`, `rgb(...)`) to override branding. | Main CPA sage-green color |
| `data-persist` | `persist` | Enables/Disables browser localStorage parameters. | Opt-in via form toggle checkbox |

### 2. URL Query Parameters (`index.html` & `embed.html`)
The standalone page and widget automatically detect and preserve these parameters throughout the user's calculation session, appending them when building the final referral URL:
* `partner_id`
* `source`
* `campaign`
* `utm_source`
* `utm_medium`
* `utm_campaign`
* `theme` (e.g., `theme=dark` or `theme=auto`)
* `accent` (e.g., `accent=%23B91C1C` for custom hex codes)
* `cta_url` (forces destination override securely)

*All displayed values parsed from query strings are sanitized to prevent unsafe text injection.*

### 3. Demonstration & Trial Modes
The application supports a clean, blank-slate normal mode for real client usage, as well as easy demonstration flows for reviewers and sales reps:
* **Normal Mode (Default)**: On a standard first visit, all financial input fields remain empty and clean. No calculations are run automatically, preventing premature event logs or placeholder results.
* **Load Sample Demo Data Button**: A secondary button is available directly on the form actions bar. Clicking this instantly populates the form with Test Case 1 values and triggers an active calculation, allowing users to discover the tool's interactive charts and waterfalls without manually entering numbers. This action explicitly bypasses `localStorage` persistence, protecting any real client data previously saved.
* **Automated Demo Mode**: Append `?demo=1` to the URL query string or configure `DEMO_MODE: true` in `config.js` to automatically pre-populate the form with Test Case 1 values and calculate immediately upon loading.

---

## Core Financial Equations

Our engine uses these deterministic equations (normalized to local midnights at runtime to guarantee timezone accuracy):

$$\text{daysUntilDue} = \max(0, \lceil(\text{dueDate} - \text{currentLocalDate}) / \text{millisecondsPerDay}\rceil)$$

$$\text{projectedOperatingExpenses} = \text{monthlyOperatingExpenses} \times \left(\frac{\text{daysUntilDue}}{30.4375}\right)$$

$$\text{protectedReserve} = \text{monthlyOperatingExpenses} \times \left(\frac{\text{reserveWeeks}}{4.345}\right)$$

$$\text{projectedCashBeforeTax} = \text{operatingCash} + \text{taxReserve} + \text{expectedCollections} - \text{projectedOperatingExpenses}$$

$$\text{projectedCashAfterTax} = \text{projectedCashBeforeTax} - \text{taxAmount}$$

$$\text{minimumCapitalGap} = \max(0, \text{taxAmount} + \text{protectedReserve} - \text{projectedCashBeforeTax})$$

$$\text{planningBuffer} = \text{minimumCapitalGap} \times \left(\frac{\text{bufferPercent}}{100}\right)$$

$$\text{recommendedCapitalTarget} = \text{roundUpToIncrement}(\text{minimumCapitalGap} + \text{planningBuffer}, 500)$$

$$\text{remainingHeadroom} = \text{projectedCashBeforeTax} - \text{taxAmount} - \text{protectedReserve}$$

$$\text{cashCoveragePercent} = \left(\frac{\text{projectedCashBeforeTax}}{\text{taxAmount} + \text{protectedReserve}}\right) \times 100$$

---

## Core Result Status Logic

* **Overdue** (Payment due date falls in the past):  
  Display: `"Payment date passed"` (Takes absolute priority even if projected balances appear sufficient)
* **Critical** ($\text{minimumCapitalGap} > 0$ and either $\text{daysUntilDue} \le 14$ or $\text{projectedCashBeforeTax} < 0$):  
  Display: `"Critical cash pressure"`
* **Pressured** ($\text{minimumCapitalGap} > 0$ and Critical rules do not apply):  
  Display: `"Capital gap identified"`
* **Tight** ($\text{minimumCapitalGap} = 0$ and $\text{remainingHeadroom} < \text{monthlyOperatingExpenses} \times 0.25$):  
  Display: `"Covered, but tight"`
* **Covered** ($\text{minimumCapitalGap} = 0$ and Tight rules do not apply):  
  Display: `"Projected cash appears sufficient"`

---

## Manual Test Cases & Expected Behaviors

### Test Case 1: Capital Gap Shortfall
* **Inputs**:
  * Tax funds due: `$50,000`
  * Due date: `30 days from today`
  * Operating cash: `$30,000`
  * Tax reserve: `$10,000`
  * Expected collections: `$20,000`
  * Monthly operating expenses: `$30,000`
  * Reserve weeks to protect: `4`
  * Planning buffer: `5%`
* **Expected Result**:
  * Positive capital gap: `~$47,187`
  * Recommended capital target (rounded up to nearest `$500`): `$50,000`
  * Status: `"Capital gap identified"` or `"Critical cash pressure"` (depending on exact rounding offsets of local current midnight).

### Test Case 2: Sufficient Cash Coverage
* **Inputs**:
  * Tax funds due: `$25,000`
  * Due date: `30 days from today`
  * Operating cash: `$80,000`
  * Tax reserve: `$10,000`
  * Expected collections: `$20,000`
  * Monthly operating expenses: `$30,000`
  * Reserve weeks to protect: `4`
  * Planning buffer: `5%`
* **Expected Result**:
  * Minimum capital gap: `$0`
  * Recommended capital target: `$0`
  * Positive headroom: `~$55,431`
  * Status: `"Projected cash appears sufficient"` or `"Covered, but tight"`.

### Test Case 3: Overdue Payment Date
* **Inputs**:
  * Due date: `7 days in the past`
* **Expected Result**:
  * Days remaining: `0`
  * Status: `"Payment date passed"` (indicated clearly on the result summary banner).

### Test Case 4: Zero Expense Scenario (Pre-revenue / Early stage)
* **Inputs**:
  * Monthly expenses: `$0`
  * Reserve weeks: `4`
* **Expected Result**:
  * Protected reserve: `$0`
  * No `divide-by-zero` or `NaN` errors.
  * Correct capital-gap calculation.

### Test Case 5: Dual Embed Integration
* **Setup**: Place two separate `<div id="...">` elements on the same test page, each loaded with a unique `widget.js` script tag pointing to different target containers.
* **Expected Result**:
  * Both widgets render completely independently.
  * PostMessage height messages do not leak, and each iframe resizes to its own correct height.
  * No global variable collisions or duplicate script load warnings.

---

## Deployment Instructions

### Local Testing
Since this is a fully static project, you can preview and run the estimator in any browser.
To launch locally using a lightweight server, run:
```bash
npx serve site
```
or open `/site/index.html` directly in your browser.

### Vercel Deployment
1. Set up a new project in Vercel.
2. Link your repository.
3. Under **Project Settings**:
   * Set **Root Directory** to `site`.
   * Under **Framework Preset**, select **Other**.
   * Leave the **Build Command** blank (no build step required).
4. Deploy!

---

## Safety, Compliance, & Privacy Boundaries

### Privacy Guardrails
To maintain strict enterprise-grade privacy standards, this application:
1. **Never** stores or transmits sensitive data including SSNs, EINs, bank credentials, tax returns, personal client names, contact details, or financial accounts.
2. **Never** transmits exact calculation values to the referral destination URL unless the user **explicitly checks** the opt-in checkbox labeled `"Include the estimate details with the referral"`.
3. Stores parameters in `localStorage` **only** after explicit user opt-in via `"Remember these calculator inputs on this device"`. A visible clear button is provided to purge cache instantly.

### Legal Language
The standalone footer and embed results incorporate a formal disclaimer reminding advisors and clients that this tool is purely educational and does not constitute financial, lending, tax, legal, or accounting advice.
