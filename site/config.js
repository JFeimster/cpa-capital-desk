/**
 * Tax Pressure Capital Estimator - Configuration
 * This file contains the default settings for the standalone calculator and embed widgets.
 * Customize these values to white-label the calculator for your firm.
 */

var CONFIG = {
  // Brand & Tool Identity
  TOOL_NAME: "Tax Pressure Capital Estimator",
  BRAND_NAME: "CPA Capital Desk",
  
  // Primary Call-To-Action (CTA) Settings
  CTA_LABEL: "Refer one tax-pressure client",
  CTA_BASE_URL: "https://YOUR-REFERRAL-FORM-URL.example", // Override this with your firm's custom referral form or scheduler
  
  // Compliance & Legal Links
  PRIVACY_POLICY_URL: "https://YOUR-REFERRAL-FORM-URL.example/privacy", // Optional: link to your privacy policy
  TERMS_URL: "https://YOUR-REFERRAL-FORM-URL.example/terms",           // Optional: link to your terms of service
  
  // Calculator Defaults
  DEMO_MODE: false,                       // Set to true to enable demonstration mode by default
  DEFAULT_RESERVE_WEEKS: 4,               // Default operating reserve (choices: 0, 2, 4, 6, 8)
  DEFAULT_PLANNING_BUFFER_PERCENT: 5,     // Default optional planning buffer (choices: 0, 5, 10, 15)
  DEFAULT_VISUAL_THEME: "dark",           // Default visual theme: "light", "dark", or "auto"
  CURRENCY_CODE: "USD",                   // Currency code (e.g. "USD", "CAD", "GBP")
  
  // Attribution Settings
  ATTRIBUTION: {
    DEFAULT_PARTNER_ID: "partner-default",
    DEFAULT_SOURCE: "cpa-calc",
    DEFAULT_CAMPAIGN: "tax-pressure-estimator"
  }
};
