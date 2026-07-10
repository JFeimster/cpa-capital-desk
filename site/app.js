/**
 * Tax Pressure Capital Estimator - Main Application Script
 * Handles DOM interactions, form binding, validation, state persistence,
 * and live calculations by interfacing with calculator.js.
 */

// Global state holding our calculated results and parsed query params
const AppState = {
  isEmbed: false,
  attribution: {
    partner_id: "",
    source: "",
    campaign: "",
    utm_source: "",
    utm_medium: "",
    utm_campaign: ""
  },
  currentCalculations: null,
  hasStarted: false
};

// --- Helper Functions ---

/**
 * Safely format currency in localized form
 */
function formatCurrency(amount, currencyCode = "USD") {
  if (isNaN(amount) || amount === null || amount === undefined) return "$0";
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currencyCode,
      maximumFractionDigits: 0
    }).format(amount);
  } catch (e) {
    return "$" + Math.round(amount).toLocaleString();
  }
}

/**
 * Format date nicely for summary copy
 */
function formatDate(dateString) {
  if (!dateString) return "N/A";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return dateString;
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC" // avoid timezone offset shifting the display day
  });
}

/**
 * Sanitize text to prevent XSS when injecting into DOM
 */
function sanitizeText(str) {
  if (!str) return "";
  const temp = document.createElement("div");
  temp.textContent = str;
  return temp.innerHTML;
}

/**
 * Custom event tracking helper
 */
function trackEvent(eventName, metadata = {}) {
  const status = AppState.currentCalculations ? AppState.currentCalculations.statusLabel : "not_calculated";
  const gap = AppState.currentCalculations ? AppState.currentCalculations.minimumCapitalGap : 0;
  const days = AppState.currentCalculations ? AppState.currentCalculations.daysUntilDue : 0;
  const isOverdue = AppState.currentCalculations ? AppState.currentCalculations.isOverdue : false;
  
  // Map Gap & Deadline bands
  const gapBand = getGapBand(gap);
  const deadlineBand = getDeadlineBand(isOverdue, days);

  const eventData = {
    event: eventName,
    timestamp: new Date().toISOString(),
    metadata: {
      result_status: status,
      gap_band: gapBand,
      deadline_band: deadlineBand,
      reserve_weeks: document.getElementById("reserveWeeks")?.value || CONFIG.DEFAULT_RESERVE_WEEKS,
      mode: AppState.isEmbed ? "embed" : "standalone",
      partner_id: AppState.attribution.partner_id,
      source: AppState.attribution.source,
      campaign: AppState.attribution.campaign,
      ...metadata
    }
  };

  // 1. Push to window.dataLayer
  if (window.dataLayer && typeof window.dataLayer.push === "function") {
    try {
      window.dataLayer.push(eventData);
    } catch (e) {
      console.warn("Analytics dataLayer push failed", e);
    }
  }

  // 2. Dispatch a browser CustomEvent
  try {
    const customEvent = new CustomEvent(eventName, { detail: eventData });
    window.dispatchEvent(customEvent);
  } catch (e) {
    console.warn("Analytics CustomEvent dispatch failed", e);
  }
}

/**
 * Map gap amount to practical bands
 */
function getGapBand(gap) {
  if (gap === 0) return "no_gap";
  if (gap <= 10000) return "under_10k";
  if (gap <= 25000) return "10k_to_25k";
  if (gap <= 50000) return "25k_to_50k";
  if (gap <= 100000) return "50k_to_100k";
  return "over_100k";
}

/**
 * Map days until due to practical bands
 */
function getDeadlineBand(isOverdue, days) {
  if (isOverdue) return "overdue";
  if (days <= 7) return "0_to_7_days";
  if (days <= 14) return "8_to_14_days";
  if (days <= 30) return "15_to_30_days";
  if (days <= 60) return "31_to_60_days";
  return "over_60_days";
}

/**
 * Safe CSS color validation using Option element test
 */
function isValidColor(colorString) {
  if (!colorString) return false;
  const s = new Option().style;
  s.color = colorString;
  return s.color !== "";
}

/**
 * Safe URL validation
 */
function getSanitizedCtaUrl(inputUrl) {
  if (!inputUrl) return CONFIG.CTA_BASE_URL;
  try {
    const url = new URL(inputUrl);
    if (url.protocol === "http:" || url.protocol === "https:") {
      return url.toString();
    }
  } catch (e) {
    // Return base if malformed
  }
  return CONFIG.CTA_BASE_URL;
}

/**
 * postMessage communication helper to resize embedding iframe
 */
