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

/**
 * Normalizes a ticker by removing accents/diacritics and trimming
 * Prevents duplicates like HABITAT vs HÁBITAT
 */
export function normalizeTicker(ticker: string): string {
  return ticker.trim().toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

/**
 * Returns whether the Bolsa de Santiago is currently open for trading.
 * Normal rueda: 09:30 - 15:30, subasta de cierre: 15:30 - 16:00.
 * Closed on weekends.
 */
export function isMarketOpen(): boolean {
  const now = new Date();
  const chileOffset = getChileOffset(now);
  const chile = new Date(now.getTime() + chileOffset);
  const day = chile.getUTCDay();
  const hours = chile.getUTCHours();
  const minutes = chile.getUTCMinutes();
  const totalMinutes = hours * 60 + minutes;

  // Weekends
  if (day === 0 || day === 6) return false;
  // Open 09:30 - 16:00
  return totalMinutes >= 570 && totalMinutes < 960;
}

function getChileOffset(date: Date): number {
  const formatter = new Intl.DateTimeFormat('en', {
    timeZone: 'America/Santiago',
    hour: 'numeric',
    hourCycle: 'h23',
  });
  const parts = formatter.formatToParts(date);
  const hour = parseInt(parts.find(p => p.type === 'hour')!.value, 10);
  const utcHour = date.getUTCHours();
  let diff = hour - utcHour;
  if (diff > 12) diff -= 24;
  if (diff < -12) diff += 24;
  return diff * 60 * 60 * 1000;
}
