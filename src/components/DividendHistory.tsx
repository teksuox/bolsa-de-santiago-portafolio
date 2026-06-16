import React, { useState, useMemo } from 'react';
import { DividendPayment } from '../types';
import { formatCLP } from '../utils';

interface DividendHistoryProps {
  dividends: DividendPayment[];
}

type DateFilter = 'month' | 'year' | 'custom';

function getChileDateStr(date?: Date): string {
  const d = date || new Date();
  return d.toLocaleDateString('en-CA', { timeZone: 'America/Santiago' });
}

function getFirstOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function getFirstOfYear(d: Date): Date {
  return new Date(d.getFullYear(), 0, 1);
}

interface DividendEntry {
  date: string;
  ticker: string;
  amountPerShare: number;
  sharesCount: number;
  totalAmount: number;
  id: string;
}

export default function DividendHistory({ dividends }: DividendHistoryProps) {
  const [filter, setFilter] = useState<DateFilter>('month');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  const today = getChileDateStr();

  const received = useMemo(() =>
    dividends.filter(d => d.received),
  [dividends]);

  const entries = useMemo(() => {
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

    return received
      .filter(d => d.payoutDate >= startStr && d.payoutDate <= endStr)
      .sort((a, b) => a.payoutDate.localeCompare(b.payoutDate))
      .map(d => ({
        date: d.payoutDate,
        ticker: d.ticker,
        amountPerShare: d.amountPerShare,
        sharesCount: d.sharesCount,
        totalAmount: d.totalAmount,
        id: d.id,
      }));
  }, [received, filter, customStart, customEnd]);

  const totalReceived = entries.reduce((s, e) => s + e.totalAmount, 0);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="p-5 border-b border-slate-100">
        <h2 className="text-lg font-extrabold text-slate-900">Historial de Dividendos Percibidos</h2>
        <p className="text-xs text-slate-500 mt-1">Pagos de dividendos ya recibidos, ordenados por fecha</p>
      </div>

      {/* Summary */}
      {entries.length > 0 && (
        <div className="px-5 py-3 border-b border-slate-100 flex gap-6 text-sm">
          <div>
            <span className="text-slate-500 text-xs">Total Percibido</span>
            <span className="block text-lg font-extrabold font-mono text-emerald-600">{formatCLP(totalReceived)}</span>
          </div>
          <div>
            <span className="text-slate-500 text-xs">Cantidad de Pagos</span>
            <span className="block text-lg font-extrabold font-mono text-slate-900">{entries.length}</span>
          </div>
        </div>
      )}

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

      {/* Table */}
      <div className="overflow-y-auto max-h-[500px]">
        {entries.length === 0 ? (
          <div className="text-center py-16 text-slate-400 text-sm">
            {received.length === 0
              ? 'No hay dividendos recibidos registrados.'
              : 'No se recibieron dividendos en el período seleccionado.'}
          </div>
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider sticky top-0">
                <th className="text-left py-3 px-4">Fecha</th>
                <th className="text-left py-3 px-4">Ticker</th>
                <th className="text-right py-3 px-4">$/Acción</th>
                <th className="text-right py-3 px-4">Accs.</th>
                <th className="text-right py-3 px-4">Total</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e, i) => {
                const [y, m, day] = e.date.split('-');
                const formattedDate = `${day}/${m}/${y}`;
                return (
                  <tr key={e.id} className={`border-t border-slate-100 hover:bg-slate-50/50 ${i === entries.length - 1 ? 'font-bold bg-slate-50/80' : ''}`}>
                    <td className="py-2.5 px-4 text-slate-700 font-mono">{formattedDate}</td>
                    <td className="py-2.5 px-4 font-semibold text-slate-900">{e.ticker}</td>
                    <td className="py-2.5 px-4 text-right font-mono text-slate-700">{formatCLP(e.amountPerShare, true)}</td>
                    <td className="py-2.5 px-4 text-right font-mono text-slate-700">{e.sharesCount.toLocaleString('es-CL')}</td>
                    <td className="py-2.5 px-4 text-right font-mono text-emerald-600">{formatCLP(e.totalAmount)}</td>
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