function sendHeightToParent() {
  if (!AppState.isEmbed) return;
  try {
    const height = document.body.scrollHeight || document.documentElement.scrollHeight;
    window.parent.postMessage({
      type: "resize-iframe",
      height: Math.ceil(height + 10), // slight padding to prevent scroll bars
      location: window.location.href
    }, "*");
  } catch (e) {
    console.warn("postMessage height transmission failed", e);
  }
}

// --- Clipboard Copy Helper ---
function showToast(message) {
  const toast = document.getElementById("toast");
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add("active");
  setTimeout(() => {
    toast.classList.remove("active");
  }, 3000);
}

// --- Application Core Code ---

document.addEventListener("DOMContentLoaded", function() {
  const form = document.getElementById("calculatorForm");
  if (!form) return;

  // 1. Detect Embed Mode from query parameter or window structure
  const urlParams = new URLSearchParams(window.location.search);
  AppState.isEmbed = urlParams.get("embed") === "true" || document.body.classList.contains("embed-body");

  // 2. Load & Validate Query/Attribution parameters
  AppState.attribution.partner_id = urlParams.get("partner_id") || CONFIG.ATTRIBUTION.DEFAULT_PARTNER_ID;
  AppState.attribution.source = urlParams.get("source") || CONFIG.ATTRIBUTION.DEFAULT_SOURCE;
  AppState.attribution.campaign = urlParams.get("campaign") || CONFIG.ATTRIBUTION.DEFAULT_CAMPAIGN;
  AppState.attribution.utm_source = urlParams.get("utm_source") || "";
  AppState.attribution.utm_medium = urlParams.get("utm_medium") || "";
  AppState.attribution.utm_campaign = urlParams.get("utm_campaign") || "";

  // Handle data-cta-url override if provided via URL param or script config
  let ctaOverride = urlParams.get("cta_url");
  if (ctaOverride) {
    CONFIG.CTA_BASE_URL = getSanitizedCtaUrl(ctaOverride);
  }

  // Handle custom accent color via parameter
  const customAccent = urlParams.get("accent");
  if (customAccent && isValidColor(customAccent)) {
    document.documentElement.style.setProperty("--accent-color", customAccent);
    // Dynamically calculate a hover color or apply the custom property directly
    document.documentElement.style.setProperty("--accent-hover", customAccent);
  }

  // Handle visual theme selection (light, dark, auto)
  const themeParam = urlParams.get("theme") || CONFIG.DEFAULT_VISUAL_THEME;
  if (["light", "dark", "auto"].includes(themeParam)) {
    document.documentElement.setAttribute("data-theme", themeParam);
  }

  // 2.5. Demo Mode & Example Detection
  const isDemoMode = (urlParams.get("demo") === "1") || (typeof CONFIG !== "undefined" && CONFIG.DEMO_MODE === true);
  let isDemoOrExampleActive = isDemoMode;

  function loadTestCase1Values() {
    const today = new Date();
    const defaultDueDate = new Date();
    defaultDueDate.setDate(today.getDate() + 30); // 30 days from today
    
    const dueDateInput = document.getElementById("dueDate");
    if (dueDateInput) {
      // Format to YYYY-MM-DD for native input
      const yyyy = defaultDueDate.getFullYear();
      const mm = String(defaultDueDate.getMonth() + 1).padStart(2, "0");
      const dd = String(defaultDueDate.getDate()).padStart(2, "0");
      dueDateInput.value = `${yyyy}-${mm}-${dd}`;
    }

    const elTaxAmount = document.getElementById("taxAmount");
    if (elTaxAmount) elTaxAmount.value = "50000";
    const elOperatingCash = document.getElementById("operatingCash");
    if (elOperatingCash) elOperatingCash.value = "30000";
    const elTaxReserve = document.getElementById("taxReserve");
    if (elTaxReserve) elTaxReserve.value = "10000";
    const elExpectedCollections = document.getElementById("expectedCollections");
    if (elExpectedCollections) elExpectedCollections.value = "20000";
    const elMonthlyExpenses = document.getElementById("monthlyOperatingExpenses");
    if (elMonthlyExpenses) elMonthlyExpenses.value = "30000";
  }

  // 3. Set Dropdown Defaults (These are always set to default selections initially)
  const reserveWeeksSelect = document.getElementById("reserveWeeks");
  if (reserveWeeksSelect) {
    reserveWeeksSelect.value = String(CONFIG.DEFAULT_RESERVE_WEEKS);
  }
  const bufferPercentSelect = document.getElementById("bufferPercent");
  if (bufferPercentSelect) {
    bufferPercentSelect.value = String(CONFIG.DEFAULT_PLANNING_BUFFER_PERCENT);
  }

  // 4. Opt-in LocalStorage Restoration
  const persistCheckbox = document.getElementById("persistInputs");
  const persistSettingKey = "tax_estimator_persist_enabled";
  const dataStoreKey = "tax_estimator_saved_inputs";

  // Check if user previously opted into local persistence
  const isPersistenceOptedIn = localStorage.getItem(persistSettingKey) === "true";
  if (persistCheckbox) {
    persistCheckbox.checked = isPersistenceOptedIn;
    
    // Toggle persist state on check change
    persistCheckbox.addEventListener("change", function() {
      const checked = persistCheckbox.checked;
      localStorage.setItem(persistSettingKey, checked ? "true" : "false");
      if (checked) {
        saveInputsToLocalStorage();
      } else {
        localStorage.removeItem(dataStoreKey);
        // Show clear indicator
        const clearBtn = document.getElementById("clearSavedBtn");
        if (clearBtn) clearBtn.style.display = "none";
      }
    });
  }

  // Initialize flag to trace if we restored state
  let hasRestoredState = false;

  if (isDemoMode) {
    // Demo Mode: Populate the Test Case 1 values immediately
    loadTestCase1Values();
  } else if (isPersistenceOptedIn) {
    // Normal Mode: Restore saved inputs if persistence was opted-in
    try {
      const saved = JSON.parse(localStorage.getItem(dataStoreKey));
      if (saved) {
        const elTax = document.getElementById("taxAmount");
        if (elTax && saved.taxAmount !== undefined) elTax.value = saved.taxAmount;
        const elDue = document.getElementById("dueDate");
        if (elDue && saved.dueDate !== undefined) elDue.value = saved.dueDate;
        const elOp = document.getElementById("operatingCash");
        if (elOp && saved.operatingCash !== undefined) elOp.value = saved.operatingCash;
        const elRes = document.getElementById("taxReserve");
        if (elRes && saved.taxReserve !== undefined) elRes.value = saved.taxReserve;
        const elColl = document.getElementById("expectedCollections");
        if (elColl && saved.expectedCollections !== undefined) elColl.value = saved.expectedCollections;
        const elExp = document.getElementById("monthlyOperatingExpenses");
        if (elExp && saved.monthlyOperatingExpenses !== undefined) elExp.value = saved.monthlyOperatingExpenses;
        if (saved.reserveWeeks !== undefined && reserveWeeksSelect) reserveWeeksSelect.value = saved.reserveWeeks;
        if (saved.bufferPercent !== undefined && bufferPercentSelect) bufferPercentSelect.value = saved.bufferPercent;
        
        // Show clear button since saved values exist
        const clearBtn = document.getElementById("clearSavedBtn");
        if (clearBtn) clearBtn.style.display = "inline-flex";

        hasRestoredState = true;
      }
    } catch (err) {
      console.warn("Failed to load saved state from localStorage", err);
    }
  } else {
    // Normal first visit: financial inputs remain empty/blank
    const elTax = document.getElementById("taxAmount");
    if (elTax) elTax.value = "";
    const elDue = document.getElementById("dueDate");
    if (elDue) elDue.value = "";
    const elOp = document.getElementById("operatingCash");
    if (elOp) elOp.value = "";
    const elRes = document.getElementById("taxReserve");
    if (elRes) elRes.value = "";
    const elColl = document.getElementById("expectedCollections");
    if (elColl) elColl.value = "";
    const elExp = document.getElementById("monthlyOperatingExpenses");
    if (elExp) elExp.value = "";
  }

  // Set up "Load Sample Demo Data" secondary button listener
  const loadExampleBtn = document.getElementById("loadExampleBtn");
  if (loadExampleBtn) {
    loadExampleBtn.addEventListener("click", function(e) {
      e.preventDefault();
      // Block saving example data to localStorage
      isDemoOrExampleActive = true;
      loadTestCase1Values();
      // Calculate and trigger full explicit submit effects (including focus & completion tracking)
      validateAndCalculate(false, false);
      showToast("Sample demo data loaded.");
    });
  }

  // Fire viewed analytics tracking
  trackEvent("tax_estimator_viewed");

  // Save inputs handler (calls only when persistence enabled)
  function saveInputsToLocalStorage() {
    if (isDemoOrExampleActive) return; // Prevent overwriting saved state with demo/example data!
    if (persistCheckbox && persistCheckbox.checked) {
      const stateToSave = {
        taxAmount: document.getElementById("taxAmount")?.value || "",
        dueDate: document.getElementById("dueDate")?.value || "",
        operatingCash: document.getElementById("operatingCash")?.value || "",
        taxReserve: document.getElementById("taxReserve")?.value || "",
        expectedCollections: document.getElementById("expectedCollections")?.value || "",
        monthlyOperatingExpenses: document.getElementById("monthlyOperatingExpenses")?.value || "",
        reserveWeeks: reserveWeeksSelect ? reserveWeeksSelect.value : CONFIG.DEFAULT_RESERVE_WEEKS,
        bufferPercent: bufferPercentSelect ? bufferPercentSelect.value : CONFIG.DEFAULT_PLANNING_BUFFER_PERCENT
      };
      localStorage.setItem(dataStoreKey, JSON.stringify(stateToSave));
      
      const clearBtn = document.getElementById("clearSavedBtn");
      if (clearBtn) clearBtn.style.display = "inline-flex";
    }
  }

  // Clear inputs handler
  const clearBtn = document.getElementById("clearSavedBtn");
  if (clearBtn) {
    // Hide initially unless values stored
    if (!isPersistenceOptedIn) {
      clearBtn.style.display = "none";
    }

    clearBtn.addEventListener("click", function(e) {
      e.preventDefault();
      
      // Reset inputs to empty or zeroes safely
      isDemoOrExampleActive = false;
      const elTax = document.getElementById("taxAmount");
      if (elTax) elTax.value = "";
      const elOp = document.getElementById("operatingCash");
      if (elOp) elOp.value = "";
      const elRes = document.getElementById("taxReserve");
      if (elRes) elRes.value = "";
      const elColl = document.getElementById("expectedCollections");
      if (elColl) elColl.value = "";
      const elExp = document.getElementById("monthlyOperatingExpenses");
      if (elExp) elExp.value = "";
      
      if (reserveWeeksSelect) reserveWeeksSelect.value = String(CONFIG.DEFAULT_RESERVE_WEEKS);
      if (bufferPercentSelect) bufferPercentSelect.value = String(CONFIG.DEFAULT_PLANNING_BUFFER_PERCENT);

      localStorage.removeItem(dataStoreKey);
      clearBtn.style.display = "none";
      if (persistCheckbox) {
        persistCheckbox.checked = false;
        localStorage.setItem(persistSettingKey, "false");
      }
      
      // Reset results display
      const resultsPlaceholder = document.getElementById("resultsPlaceholder");
      if (resultsPlaceholder) {
        resultsPlaceholder.style.display = "flex";
      }
      
      const resultsContainer = document.getElementById("resultsContainer");
      if (resultsContainer) {
        resultsContainer.classList.remove("active");
        resultsContainer.classList.remove("overdue", "critical", "pressured", "tight", "covered");
        resultsContainer.style.display = "none";
      }

      const mobileStickyPanel = document.getElementById("mobileStickyPanel");
      if (mobileStickyPanel) {
        mobileStickyPanel.classList.remove("active");
      }

      AppState.currentCalculations = null;
      
      trackEvent("tax_estimator_inputs_cleared");
      showToast("Calculator inputs cleared.");
      sendHeightToParent();
    });
  }

  // 5. Form Validation & Submission Interceptor
  form.addEventListener("submit", function(e) {
    e.preventDefault();
    if (validateAndCalculate()) {
      // Focus primary result heading as required by guidelines
      const resultHeading = document.getElementById("primaryDisplayValue");
      if (resultHeading) {
        resultHeading.focus();
        resultHeading.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
    }
  });

  // Attach live calculation listeners for a dynamic sheet experience
  const liveInputs = ["taxAmount", "dueDate", "operatingCash", "taxReserve", "expectedCollections", "monthlyOperatingExpenses", "reserveWeeks", "bufferPercent"];
  liveInputs.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      // Listen to both input (while typing) and change (on focus lost)
      el.addEventListener("input", function() {
        if (!AppState.hasStarted) {
          AppState.hasStarted = true;
          trackEvent("tax_estimator_started");
        }
        validateAndCalculate(true); // silent dynamic run without aggressive error focus
      });
      el.addEventListener("change", function() {
        validateAndCalculate(true);
        saveInputsToLocalStorage();
      });
    }
  });

  // On load execution block
  if (isDemoMode) {
    // Calculate immediately in demo mode, normal analytics allowed
    validateAndCalculate(true, false);
  } else if (hasRestoredState) {
    // Render result for restored inputs, but suppress completion analytics event
    validateAndCalculate(true, true);
  } else {
    // Normal blank first visit: do not call validateAndCalculate() automatically!
  }

  // 6. Primary Validation and Calculation Engine Connection
  function validateAndCalculate(isSilent = false, suppressAnalytics = false) {
    let hasError = false;

    // Retrieve input values
    const taxAmountVal = document.getElementById("taxAmount")?.value.trim() || "";
    const dueDateVal = document.getElementById("dueDate")?.value || "";
    const operatingCashVal = document.getElementById("operatingCash")?.value.trim() || "";
    const taxReserveVal = document.getElementById("taxReserve").value.trim();
    const expectedCollectionsVal = document.getElementById("expectedCollections").value.trim();
    const monthlyExpensesVal = document.getElementById("monthlyOperatingExpenses").value.trim();
    const reserveWeeksVal = reserveWeeksSelect ? reserveWeeksSelect.value : CONFIG.DEFAULT_RESERVE_WEEKS;
    const bufferPercentVal = bufferPercentSelect ? bufferPercentSelect.value : CONFIG.DEFAULT_PLANNING_BUFFER_PERCENT;

    // Inner Validation Helper
    function validateField(id, value, rules = {}) {
      const group = document.getElementById(id).closest(".form-group");
      const errorLabel = group.querySelector(".error-message");
      let message = "";

      if (rules.required && !value) {
        message = "This field is required.";
      } else if (value) {
        const num = parseFloat(value);
        if (rules.isNumeric && isNaN(num)) {
          message = "Please enter a valid number.";
        } else if (rules.nonNegative && num < 0) {
          message = "Amount cannot be negative.";
        } else if (rules.maxVal && num > rules.maxVal) {
          message = `Value exceeds max safety limit of ${formatCurrency(rules.maxVal)}.`;
        }
      }

      if (message) {
        if (!isSilent) {
          group.classList.add("has-error");
          errorLabel.textContent = message;
        }
        return false;
      } else {
        group.classList.remove("has-error");
        return true;
      }
    }

    // Run field validations
    if (!validateField("taxAmount", taxAmountVal, { required: true, isNumeric: true, nonNegative: true, maxVal: 999999999 })) hasError = true;
    if (!validateField("dueDate", dueDateVal, { required: true })) hasError = true;
    if (!validateField("operatingCash", operatingCashVal, { required: true, isNumeric: true, nonNegative: true, maxVal: 999999999 })) hasError = true;
    if (!validateField("taxReserve", taxReserveVal, { required: false, isNumeric: true, nonNegative: true, maxVal: 999999999 })) hasError = true;
    if (!validateField("expectedCollections", expectedCollectionsVal, { required: false, isNumeric: true, nonNegative: true, maxVal: 999999999 })) hasError = true;
    if (!validateField("monthlyOperatingExpenses", monthlyExpensesVal, { required: true, isNumeric: true, nonNegative: true, maxVal: 999999999 })) hasError = true;

    if (hasError) {
      sendHeightToParent();
      return false;
    }

    // Build standard inputs dictionary for engine
    const inputs = {
      taxAmount: parseFloat(taxAmountVal) || 0,
      dueDate: dueDateVal,
      operatingCash: parseFloat(operatingCashVal) || 0,
      taxReserve: parseFloat(taxReserveVal) || 0,
      expectedCollections: parseFloat(expectedCollectionsVal) || 0,
      monthlyOperatingExpenses: parseFloat(monthlyExpensesVal) || 0,
      reserveWeeks: parseFloat(reserveWeeksVal) || 0,
      bufferPercent: parseFloat(bufferPercentVal) || 0
    };

    // Trigger deterministic core calculator engine
    const results = Calculator.calculate(inputs, new Date());
    AppState.currentCalculations = results;

    // Trigger Render pipeline
    renderResults(results, suppressAnalytics);
    return true;
  }

  // 7. Results Renderer
  function renderResults(res, suppressAnalytics = false) {
    // Hide placeholder, show active results
    const resultsPlaceholder = document.getElementById("resultsPlaceholder");
    if (resultsPlaceholder) {
      resultsPlaceholder.style.display = "none";
    }
    
    const resultsContainer = document.getElementById("resultsContainer");
    if (resultsContainer) {
      resultsContainer.style.display = "block";
      resultsContainer.className = "results-container active " + res.statusId;
    }

    // Render Status Banner
    const banner = document.getElementById("statusBanner");
    if (banner) {
      banner.className = `status-banner status-${res.statusId}`;
      banner.textContent = "";
      
      const dot = document.createElement("span");
      dot.className = "status-indicator-dot";
      dot.setAttribute("aria-hidden", "true");
      
      const textSpan = document.createElement("span");
      textSpan.textContent = `Status: ${res.statusLabel}`;
      
      banner.appendChild(dot);
      banner.appendChild(textSpan);
    }

    // Display primary gap or headroom
    const displayVal = document.getElementById("primaryDisplayValue");
    const displayLabel = document.getElementById("primaryDisplayLabel");
    const displaySubLabel = document.getElementById("primaryDisplaySubLabel");

    if (displayVal) {
      if (res.minimumCapitalGap > 0) {
        displayVal.textContent = formatCurrency(res.minimumCapitalGap);
        displayVal.className = "display-value has-gap" + (res.statusId === "critical" ? " is-critical" : "");
      } else {
        displayVal.textContent = "$0 estimated gap";
        displayVal.className = "display-value no-gap";
      }
    }
    if (displayLabel) {
      displayLabel.textContent = "Estimated Capital Gap";
    }
    if (displaySubLabel) {
      if (res.minimumCapitalGap > 0) {
        displaySubLabel.textContent = `A capital shortfall is expected. Recommended funding target with ${res.inputs.bufferPercent}% planning buffer is ${formatCurrency(res.recommendedCapitalTarget)}.`;
      } else {
        displaySubLabel.textContent = `Projected cash appears sufficient to pay taxes and cover your operating reserve. Remaining estimated headroom: ${formatCurrency(res.remainingHeadroom)}.`;
      }
    }

    // Ledger Items Output helper with null guards
    const setElementText = (id, text) => {
      const el = document.getElementById(id);
      if (el) el.textContent = text;
    };

    setElementText("outTaxAmount", formatCurrency(res.inputs.taxAmount));
    setElementText("outDueDate", formatDate(res.inputs.dueDate));
    setElementText("outDaysRemaining", res.isOverdue ? "Passed (Overdue)" : `${res.daysUntilDue} days`);
    setElementText("outOpCash", formatCurrency(res.inputs.operatingCash));
    setElementText("outTaxReserve", formatCurrency(res.inputs.taxReserve));
    setElementText("outExpectedCollections", formatCurrency(res.inputs.expectedCollections));
    setElementText("outProjectedExpenses", formatCurrency(res.projectedOperatingExpenses));
    setElementText("outCashBeforeTax", formatCurrency(res.projectedCashBeforeTax));
    setElementText("outCashAfterTax", formatCurrency(res.projectedCashAfterTax));
    setElementText("outProtectedReserve", formatCurrency(res.protectedReserve));
    setElementText("outRemainingHeadroom", formatCurrency(Math.max(0, res.remainingHeadroom)));
    setElementText("outMinCapitalGap", formatCurrency(res.minimumCapitalGap));
    setElementText("outPlanningBuffer", formatCurrency(res.planningBuffer));
    setElementText("outRecCapitalTarget", formatCurrency(res.recommendedCapitalTarget));
    setElementText("outCoveragePercent", `${Math.round(res.cashCoveragePercent)}%`);

    // Plain Language Explanations Based on Status
    const explanationEl = document.getElementById("resultExplanation");
    if (explanationEl) {
      if (res.statusId === "overdue") {
        explanationEl.textContent = `The entered payment date has passed. Confirm the current balance, penalties, available payment arrangements, and next steps with the appropriate tax professional or taxing authority.`;
      } else if (res.minimumCapitalGap > 0) {
        explanationEl.textContent = `Based on the information entered, the business may need approximately ${formatCurrency(res.minimumCapitalGap)} in additional liquidity to make the ${formatCurrency(res.inputs.taxAmount)} tax payment and preserve ${res.inputs.reserveWeeks} weeks of operating reserves.`;
      } else if (res.statusId === "tight") {
        explanationEl.textContent = `The payment and selected reserve appear covered, but the remaining cash cushion is limited. A collection delay or unexpected expense could create additional pressure.`;
      } else {
        explanationEl.textContent = `Projected cash appears sufficient to make the tax payment and preserve the selected operating reserve. The remaining estimated headroom is ${formatCurrency(res.remainingHeadroom)}.`;
      }
    }

    // --- Dynamic Cash Waterfall Visualization Bar ---
    const totalAvail = res.inputs.operatingCash + res.inputs.taxReserve + res.inputs.expectedCollections;
    const totalReq = res.projectedOperatingExpenses + res.inputs.taxAmount + res.protectedReserve;
    const maxBarVal = Math.max(1, totalAvail, totalReq);

    // Get Segments
    const segAvail = document.getElementById("segAvail");
    const segRes = document.getElementById("segReserve");
    const segColl = document.getElementById("segCollections");
    const segExp = document.getElementById("segExpenses");
    const segTax = document.getElementById("segTaxPayment");
    const segProt = document.getElementById("segProtected");
    const segGap = document.getElementById("segGap");

    // Proportions
    const pctAvail = (res.inputs.operatingCash / maxBarVal) * 100;
    const pctRes = (res.inputs.taxReserve / maxBarVal) * 100;
    const pctColl = (res.inputs.expectedCollections / maxBarVal) * 100;

    const pctExp = (res.projectedOperatingExpenses / maxBarVal) * 100;
    const pctTax = (res.inputs.taxAmount / maxBarVal) * 100;
    const pctProt = (res.protectedReserve / maxBarVal) * 100;
    const pctGap = (res.minimumCapitalGap / maxBarVal) * 100;

    // Apply widths dynamically
    if (segAvail) segAvail.style.width = `${pctAvail}%`;
    if (segRes) segRes.style.width = `${pctRes}%`;
    if (segColl) segColl.style.width = `${pctColl}%`;

    if (segExp) segExp.style.width = `${pctExp}%`;
    if (segTax) segTax.style.width = `${pctTax}%`;
    if (segProt) segProt.style.width = `${pctProt}%`;
    if (segGap) segGap.style.width = `${pctGap}%`;

    // Accessible screen reader descriptions
    const screenReaderDesc = document.getElementById("waterfallScreenReaderText");
    if (screenReaderDesc) {
      screenReaderDesc.textContent = `Cash waterfall graphic summary: Total cash inflows and reserves sum to ${formatCurrency(totalAvail)}. Operating expenses, tax liability, and desired operating reserve sum to ${formatCurrency(totalReq)}. This results in an estimated capital gap of ${formatCurrency(res.minimumCapitalGap)} and remaining headroom of ${formatCurrency(Math.max(0, res.remainingHeadroom))}.`;
    }

    // 8. Update primary and sticky mobile CTA elements
    updateCTAUrls(res);

    // Track completed calculation event
    if (!suppressAnalytics) {
      trackEvent("tax_estimator_completed", {
        status_id: res.statusId,
        gap_amount: res.minimumCapitalGap,
        target_amount: res.recommendedCapitalTarget
      });
    }

    // Sync heights with iframe parents
    sendHeightToParent();
  }

  // 9. URL Construction for referral forms with parameters
  function updateCTAUrls(res) {
    const shareChecked = document.getElementById("shareEstimateDetails")?.checked || false;

    // Determine Gap & Deadline Bands
    const gapBand = getGapBand(res.minimumCapitalGap);
    const deadlineBand = getDeadlineBand(res.isOverdue, res.daysUntilDue);

    // Start with core configured referral URL
    let url;
    try {
      url = new URL(CONFIG.CTA_BASE_URL);
    } catch (e) {
      // safe fallback if invalid
      url = new URL("https://YOUR-REFERRAL-FORM-URL.example");
    }

    // Append non-sensitive attribution params
    url.searchParams.append("tool", "tax-pressure-capital-estimator");
    url.searchParams.append("result_status", res.statusLabel);
    url.searchParams.append("gap_band", gapBand);
    url.searchParams.append("deadline_band", deadlineBand);
    if (AppState.attribution.partner_id) url.searchParams.append("partner_id", AppState.attribution.partner_id);
    if (AppState.attribution.source) url.searchParams.append("source", AppState.attribution.source);
    if (AppState.attribution.campaign) url.searchParams.append("campaign", AppState.attribution.campaign);
    if (AppState.attribution.utm_source) url.searchParams.append("utm_source", AppState.attribution.utm_source);
    if (AppState.attribution.utm_medium) url.searchParams.append("utm_medium", AppState.attribution.utm_medium);
    if (AppState.attribution.utm_campaign) url.searchParams.append("utm_campaign", AppState.attribution.utm_campaign);

    // If they checked the explicit consent box to share calculations:
    if (shareChecked) {
      url.searchParams.append("tax_amount", String(res.inputs.taxAmount));
      url.searchParams.append("estimated_gap", String(res.minimumCapitalGap));
      url.searchParams.append("planning_target", String(res.recommendedCapitalTarget));
      url.searchParams.append("reserve_weeks", String(res.inputs.reserveWeeks));
      url.searchParams.append("days_until_due", String(res.daysUntilDue));
    }

    // Update main buttons
    const primaryCta = document.getElementById("primaryCtaBtn");
    if (primaryCta) {
      primaryCta.href = url.toString();
      primaryCta.textContent = CONFIG.CTA_LABEL;
    }

    const handoffCta = document.getElementById("handoffCtaBtn");
    if (handoffCta) {
      handoffCta.href = url.toString();
      handoffCta.textContent = CONFIG.CTA_LABEL;
    }

    const mobileCta = document.getElementById("mobileStickyCtaBtn");
    if (mobileCta) {
      mobileCta.href = url.toString();
      mobileCta.textContent = CONFIG.CTA_LABEL;
    }

    // Update sticky mobile bar metrics
    const stickyMobileVal = document.getElementById("mobileStickyVal");
    if (stickyMobileVal) {
      stickyMobileVal.textContent = res.minimumCapitalGap > 0 ? formatCurrency(res.minimumCapitalGap) : "$0 gap";
    }

    // Show Mobile Sticky CTA only after result completes
    const mobileStickyPanel = document.getElementById("mobileStickyPanel");
    if (mobileStickyPanel) {
      mobileStickyPanel.classList.add("active");
    }
  }

  // Re-build URLs if the "Share estimate details" checkbox toggles
  const shareCheckbox = document.getElementById("shareEstimateDetails");
  if (shareCheckbox) {
    shareCheckbox.addEventListener("change", function() {
      if (AppState.currentCalculations) {
        updateCTAUrls(AppState.currentCalculations);
        trackEvent("tax_estimator_estimate_shared", {
          shared: shareCheckbox.checked
        });
      }
    });
  }

  // Detect referral click actions for tracking
  const ctaButtons = ["primaryCtaBtn", "handoffCtaBtn", "mobileStickyCtaBtn"];
  ctaButtons.forEach(btnId => {
    const btn = document.getElementById(btnId);
    if (btn) {
      btn.addEventListener("click", function() {
        trackEvent("tax_estimator_referral_clicked", {
          button_id: btnId
        });
      });
    }
  });

  // --- Print Trigger Handling ---
  const printBtn = document.getElementById("printBtn");
  if (printBtn) {
    printBtn.addEventListener("click", function(e) {
      e.preventDefault();
      trackEvent("tax_estimator_print");
      window.print();
    });
  }

  // --- Copy Client Summary Handling ---
  const copyBtn = document.getElementById("copySummaryBtn");
  if (copyBtn) {
    copyBtn.addEventListener("click", function(e) {
      e.preventDefault();
      const res = AppState.currentCalculations;
      if (!res) return;

      const summaryLines = [
        `=== FINANCIAL LIQUIDITY ASSESSMENT ===`,
        `Tax Pressure Capital Estimator Results`,
        `Date of Assessment: ${new Date().toLocaleDateString()}`,
        `---------------------------------------`,
        `Tax Payment Due:        ${formatCurrency(res.inputs.taxAmount)}`,
        `Payment Due Date:       ${formatDate(res.inputs.dueDate)}`,
        `Days Remaining:         ${res.isOverdue ? "Overdue" : res.daysUntilDue}`,
        `Protected Operating Reserve: ${res.inputs.reserveWeeks} Weeks (${formatCurrency(res.protectedReserve)})`,
        `Projected Cash Available Before Payment: ${formatCurrency(res.projectedCashBeforeTax)}`,
        `---------------------------------------`,
        `Estimated Capital Gap:  ${formatCurrency(res.minimumCapitalGap)}`,
        `Recommended Planning Target (with ${res.inputs.bufferPercent}% buffer): ${formatCurrency(res.recommendedCapitalTarget)}`,
        `Result Status:          ${res.statusLabel}`,
        `---------------------------------------`,
        `Disclaimer: This calculator provides an educational cash-flow estimate based only on the information entered. It does not calculate tax liability and is not tax, legal, accounting, lending, or financial advice. Actual obligations, payment options, and financing costs may vary. Consult a qualified professional before making financial decisions.`,
        `Generated by ${CONFIG.BRAND_NAME}`
      ];

      const rawText = summaryLines.join("\n");

      navigator.clipboard.writeText(rawText).then(() => {
        trackEvent("tax_estimator_copy_summary");
        showToast("Summary copied to clipboard!");
      }).catch(err => {
        console.error("Clipboard copy failed", err);
        showToast("Failed to copy. Please manually highlight and copy results.");
      });
    });
  }

  // --- Dynamic FAQ Accordion Toggles ---
  const faqQuestions = document.querySelectorAll(".faq-question");
  faqQuestions.forEach(btn => {
    btn.addEventListener("click", function() {
      const item = btn.closest(".faq-item");
      const answer = item.querySelector(".faq-answer");
      const isActive = item.classList.contains("active");

      // Close other active questions (optional accordion behavior)
      document.querySelectorAll(".faq-item.active").forEach(activeItem => {
        if (activeItem !== item) {
          activeItem.classList.remove("active");
          activeItem.querySelector(".faq-answer").style.maxHeight = "0px";
        }
      });

      if (isActive) {
        item.classList.remove("active");
        answer.style.maxHeight = "0px";
      } else {
        item.classList.add("active");
        answer.style.maxHeight = answer.scrollHeight + "px";
      }

      // Sync embed height since accordion changes scroll boundaries
      setTimeout(sendHeightToParent, 300);
    });
  });

  // Track window resizing for embedded heights
  let resizeTimer;
  window.addEventListener("resize", function() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(sendHeightToParent, 150);
  });
});
