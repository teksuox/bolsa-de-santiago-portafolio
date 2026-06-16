import React, { useState } from 'react';
import { StockHolding, DividendPayment } from '../types';
import ProfitHistory from './ProfitHistory';
import DividendHistory from './DividendHistory';

interface HistoryPageProps {
  holdings: StockHolding[];
  dividends: DividendPayment[];
  todayPnL?: number;
}

type SubTab = 'pnl' | 'dividends';

export default function HistoryPage({ holdings, dividends, todayPnL }: HistoryPageProps) {
  const [subTab, setSubTab] = useState<SubTab>('pnl');

  return (
    <div className="space-y-4">
      {/* Sub-tabs */}
      <div className="flex items-center gap-1 bg-white rounded-xl border border-slate-200 p-1 shadow-sm">
        <button
          onClick={() => setSubTab('pnl')}
          className={`flex-1 px-4 py-2 text-xs font-bold rounded-lg transition cursor-pointer ${
            subTab === 'pnl'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          Ganancias y Pérdidas
        </button>
        <button
          onClick={() => setSubTab('dividends')}
          className={`flex-1 px-4 py-2 text-xs font-bold rounded-lg transition cursor-pointer ${
            subTab === 'dividends'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          Dividendos
        </button>
      </div>

      {/* Content */}
      {subTab === 'pnl' ? (
        <ProfitHistory holdings={holdings} todayPnL={todayPnL} />
      ) : (
        <DividendHistory dividends={dividends} />
      )}
    </div>
  );
}
