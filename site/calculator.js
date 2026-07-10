/**
 * Tax Pressure Capital Estimator - Calculation Engine
 * Pure reusable functions for financial calculations.
 */

const Calculator = {
  // Constants specified by prompt
  DAYS_PER_MONTH: 30.4375,
  WEEKS_PER_MONTH: 4.345,

  /**
   * Helper to round a value up to the nearest increment (e.g. 500)
   */
  roundUpToIncrement: function(value, increment) {
    if (value <= 0) return 0;
    return Math.ceil(value / increment) * increment;
  },

  /**
   * Normalizes a date to local midnight (00:00:00.000)
   */
  normalizeToMidnight: function(dateInput) {
    if (!dateInput) return null;
    const date = new Date(dateInput);
    if (isNaN(date.getTime())) return null;
    date.setHours(0, 0, 0, 0);
    return date;
  },

  /**
   * Computes days until due, safely handling timezones and rounding
   */
  getDaysUntilDue: function(dueDate, currentLocalDate) {
    const due = this.normalizeToMidnight(dueDate);
    const current = this.normalizeToMidnight(currentLocalDate);
    if (!due || !current) return 0;

    const millisecondsPerDay = 24 * 60 * 60 * 1000;
    // Calculate difference and ceil to get integer days
    return Math.max(0, Math.ceil((due.getTime() - current.getTime()) / millisecondsPerDay));
  },

  /**
   * Checks if the tax payment is overdue
   */
  checkIsOverdue: function(dueDate, currentLocalDate) {
    const due = this.normalizeToMidnight(dueDate);
    const current = this.normalizeToMidnight(currentLocalDate);
    if (!due || !current) return false;
    return due.getTime() < current.getTime();
  },

  /**
   * Runs the complete set of financial calculations
   */
  calculate: function(inputs, currentLocalDate) {
    // Current date default to now if not provided
    const currentDate = currentLocalDate ? new Date(currentLocalDate) : new Date();

    // Parse and sanitize inputs (ensure numbers, default to 0)
    const taxAmount = Math.max(0, parseFloat(inputs.taxAmount) || 0);
    const operatingCash = Math.max(0, parseFloat(inputs.operatingCash) || 0);
    const taxReserve = Math.max(0, parseFloat(inputs.taxReserve) || 0);
    const expectedCollections = Math.max(0, parseFloat(inputs.expectedCollections) || 0);
    const monthlyOperatingExpenses = Math.max(0, parseFloat(inputs.monthlyOperatingExpenses) || 0);
    const reserveWeeks = Math.max(0, parseFloat(inputs.reserveWeeks) || 0);
    const bufferPercent = Math.max(0, parseFloat(inputs.bufferPercent) || 0);
    const dueDate = inputs.dueDate;

    // Time calculations
    const daysUntilDue = this.getDaysUntilDue(dueDate, currentDate);
    const isOverdue = this.checkIsOverdue(dueDate, currentDate);

    // 1. Projected operating expenses before due date
    const projectedOperatingExpenses = monthlyOperatingExpenses * (daysUntilDue / this.DAYS_PER_MONTH);

    // 2. Protected reserve
    const protectedReserve = monthlyOperatingExpenses * (reserveWeeks / this.WEEKS_PER_MONTH);

    // 3. Projected cash before tax payment
    const projectedCashBeforeTax = operatingCash + taxReserve + expectedCollections - projectedOperatingExpenses;

    // 4. Projected cash after tax payment
    const projectedCashAfterTax = projectedCashBeforeTax - taxAmount;

    // 5. Minimum Capital Gap
    const minimumCapitalGap = Math.max(0, taxAmount + protectedReserve - projectedCashBeforeTax);

    // 6. Planning Buffer
    const planningBuffer = minimumCapitalGap * (bufferPercent / 100);

    // 7. Recommended Capital Target (and rounded to nearest $500)
    const rawRecommendedTarget = minimumCapitalGap + planningBuffer;
    const recommendedCapitalTarget = this.roundUpToIncrement(rawRecommendedTarget, 500);

    // 8. Remaining Headroom
    const remainingHeadroom = projectedCashBeforeTax - taxAmount - protectedReserve;

    // 9. Cash Coverage Percentage
    const requiredLiquidity = taxAmount + protectedReserve;
    let cashCoveragePercent = 0;
    if (requiredLiquidity > 0) {
      cashCoveragePercent = (projectedCashBeforeTax / requiredLiquidity) * 100;
    } else {
      cashCoveragePercent = 100; // Complete coverage if no liquidity required
    }
    // Safe normalization to prevent negative, NaN, or Infinity
    if (isNaN(cashCoveragePercent) || !isFinite(cashCoveragePercent)) {
      cashCoveragePercent = 0;
    }
    cashCoveragePercent = Math.max(0, cashCoveragePercent);

    // 10. Result Status and Label Logic
    let statusId = "covered";
    let statusLabel = "Projected cash appears sufficient";

    if (isOverdue) {
      statusId = "overdue";
      statusLabel = "Payment date passed";
    } else if (minimumCapitalGap > 0) {
      if (daysUntilDue <= 14 || projectedCashBeforeTax < 0) {
        statusId = "critical";
        statusLabel = "Critical cash pressure";
      } else {
        statusId = "pressured";
        statusLabel = "Capital gap identified";
      }
    } else {
      // minimumCapitalGap is 0
      const tightThreshold = monthlyOperatingExpenses * 0.25;
      if (remainingHeadroom < tightThreshold) {
        statusId = "tight";
        statusLabel = "Covered, but tight";
      } else {
        statusId = "covered";
        statusLabel = "Projected cash appears sufficient";
      }
    }

    // Return the calculated state
    return {
      inputs: {
        taxAmount,
        dueDate,
        operatingCash,
        taxReserve,
        expectedCollections,
        monthlyOperatingExpenses,
        reserveWeeks,
        bufferPercent
      },
      daysUntilDue,
      isOverdue,
      projectedOperatingExpenses,
      protectedReserve,
      projectedCashBeforeTax,
      projectedCashAfterTax,
      minimumCapitalGap,
      planningBuffer,
      recommendedCapitalTarget,
      remainingHeadroom,
      cashCoveragePercent,
      statusId,
      statusLabel
    };
  }
};
