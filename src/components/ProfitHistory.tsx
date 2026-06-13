import React, { useState, useEffect, useMemo } from 'react';
import { StockHolding } from '../types';
import { formatCLP } from '../utils';
import { portafolioDB, PriceHistoryRecord } from '../db';

interface ProfitHistoryProps {
  holdings: StockHolding[];
}

type DateFilter = 'month' | 'year' | 'custom';

interface PnLEntry {
  date: string;
  portfolioValue: number;
  dailyPnL: number;
  dailyPnLPct: number;
}

function getChileDateStr(date?: Date): string {
  const d = date || new Date();
  return d.toLocaleDateString('en-CA', { timeZone: 'America/Santiago' });
}

function getMonday(d: Date): Date {
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const m = new Date(d);
  m.setDate(diff);
  return m;
}

function getFirstOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function getFirstOfYear(d: Date): Date {
  return new Date(d.getFullYear(), 0, 1);
}

export default function ProfitHistory({ holdings }: ProfitHistoryProps) {
  const [filter, setFilter] = useState<DateFilter>('month');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [entries, setEntries] = useState<PnLEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const today = getChileDateStr();

  const uniqueTickers = useMemo(() => {
    const seen = new Set<string>();
    const tickers: string[] = [];
    for (const h of holdings) {
      if (!seen.has(h.ticker)) {
        seen.add(h.ticker);
        tickers.push(h.ticker);
      }
    }
    return tickers.sort();
  }, [holdings]);

  useEffect(() => {
    if (uniqueTickers.length === 0) {
      setEntries([]);
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    async function load() {
      setIsLoading(true);

      // Check cache hit per ticker
      const tickersToFetch: string[] = [];
      const cachedData = new Map<string, PriceHistoryRecord[]>();

      for (const t of uniqueTickers) {
        const cached = await portafolioDB.getPriceHistory(t);
        if (cached.length > 0) {
          cachedData.set(t, cached);
        } else {
          tickersToFetch.push(t);
        }
      }

      // Fetch missing tickers from API
      if (tickersToFetch.length > 0) {
        try {
          const res = await fetch(`/api/portfolio-history?tickers=${encodeURIComponent(tickersToFetch.join(','))}`);
          if (res.ok) {
            const data: { ticker: string; history: { date: string; close: number }[] }[] = await res.json();
            for (const item of data) {
              if (item.history.length === 0) continue;
              const records: PriceHistoryRecord[] = item.history.map(h => ({
                ticker_date: `${item.ticker}_${h.date}`,
                ticker: item.ticker,
                date: h.date,
                close: h.close,
              }));
              cachedData.set(item.ticker, records);
              portafolioDB.savePriceHistory(records);
            }
          }
        } catch (err) {
          console.warn('Error fetching price history:', err);
        }
      }

      if (cancelled) return;

      // Determine date range based on filter
      const now = new Date();
      let start: Date;
      let end = now;

      switch (filter) {
        case 'month':
          start = getFirstOfMonth(now);
          break;
        case 'year':
          start = getFirstOfYear(now);
          break;
        case 'custom':
          start = customStart ? new Date(customStart + 'T12:00:00') : getFirstOfMonth(now);
          end = customEnd ? new Date(customEnd + 'T12:00:00') : now;
          break;
        default:
          start = getFirstOfMonth(now);
      }

      const startStr = start.toLocaleDateString('en-CA', { timeZone: 'America/Santiago' });
      const endStr = end.toLocaleDateString('en-CA', { timeZone: 'America/Santiago' });

      // Build date→close map per ticker
      const tickerPrices = new Map<string, Map<string, number>>();
      for (const [ticker, records] of cachedData) {
        const dateMap = new Map<string, number>();
        for (const r of records) {
          dateMap.set(r.date, r.close);
        }
        tickerPrices.set(ticker, dateMap);
      }

      // Collect all dates that have prices for ANY ticker in the range
      const allDates = new Set<string>();
      for (const [, dateMap] of tickerPrices) {
        for (const date of dateMap.keys()) {
          if (date >= startStr && date <= endStr) {
            allDates.add(date);
          }
        }
      }
      const sortedDates = Array.from(allDates).sort();

      if (sortedDates.length === 0) {
        setEntries([]);
        setIsLoading(false);
        return;
      }

      // Helper: closest date strictly before `target` in a sorted date array
      function prevDateStr(dates: string[], target: string): string | null {
        for (let i = dates.length - 1; i >= 0; i--) {
          if (dates[i] < target) return dates[i];
        }
        return null;
      }

      // Compute portfolio value at the close before the first date (initial value)
      // Only for holdings already owned before the period
      const firstDate = sortedDates[0];
      let initialPortfolioValue = 0;
      const holdingsAccounted = new Set<string>();
      for (const h of holdings) {
        if (h.buyDate >= firstDate) continue;
        holdingsAccounted.add(h.id);
        const priceMap = tickerPrices.get(h.ticker);
        if (!priceMap) continue;
        const tickerDates = Array.from(priceMap.keys()).sort();
        const prevDate = prevDateStr(tickerDates, firstDate);
        if (prevDate) {
          const close = priceMap.get(prevDate);
          if (close && close > 0) initialPortfolioValue += h.shares * close;
        }
      }

      // Build a portfolio snapshot per date (skip empty dates)
      const pnlEntries: PnLEntry[] = [];
      let prevValue = initialPortfolioValue;

      for (const date of sortedDates) {
        let portfolioValue = 0;
        for (const h of holdings) {
          if (h.buyDate > date) continue;
          const priceMap = tickerPrices.get(h.ticker);
          if (!priceMap) continue;
          const close = priceMap.get(date);
          if (close == null || close <= 0) continue;
          portfolioValue += h.shares * close;
        }

        // Skip dates where no holding contributed value (don't update prevValue)
        if (portfolioValue === 0) continue;

        // Add buyPrice for holdings that appear for the first time today
        let newBasis = 0;
        for (const h of holdings) {
          if (holdingsAccounted.has(h.id)) continue;
          if (h.buyDate > date) continue;
          newBasis += h.shares * h.buyPrice;
          holdingsAccounted.add(h.id);
        }

        const adjustedPrev = prevValue + newBasis;
        const dailyPnL = portfolioValue - adjustedPrev;
        const dailyPnLPct = adjustedPrev > 0 ? (dailyPnL / adjustedPrev) * 100 : 0;

        pnlEntries.push({
          date,
          portfolioValue: Math.round(portfolioValue),
          dailyPnL: Math.round(dailyPnL),
          dailyPnLPct: Math.round(dailyPnLPct * 100) / 100,
        });

        prevValue = portfolioValue;
      }

      if (!cancelled) {
        setEntries(pnlEntries);
        setIsLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [uniqueTickers, filter, customStart, customEnd]);

  const totalPnL = entries.length > 0
    ? entries[entries.length - 1].portfolioValue - entries[0].portfolioValue + entries[0].dailyPnL
    : 0;
  const initialValue = entries.length > 0 ? entries[0].portfolioValue - entries[0].dailyPnL : 0;
  const totalPnLPct = initialValue > 0 ? (totalPnL / initialValue) * 100 : null;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="p-5 border-b border-slate-100">
        <h2 className="text-lg font-extrabold text-slate-900">Historial de Ganancias y Pérdidas</h2>
        <p className="text-xs text-slate-500 mt-1">Rendimiento diario desde la primera inversión</p>
      </div>

      {/* Filter bar */}
      <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/50 flex flex-wrap items-center gap-2">
        {(['month', 'year', 'custom'] as DateFilter[]).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer ${
              filter === f
                ? 'bg-teal-500 text-white shadow-sm'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
            }`}
          >
            {f === 'month' ? 'Mes' : f === 'year' ? 'Año' : 'Personalizado'}
          </button>
        ))}
        {filter === 'custom' && (
          <div className="flex items-center gap-2 ml-2">
            <input
              type="date"
              value={customStart}
              max={today}
              onChange={e => setCustomStart(e.target.value)}
              className="text-xs border border-slate-200 rounded-lg px-2 py-1.5"
            />
            <span className="text-xs text-slate-400">→</span>
            <input
              type="date"
              value={customEnd}
              max={today}
              onChange={e => setCustomEnd(e.target.value)}
              className="text-xs border border-slate-200 rounded-lg px-2 py-1.5"
            />
          </div>
        )}
      </div>

      {/* Summary */}
      {entries.length > 0 && (
        <div className="px-5 py-3 border-b border-slate-100 flex gap-6 text-sm">
          <div>
            <span className="text-slate-500 text-xs">Ganancia/Pérdida Total</span>
            <span className={`block text-lg font-extrabold font-mono ${totalPnL >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              {totalPnL >= 0 ? '+' : ''}{formatCLP(totalPnL)}
            </span>
          </div>
          <div>
            <span className="text-slate-500 text-xs">Rendimiento Total</span>
            <span className={`block text-lg font-extrabold font-mono ${totalPnLPct == null ? 'text-slate-400' : totalPnLPct >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              {totalPnLPct != null ? `${totalPnLPct >= 0 ? '+' : ''}${totalPnLPct.toFixed(2)}%` : '—'}
            </span>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-y-auto max-h-[500px]">
        {isLoading ? (
          <div className="flex justify-center items-center py-16">
            <div className="w-8 h-8 border-4 border-slate-900 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : entries.length === 0 ? (
          <div className="text-center py-16 text-slate-400 text-sm">
            {uniqueTickers.length === 0
              ? 'Agrega acciones a tu portafolio para ver el historial.'
              : 'No hay datos de precios históricos para las fechas seleccionadas.'}
          </div>
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider sticky top-0">
                <th className="text-left py-3 px-4">Fecha</th>
                <th className="text-right py-3 px-4">Valor Cartera</th>
                <th className="text-right py-3 px-4">Cambio Diario</th>
                <th className="text-right py-3 px-4">Cambio %</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e, i) => {
                const [y, m, d] = e.date.split('-');
                const formattedDate = `${d}/${m}/${y}`;
                return (
                  <tr key={e.date} className={`border-t border-slate-100 hover:bg-slate-50/50 ${i === entries.length - 1 ? 'font-bold bg-slate-50/80' : ''}`}>
                    <td className="py-2.5 px-4 text-slate-700 font-mono">{formattedDate}</td>
                    <td className="py-2.5 px-4 text-right font-mono text-slate-900">{formatCLP(e.portfolioValue)}</td>
                    <td className={`py-2.5 px-4 text-right font-mono ${e.dailyPnL >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {e.dailyPnL >= 0 ? '+' : ''}{formatCLP(e.dailyPnL)}
                    </td>
                    <td className={`py-2.5 px-4 text-right font-mono ${e.dailyPnLPct >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {e.dailyPnLPct >= 0 ? '+' : ''}{e.dailyPnLPct.toFixed(2)}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
