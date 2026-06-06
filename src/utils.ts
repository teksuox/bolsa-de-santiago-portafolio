/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Formats a number as Chilean Peso (CLP)
 * Chilean Peso normally has no decimals for total values, 
 * but stock prices can have cents or decimals for precision.
 */
export function formatCLP(value: number, forceDecimals: boolean = false): string {
  const hasDecimals = forceDecimals || (value % 1 !== 0 && value < 1000);
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    minimumFractionDigits: hasDecimals ? 2 : 0,
    maximumFractionDigits: hasDecimals ? 2 : 0,
  }).format(value);
}

/**
 * Formats percentage
 */
export function formatPercent(value: number): string {
  return new Intl.NumberFormat('es-CL', {
    style: 'percent',
    minimumFractionDigits: 1,
    maximumFractionDigits: 2,
  }).format(value / 100);
}

/**
 * Safely parses a date string into a user-friendly Chilean format (DD/MM/YYYY)
 */
export function formatDateChilean(dateString: string): string {
  if (!dateString) return '';
  const parts = dateString.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateString;
}
