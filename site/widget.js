/**
 * Tax Pressure Capital Estimator - Zero-Dependency Embed Loader
 * Self-resolving, supports multiple widget instances on a single page,
 * and handles secure postMessage iframe resizing dynamically.
 */

(function() {
  // Avoid duplicate execution
  if (window.__TaxPressureEstimatorLoaded) return;
  window.__TaxPressureEstimatorLoaded = true;

  // 1. Resolve current script element & derive base hosting URL
  const currentScript = document.currentScript || (function() {
    const scripts = document.getElementsByTagName("script");
    // Search for our specific loader script
    for (let i = scripts.length - 1; i >= 0; i--) {
      if (scripts[i].src && scripts[i].src.indexOf("widget.js") !== -1) {
        return scripts[i];
      }
    }
    return scripts[scripts.length - 1];
  })();

  const scriptSrc = currentScript ? currentScript.src : "";
  let baseFolderUrl = "";
  if (scriptSrc) {
    baseFolderUrl = scriptSrc.substring(0, scriptSrc.lastIndexOf("/"));
  } else {
    // Ultimate fallback if unable to resolve
    baseFolderUrl = window.location.origin;
  }

  // 2. Locate container target element and inject iframe
  function initWidget(scriptEl) {
    if (!scriptEl) return;
    
    // Read user configuration from data-attributes
    const targetId = scriptEl.getAttribute("data-target") || "tax-pressure-estimator";
    const partnerId = scriptEl.getAttribute("data-partner-id") || "";
    const source = scriptEl.getAttribute("data-source") || "";
    const campaign = scriptEl.getAttribute("data-campaign") || "";
    const theme = scriptEl.getAttribute("data-theme") || "light";
    const ctaUrl = scriptEl.getAttribute("data-cta-url") || "";
    const partnerName = scriptEl.getAttribute("data-partner-name") || "";
    const accent = scriptEl.getAttribute("data-accent") || "";
    const persist = scriptEl.getAttribute("data-persist") || "";

    const targetContainer = document.getElementById(targetId);
    if (!targetContainer) {
      console.warn(`Tax Pressure Estimator Container with ID '${targetId}' was not found in the DOM.`);
      return;
    }

    // Build URL search parameters for safe transmission to the iframe
    const queryParams = new URLSearchParams();
    queryParams.append("embed", "true");
    if (partnerId) queryParams.append("partner_id", partnerId);
    if (source) queryParams.append("source", source);
    if (campaign) queryParams.append("campaign", campaign);
    if (theme) queryParams.append("theme", theme);
    if (ctaUrl) queryParams.append("cta_url", ctaUrl);
    if (partnerName) queryParams.append("partner_name", partnerName);
    if (accent) queryParams.append("accent", accent);
    if (persist) queryParams.append("persist", persist);

    // Build absolute path to embed.html relative to this script
    const iframeSrc = `${baseFolderUrl}/embed.html?${queryParams.toString()}`;

    // Create the iframe element
    const iframe = document.createElement("iframe");
    iframe.src = iframeSrc;
    iframe.title = "Tax Pressure Capital Estimator Planning Tool";
    iframe.style.width = "100%";
    iframe.style.height = "500px"; // default starting height
    iframe.style.border = "none";
    iframe.style.overflow = "hidden";
    iframe.style.display = "block";
    iframe.setAttribute("scrolling", "no");
    iframe.setAttribute("loading", "lazy");

    // Add safe CSS fallback wrapper in case iframe breaks
    const fallbackLink = document.createElement("a");
    fallbackLink.href = `${baseFolderUrl}/index.html?${queryParams.toString()}`;
    fallbackLink.target = "_blank";
    fallbackLink.textContent = "Open Tax Pressure Capital Estimator in new window";
    fallbackLink.style.display = "none"; // hidden unless error loading
    
    // Mount widget elements to target
    targetContainer.innerHTML = ""; // clear any pre-existing placeholders
    targetContainer.appendChild(iframe);
    targetContainer.appendChild(fallbackLink);

    // Error boundary fallback
    iframe.onerror = function() {
      iframe.style.display = "none";
      fallbackLink.style.display = "block";
    };
  }

  // Run initialization for current script target configuration
  if (currentScript) {
    initWidget(currentScript);
  }

  // 3. Setup dynamic window message height listener
  window.addEventListener("message", function(event) {
    // Security & Data validation checks
    if (!event.data || event.data.type !== "resize-iframe") return;

    const targetHeight = parseInt(event.data.height, 10);
    if (isNaN(targetHeight)) return;

    // Scan all iframes on the current page to find the match that sent the message
    const iframes = document.getElementsByTagName("iframe");
    for (let i = 0; i < iframes.length; i++) {
      if (iframes[i].contentWindow === event.source) {
        // Safe resize height allocation
        iframes[i].style.height = `${targetHeight}px`;
        break;
      }
    }
  });

})();
