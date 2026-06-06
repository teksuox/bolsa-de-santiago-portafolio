import { MarketStock } from '../types';

export interface HistoryPoint {
  date: string; // YYYY-MM-DD
  price: number;
}

// Simple seeded PRNG to ensure the stock charts are deterministic and consistent
function createSeededRandom(seedString: string) {
  let h = 13217;
  for (let i = 0; i < seedString.length; i++) {
    h = Math.imul(h ^ seedString.charCodeAt(i), 2654435761);
  }
  return function() {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

/**
 * Generates deterministic historical price data for a stock for the last 3 years.
 * Today is the last point, holding today's actual price.
 */
export function generateStockHistory(stock: MarketStock, daysCount: number = 1095): HistoryPoint[] {
  const points: HistoryPoint[] = [];
  const rand = createSeededRandom(stock.ticker);
  
  // Decide a general drift (some stocks grow, some shrink) based on the seed
  const drift = (rand() - 0.46) * 0.0004; // Slight positive/negative trend per day
  const volatility = 0.012 + rand() * 0.018; // 1.2% to 3.0% daily volatility

  let currentPrice = stock.price;
  const today = new Date();
  
  // Create history going backwards
  for (let i = 0; i < daysCount; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    
    // Push the current price for this date
    points.push({
      date: dateStr,
      price: Math.max(1, Math.round(currentPrice))
    });
    
    // Calculate the previous day's price
    let dailyChange;
    if (i === 0) {
      dailyChange = stock.changePercent / 100;
    } else {
      // Seeded random walk return with mean drift
      // Box-Muller transform for normal distribution approximation
      const u1 = rand() || 0.0001;
      const u2 = rand() || 0.0001;
      const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
      dailyChange = drift + volatility * z0;
    }
    
    // Move backwards in time: price_{t-1} = price_t / (1 + dailyChange)
    currentPrice = currentPrice / (1 + dailyChange);
  }
  
  // Return chronology in ascending order (past to present)
  return points.reverse();
}

/**
 * Utility to find the price point in the list closest to a given target date.
 */
export function getPriceOnOrClosestTo(history: HistoryPoint[], targetDate: string): HistoryPoint {
  // If exact match exists
  const exact = history.find(p => p.date === targetDate);
  if (exact) return exact;

  // Otherwise find the closest in absolute time
  const targetTime = new Date(targetDate).getTime();
  let closest = history[0];
  let minDiff = Math.abs(new Date(closest.date).getTime() - targetTime);

  for (let i = 1; i < history.length; i++) {
    const diff = Math.abs(new Date(history[i].date).getTime() - targetTime);
    if (diff < minDiff) {
      minDiff = diff;
      closest = history[i];
    }
  }

  return closest;
}
