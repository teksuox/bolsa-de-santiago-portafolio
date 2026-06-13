/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { DividendPayment, StockHolding } from '../types';
import { formatCLP, formatDateChilean } from '../utils';
import { useSortable } from '../lib/useSortable';
import { 
  Calendar, 
  PlusCircle, 
  Trash2, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  Layers, 
  ChevronLeft, 
  ChevronRight, 
  TrendingUp, 
  DollarSign,
  Edit2,
  Check,
  X
} from 'lucide-react';

interface DividendTrackerProps {
  dividends: DividendPayment[];
  onAddDividend: (dividend: Omit<DividendPayment, 'id'>) => void;
  onUpdateDividend?: (id: string, updates: Partial<DividendPayment>) => void;
  onToggleReceived: (id: string) => void;
  onDeleteDividend: (id: string) => void;
  holdings: StockHolding[];
  onSyncDividends?: () => void;
  isSyncing?: boolean;
}

const MONTH_NAMES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
];

const WEEK_DAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

export default function DividendTracker({
  dividends,
  onAddDividend,
  onUpdateDividend,
  onToggleReceived,
  onDeleteDividend,
  holdings,
  onSyncDividends,
  isSyncing = false
}: DividendTrackerProps) {
  const [ticker, setTicker] = useState(holdings[0]?.ticker || 'CHILE');
  const [amountPerShare, setAmountPerShare] = useState<number | ''>('');
  const [payoutDate, setPayoutDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [cutoffDate, setCutoffDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [received, setReceived] = useState(true);

  const [formOpen, setFormOpen] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<'list' | 'calendar'>('list');
  
  // Calendar View State
  const [currentMonth, setCurrentMonth] = useState(() => new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(() => new Date().getFullYear());

  // Edit state
  const [editDivId, setEditDivId] = useState<string | null>(null);
  const [editAmountPerShare, setEditAmountPerShare] = useState<number | ''>('');
  const [editPayoutDate, setEditPayoutDate] = useState('');
  const [editCutoffDate, setEditCutoffDate] = useState('');
  const [editReceived, setEditReceived] = useState(false);

  const startEdit = (div: DividendPayment) => {
    setEditDivId(div.id);
    setEditAmountPerShare(div.amountPerShare);
    setEditPayoutDate(div.payoutDate);
    setEditCutoffDate(div.cutoffDate || '');
    setEditReceived(div.received);
  };

  const saveEdit = () => {
    if (!editDivId || !editAmountPerShare || editAmountPerShare <= 0) return;
    const original = dividends.find(d => d.id === editDivId);
    if (!original) return;
    const amt = Number(editAmountPerShare);
    const sharesCount = calcSharesAtDate(original.ticker, editCutoffDate || original.cutoffDate || '');
    onUpdateDividend?.(editDivId, {
      amountPerShare: amt,
      sharesCount,
      totalAmount: sharesCount * amt,
      payoutDate: editPayoutDate,
      cutoffDate: editCutoffDate || undefined,
      received: editReceived,
      estimated: false,
    });
    setEditDivId(null);
  };

  const cancelEdit = () => setEditDivId(null);

  // Sync ticker with holdings if holdings load later
  React.useEffect(() => {
    if (holdings.length > 0 && !holdings.some(h => h.ticker === ticker)) {
      setTicker(holdings[0].ticker);
    }
  }, [holdings, ticker]);

  const calcSharesAtDate = (t: string, dateStr: string) => {
    const cutoff = dateStr || '9999-12-31';
    return holdings
      .filter(h => h.ticker === t && h.buyDate <= cutoff)
      .reduce((sum, h) => sum + h.shares, 0);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amountPerShare || amountPerShare <= 0) return alert('Ingresa un monto por acción válido');

    const sharesCount = calcSharesAtDate(ticker, cutoffDate) || 1000;

    onAddDividend({
      ticker: ticker,
      sharesCount: sharesCount,
      amountPerShare: Number(amountPerShare),
      totalAmount: sharesCount * Number(amountPerShare),
      payoutDate: payoutDate,
      cutoffDate: cutoffDate,
      received: received,
      estimated: false
    });

    setAmountPerShare('');
    setFormOpen(false);
  };

  const totalReceived = dividends.filter(d => d.received).reduce((sum, d) => sum + d.totalAmount, 0);
  const totalUpcoming = dividends.filter(d => !d.received).reduce((sum, d) => sum + d.totalAmount, 0);

  // Month navigation
  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(prev => prev - 1);
    } else {
      setCurrentMonth(prev => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(prev => prev + 1);
    } else {
      setCurrentMonth(prev => prev + 1);
    }
  };

  // Helper: Get dividends paying on a specific date (day checking)
  const getDividendsForDay = (dayNum: number) => {
    return dividends.filter(d => {
      const parts = d.payoutDate.split('-');
      if (parts.length !== 3) return false;
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10) - 1;
      const dVal = parseInt(parts[2], 10);
      return y === currentYear && m === currentMonth && dVal === dayNum;
    });
  };

  // Sums (Monthly and Yearly)
  const dividendsInSelectedYear = dividends.filter(d => {
    const parts = d.payoutDate.split('-');
    return parts.length === 3 && parseInt(parts[0], 10) === currentYear;
  });

  const dividendsInSelectedMonth = dividendsInSelectedYear.filter(d => {
    const parts = d.payoutDate.split('-');
    return parseInt(parts[1], 10) - 1 === currentMonth;
  });

  const sumAnual = dividendsInSelectedYear.reduce((sum, d) => sum + d.totalAmount, 0);
  const sumMensual = dividendsInSelectedMonth.reduce((sum, d) => sum + d.totalAmount, 0);

  // Calendar Day Generation (Monday-to-Sunday)
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay(); // Sunday=0, Monday=1, ...
  let startOffset = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1; // Adjust Monday to index 0
  const totalDaysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

  const calendarCells: (number | null)[] = [];
  for (let i = 0; i < startOffset; i++) {
    calendarCells.push(null);
  }
  for (let d = 1; d <= totalDaysInMonth; d++) {
    calendarCells.push(d);
  }

  const sortedDividends = [...dividends].sort((a, b) => {
    const aReal = !a.id.startsWith('div-sys-') ? 1 : 0;
    const bReal = !b.id.startsWith('div-sys-') ? 1 : 0;
    if (aReal !== bReal) return bReal - aReal;
    return new Date(a.payoutDate).getTime() - new Date(b.payoutDate).getTime();
  });

  // Group dividends by ticker for cascade view
  const [expandedTickers, setExpandedTickers] = useState<Set<string>>(new Set());
  const toggleTickerExpand = (t: string) => {
    setExpandedTickers(prev => {
      const next = new Set(prev);
      if (next.has(t)) next.delete(t); else next.add(t);
      return next;
    });
  };
  const groupedDividends = React.useMemo(() => {
    const map = new Map<string, DividendPayment[]>();
    for (const d of sortedDividends) {
      const arr = map.get(d.ticker) || [];
      arr.push(d);
      map.set(d.ticker, arr);
    }
    return Array.from(map.entries());
  }, [sortedDividends]);

  const {
    sortedData: sortedDivGroups,
    sortKey: divSortKey,
    toggleSort: divToggleSort,
    getSortIcon: divIcon,
  } = useSortable(
    groupedDividends.map(([ticker, divs]) => ({ ticker, divs, firstDiv: divs[0] })),
    '',
    'sort_dividends',
  );

  return (
    <div className="space-y-6">
      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-emerald-50 border border-emerald-200 p-5 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-xs text-emerald-800 font-semibold uppercase tracking-wider block">Dividendos Cobrados Activos</span>
            <span className="text-2xl font-bold font-mono text-emerald-950 block mt-1">{formatCLP(totalReceived)}</span>
            <span className="text-[11px] text-emerald-700/80 mt-1 block">Capital devuelto ya depositado en tu cuenta corriente</span>
          </div>
          <div className="p-3 bg-emerald-500/10 text-emerald-600 rounded-lg">
            <CheckCircle2 className="w-8 h-8" />
          </div>
        </div>

        <div className="bg-indigo-50 border border-indigo-200 p-5 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-xs text-indigo-800 font-semibold uppercase tracking-wider block">Próximos Dividendos (Estimados)</span>
            <span className="text-2xl font-bold font-mono text-indigo-950 block mt-1">{formatCLP(totalUpcoming)}</span>
            <span className="text-[11px] text-indigo-700/80 mt-1 block">Dividendos anunciados con fecha de pago en calendario</span>
          </div>
          <div className="p-3 bg-indigo-500/10 text-indigo-600 rounded-lg">
            <AlertCircle className="w-8 h-8" />
          </div>
        </div>
      </div>

      {/* Estimated dividends warning */}
      {dividends.some(d => d.estimated) && (
        <div className="flex items-start space-x-2 p-3 bg-purple-50 border border-purple-200 rounded-lg text-xs text-purple-800">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-purple-500" />
          <div>
            <span className="font-bold">Dividendos estimados:</span> Los montos y fechas marcados como <strong>Estimado</strong> son aproximados basados en el historial de pagos y no en anuncios oficiales de la Bolsa de Santiago. Verifica con tu corredora o la fuente oficial.
          </div>
        </div>
      )}

      {/* Sub-tab Navigation */}
      <div className="flex border-b border-slate-200 space-x-1">
        <button
          onClick={() => setActiveSubTab('list')}
          className={`pb-3 px-5 text-sm font-semibold border-b-2 transition-all flex items-center space-x-2 cursor-pointer ${
            activeSubTab === 'list'
              ? 'border-indigo-600 text-indigo-700 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Lista e Historial</span>
        </button>
        <button
          onClick={() => setActiveSubTab('calendar')}
          className={`pb-3 px-5 text-sm font-semibold border-b-2 transition-all flex items-center space-x-2 cursor-pointer ${
            activeSubTab === 'calendar'
              ? 'border-indigo-600 text-indigo-700 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Calendario de Pagos</span>
        </button>
      </div>

      {/* RENDER TAB 1: LIST & FORM */}
      {activeSubTab === 'list' && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center bg-slate-50 gap-3">
            <div className="flex items-center space-x-2">
              <Calendar className="w-5 h-5 text-slate-700" />
              <div>
                <h3 className="font-semibold text-slate-800 text-sm">Cronograma y Historial de Dividendos</h3>
                <p className="text-[10px] text-slate-500">Sincroniza y calcula los pagos reales de tus compras registradas con Yahoo Finance o mediante carga manual.</p>
              </div>
            </div>
            <div className="flex items-center space-x-2 w-full sm:w-auto">
              {onSyncDividends && (
                <button
                  type="button"
                  onClick={onSyncDividends}
                  disabled={isSyncing || holdings.length === 0}
                  className={`flex items-center justify-center space-x-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold border transition w-full sm:w-auto cursor-pointer ${
                    isSyncing
                      ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                      : holdings.length === 0
                      ? 'bg-slate-50 text-slate-400 border-slate-100 cursor-not-allowed'
                      : 'bg-white text-teal-700 border-teal-200 hover:bg-teal-50'
                  }`}
                  title={holdings.length === 0 ? 'Agrega acciones a tu portafolio primero' : 'Sincronizar calendario con bolsa'}
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                  <span>{isSyncing ? 'Sincronizando...' : 'Recuperar fechas de Bolsa'}</span>
                </button>
              )}
              <button
                onClick={() => setFormOpen(!formOpen)}
                className="flex items-center justify-center space-x-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold px-4 py-2 rounded-lg transition w-full sm:w-auto cursor-pointer shrink-0"
              >
                <PlusCircle className="w-4 h-4" />
                <span>{formOpen ? 'Cerrar Registro' : 'Registrar Pago Manual'}</span>
              </button>
            </div>
          </div>

          {formOpen && (
            <form onSubmit={handleSubmit} className="p-6 border-b border-slate-100 bg-slate-50/50 space-y-4 animate-fadeIn">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* Ticker Select */}
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Acción / Nemotécnico</label>
                  <select
                    value={ticker}
                    onChange={(e) => setTicker(e.target.value)}
                    className="w-full text-xs border border-slate-200 rounded-lg p-2.5 bg-white focus:outline-none"
                  >
                    {holdings.length > 0 ? (
                      Array.from(
                        new Map(holdings.map(h => [h.ticker, h])).values()
                      ).map(h => (
                        <option key={h.ticker} value={h.ticker}>{h.ticker} ({h.name})</option>
                      ))
                    ) : (
                      <option value="CHILE">CHILE (Debe agregar acciones en portafolio)</option>
                    )}
                  </select>
                </div>

                {/* Amount per share */}
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Monto por Acción (CLP)</label>
                  <input
                    type="number"
                    step="any"
                    min="0.00000001"
                    required
                    value={amountPerShare}
                    onChange={(e) => setAmountPerShare(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="Ej: 11.20"
                    className="w-full text-xs border border-slate-200 rounded-lg p-2.5 bg-white"
                  />
                </div>

                {/* Cutoff Date */}
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1 group relative cursor-help">
                    Fecha Límite de Compra
                    <span className="invisible group-hover:visible absolute bottom-full left-0 mb-2 p-2 bg-slate-900 text-white text-[10px] rounded-lg w-56 font-normal leading-normal shadow-lg z-20 whitespace-normal">
                      Último día para comprar acciones y recibir este dividendo. Después de esta fecha, ya no calificas.
                    </span>
                  </label>
                  <input
                    type="date"
                    value={cutoffDate}
                    onChange={(e) => setCutoffDate(e.target.value)}
                    className="w-full text-xs border border-slate-200 rounded-lg p-2.5 bg-white"
                  />
                </div>

                {/* Payout Date */}
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Fecha de Entrega/Pago</label>
                  <input
                    type="date"
                    required
                    value={payoutDate}
                    onChange={(e) => setPayoutDate(e.target.value)}
                    className="w-full text-xs border border-slate-200 rounded-lg p-2.5 bg-white"
                  />
                </div>

                {/* Received Checkbox */}
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Estado de Pago</label>
                  <div className="flex items-center space-x-2 pt-2">
                    <input
                      type="checkbox"
                      id="received"
                      checked={received}
                      onChange={(e) => setReceived(e.target.checked)}
                      className="w-4 h-4 text-teal-600 focus:ring-teal-500 rounded border-slate-300"
                    />
                    <label htmlFor="received" className="text-xs text-slate-700 cursor-pointer">
                      Ya Recibido (Abonado)
                    </label>
                  </div>
                </div>
              </div>

              <div className="flex justify-between items-center pt-2 border-t border-slate-100">
                <span className="text-[10px] text-slate-500 font-mono">
                  * El total del dividendo se calcula según las acciones que actualmente posees en el portafolio.
                </span>
                <div className="flex space-x-2">
                  <button
                    type="button"
                    onClick={() => setFormOpen(false)}
                    className="text-xs text-slate-500 hover:bg-slate-100 px-4 py-2 rounded-lg transition"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold px-5 py-2 rounded-lg transition"
                  >
                    Guardar Dividendo
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* Dividends Table */}
          <div className="overflow-x-auto table-scroll-container">
            {sortedDividends.length === 0 ? (
              <div className="p-12 text-center text-slate-400">
                <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-sm font-semibold">No hay registros de dividendos aún</p>
                <p className="text-xs mt-1">Registra dividendos entregados por tus acciones para verlos en el flujo y en tus gráficos.</p>
              </div>
            ) : (
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/70 font-semibold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-4 cursor-pointer hover:text-slate-800 select-none whitespace-nowrap" onClick={() => divToggleSort('firstDiv.ticker')}>Nemotécnico{divIcon('firstDiv.ticker')}</th>
                    <th className="py-3 px-4 text-right cursor-pointer hover:text-slate-800 select-none whitespace-nowrap" onClick={() => divToggleSort('firstDiv.sharesCount')}>Cant. Acciones{divIcon('firstDiv.sharesCount')}</th>
                    <th className="py-3 px-4 text-right cursor-pointer hover:text-slate-800 select-none whitespace-nowrap" onClick={() => divToggleSort('firstDiv.amountPerShare')}>Reparto (por Acción){divIcon('firstDiv.amountPerShare')}</th>
                    <th className="py-3 px-4 text-right cursor-pointer hover:text-slate-800 select-none whitespace-nowrap" onClick={() => divToggleSort('firstDiv.totalAmount')}>Monto Total{divIcon('firstDiv.totalAmount')}</th>
                    <th className="py-3 px-4 cursor-pointer hover:text-slate-800 select-none whitespace-nowrap" onClick={() => divToggleSort('firstDiv.limitDate')}>Fecha Límite Compra{divIcon('firstDiv.limitDate')}</th>
                    <th className="py-3 px-4 cursor-pointer hover:text-slate-800 select-none whitespace-nowrap" onClick={() => divToggleSort('firstDiv.payDate')}>Día de Entrega{divIcon('firstDiv.payDate')}</th>
                    <th className="py-3 px-4 text-center">Estado</th>
                    <th className="py-3 px-4 text-center"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sortedDivGroups.map(({ ticker, divs }) => {
                    const isExpanded = expandedTickers.has(ticker);
                    const latestDiv = divs[0];

                    const renderRow = (div: DividendPayment, isLast: boolean) => {
                      const isEditing = editDivId === div.id;
                      return (
                        <tr key={div.id} className={`hover:bg-slate-50/50 transition ${!isLast ? 'bg-slate-50/30' : ''}`}>
                          <td className="py-4 px-4 font-mono">
                            <span className="font-bold text-slate-900">{div.ticker}</span>
                            {div.id.startsWith('div-sys-') && div.estimated ? (
                              <span className="ml-2 inline-flex items-center gap-0.5 bg-purple-50 text-purple-800 text-[10px] sm:text-[9px] font-bold px-1.5 py-0.5 rounded border border-purple-200 uppercase tracking-widest">
                                Estimado
                              </span>
                            ) : div.id.startsWith('div-sys-') ? (
                              <span className="ml-2 inline-flex items-center gap-0.5 bg-teal-50 text-teal-800 text-[10px] sm:text-[9px] font-bold px-1.5 py-0.5 rounded border border-teal-100 uppercase tracking-widest">
                                Sincronizado
                              </span>
                            ) : (
                              <span className="ml-2 inline-flex items-center gap-0.5 bg-blue-50 text-blue-800 text-[10px] sm:text-[9px] font-bold px-1.5 py-0.5 rounded border border-blue-200 uppercase tracking-widest">
                                Real
                              </span>
                            )}
                          </td>

                          <td className="py-4 px-4 text-right font-semibold text-slate-700 font-mono">
                            {div.sharesCount.toLocaleString('es-CL')} acq.
                          </td>

                          <td className="py-4 px-4 text-right font-mono">
                            {isEditing ? (
                              <input
                                type="number"
                              step="any"
                              min="0.00000001"
                                value={editAmountPerShare}
                                onChange={(e) => setEditAmountPerShare(e.target.value === '' ? '' : Number(e.target.value))}
                                className="w-20 text-right text-xs border border-slate-200 rounded p-1"
                                autoFocus
                              />
                            ) : (
                              <span className="text-slate-600">$ {div.amountPerShare.toLocaleString('es-CL', { minimumFractionDigits: 2, maximumFractionDigits: 8 })}</span>
                            )}
                          </td>

                          <td className="py-4 px-4 text-right font-bold text-slate-900 font-mono">
                            {formatCLP(isEditing ? ((Number(editAmountPerShare) || 0) * div.sharesCount) : div.totalAmount)}
                          </td>

                          <td className="py-4 px-4">
                            {isEditing ? (
                              <input
                                type="date"
                                value={editCutoffDate}
                                onChange={(e) => setEditCutoffDate(e.target.value)}
                                className="w-28 text-xs border border-slate-200 rounded p-1"
                              />
                            ) : div.cutoffDate ? (
                              <div className="flex items-center space-x-1">
                                <span className="font-medium text-amber-700">{formatDateChilean(div.cutoffDate)}</span>
                                {div.cutoffDate < new Date().toISOString().split('T')[0] && !div.received && (
                                  <span className="text-[9px] bg-rose-100 text-rose-700 px-1.5 py-0.5 rounded-full font-bold">Vencido</span>
                                )}
                              </div>
                            ) : (
                              <span className="text-slate-300 text-[10px]">—</span>
                            )}
                          </td>

                          <td className="py-4 px-4 font-medium text-slate-600">
                            {isEditing ? (
                              <input
                                type="date"
                                value={editPayoutDate}
                                onChange={(e) => setEditPayoutDate(e.target.value)}
                                className="w-28 text-xs border border-slate-200 rounded p-1"
                              />
                            ) : (
                              formatDateChilean(div.payoutDate)
                            )}
                          </td>

                          <td className="py-4 px-4 text-center">
                            {isEditing ? (
                              <div className="flex items-center justify-center space-x-1">
                                <input
                                  type="checkbox"
                                  checked={editReceived}
                                  onChange={(e) => setEditReceived(e.target.checked)}
                                  className="w-4 h-4 text-teal-600 focus:ring-teal-500 rounded border-slate-300"
                                />
                                <span className="text-[10px] text-slate-500">{editReceived ? 'Cobrado' : 'Por cobrar'}</span>
                              </div>
                            ) : (
                              <button
                                onClick={() => !div.estimated && onToggleReceived(div.id)}
                                className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider transition ${
                                  div.estimated
                                    ? 'bg-purple-50 text-purple-800 border border-purple-200 cursor-default'
                                    : div.received
                                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 cursor-pointer'
                                    : 'bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100 cursor-pointer'
                                }`}
                              >
                                <span className={`w-1.5 h-1.5 rounded-full ${div.estimated ? 'bg-purple-500' : div.received ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
                                <span>{div.estimated ? 'Estimado' : div.received ? 'Cobrado' : 'Por cobrar'}</span>
                              </button>
                            )}
                          </td>

                          <td className="py-4 px-4 text-center">
                            <div className="flex items-center justify-center space-x-1">
                              {isEditing ? (
                                <>
                                  <button
                                    onClick={saveEdit}
                                    className="p-1 rounded text-emerald-600 hover:bg-emerald-50 transition"
                                    title="Guardar cambios"
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={cancelEdit}
                                    className="p-1 rounded text-slate-400 hover:bg-slate-100 transition"
                                    title="Cancelar"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button
                                    onClick={() => startEdit(div)}
                                    className="p-1 px-1.5 text-slate-400 hover:text-teal-500 hover:bg-slate-50 rounded transition"
                                    title="Editar dividendo"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => onDeleteDividend(div.id)}
                                    className="p-1 px-1.5 text-rose-500 hover:bg-rose-50 rounded transition"
                                    title="Eliminar dividendo"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    };

                    return (
                      <React.Fragment key={ticker}>
                        {/* Latest dividend row (always visible) */}
                        {renderRow(latestDiv, divs.length === 1 || isExpanded)}
                        {/* Expand button if there are more dividends */}
                        {divs.length > 1 && !isExpanded && (
                          <tr>
                            <td colSpan={8} className="text-center py-2">
                              <button
                                onClick={() => toggleTickerExpand(ticker)}
                                className="inline-flex items-center space-x-1 text-xs text-indigo-600 hover:text-indigo-800 font-semibold cursor-pointer"
                              >
                                <Layers className="w-3.5 h-3.5" />
                                <span>+{divs.length - 1} {divs.length - 1 === 1 ? 'dividendo anterior' : 'dividendos anteriores'} de {ticker}</span>
                              </button>
                            </td>
                          </tr>
                        )}
                        {/* Expanded rows */}
                        {isExpanded && divs.slice(1).map((d, i) => renderRow(d, i === divs.slice(1).length - 1))}
                        {/* Collapse button */}
                        {isExpanded && divs.length > 1 && (
                          <tr>
                            <td colSpan={8} className="text-center py-2 bg-slate-50/50">
                              <button
                                onClick={() => toggleTickerExpand(ticker)}
                                className="inline-flex items-center space-x-1 text-xs text-slate-500 hover:text-slate-700 font-semibold cursor-pointer"
                              >
                                <X className="w-3.5 h-3.5" />
                                <span>Ocultar dividendos anteriores</span>
                              </button>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* RENDER TAB 2: INTERACTIVE CALENDAR WITH SUM CALCULATORS */}
      {activeSubTab === 'calendar' && (
        <div className="space-y-6">
          {/* Calendar Sum Summary Header */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-slate-900 text-white p-4 rounded-xl shadow-xs border border-slate-800">
              <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400 block">Suma Mensual en {MONTH_NAMES[currentMonth]}</span>
              <span className="text-xl font-mono font-bold block mt-1">{formatCLP(sumMensual)}</span>
              <span className="text-[10px] text-slate-400 mt-1 block">Suma de pagos planificados o cobrados este mes</span>
            </div>

            <div className="bg-indigo-900 text-white p-4 rounded-xl shadow-xs border border-indigo-950">
              <span className="text-[10px] uppercase font-bold tracking-widest text-indigo-200 block">Suma Anual Proyectada ({currentYear})</span>
              <span className="text-xl font-mono font-bold block mt-1">{formatCLP(sumAnual)}</span>
              <span className="text-[10px] text-indigo-300 mt-1 block">Total acumulado en el año seleccionado</span>
            </div>

            <div className="bg-white border border-slate-200 p-4 rounded-xl flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Cantidad de Pagos en {MONTH_NAMES[currentMonth]}</span>
                <span className="text-xl font-bold text-slate-800 block mt-1">{dividendsInSelectedMonth.length} {dividendsInSelectedMonth.length === 1 ? 'pago' : 'pagos'}</span>
                <span className="text-[10px] text-slate-500 block">Nemotécnicos registrados con fechas</span>
              </div>
              <TrendingUp className="w-8 h-8 text-indigo-500" />
            </div>
          </div>

          {/* Main Month Grid View Card */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4">
            {/* Calendar Control Navigation */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div className="flex items-center space-x-3">
                <Calendar className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-slate-800 text-sm">
                  Calendario de Distribución Mensual
                </h3>
              </div>

              {/* Month/Year Interactive Buttons */}
              <div className="flex items-center space-x-2">
                <button
                  onClick={handlePrevMonth}
                  className="p-1 px-2 bg-slate-100 hover:bg-slate-200 rounded text-slate-700 transition cursor-pointer"
                  title="Mes Anterior"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <div className="font-mono text-xs font-bold text-slate-800 bg-slate-100 px-4 py-1.5 rounded text-center min-w-[140px]">
                  {MONTH_NAMES[currentMonth].toUpperCase()} {currentYear}
                </div>
                <button
                  onClick={handleNextMonth}
                  className="p-1 px-2 bg-slate-100 hover:bg-slate-200 rounded text-slate-700 transition cursor-pointer"
                  title="Mes Siguiente"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>

                <div className="border-l border-slate-200 pl-2 ml-1 flex items-center space-x-1">
                  <select
                    value={currentYear}
                    onChange={(e) => setCurrentYear(parseInt(e.target.value, 10))}
                    className="text-xs bg-slate-100 border-none rounded font-semibold font-mono p-1 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition cursor-pointer"
                  >
                    {[2024, 2025, 2026, 2027, 2028, 2029, 2030].map(y => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Standard Calendar Grid layout */}
            <div className="grid grid-cols-7 gap-1.5 text-center text-xs">
              {WEEK_DAYS.map(day => (
                <div key={day} className="font-bold text-slate-400 py-1 uppercase tracking-wider text-[10px]">{day}</div>
              ))}
              {calendarCells.map((day, idx) => {
                if (day === null) {
                  return <div key={`empty-${idx}`} className="bg-slate-50/50 rounded-lg min-h-[4.5rem]"></div>;
                }
                
                const dayDividends = getDividendsForDay(day);
                const isToday = new Date().getDate() === day && new Date().getMonth() === currentMonth && new Date().getFullYear() === currentYear;

                return (
                  <div 
                    key={`day-${day}`} 
                    className={`border border-slate-100 rounded-lg p-1.5 min-h-[4.5,rem] h-20 overflow-y-auto flex flex-col justify-between transition-all ${
                      isToday 
                        ? 'bg-indigo-50 border-indigo-300 ring-1 ring-indigo-300' 
                        : 'bg-white hover:bg-slate-50/80'
                    } ${
                      dayDividends.length > 0 
                        ? 'ring-1 ring-teal-500/20 border-teal-200 bg-teal-50/5' 
                        : ''
                    }`}
                  >
                    <div className="flex justify-between items-center h-4">
                      <span className={`text-[10px] sm:text-xs font-mono font-bold leading-none ${
                        isToday 
                          ? 'bg-indigo-600 text-white w-4 h-4 rounded-full flex items-center justify-center font-bold text-[9px]' 
                          : 'text-slate-500'
                      }`}>
                        {day}
                      </span>
                      {dayDividends.length > 0 && (
                        <span className="w-1.5 h-1.5 rounded-full bg-teal-500" />
                      )}
                    </div>
                    
                    <div className="mt-1 space-y-1 text-[8px] sm:text-[9px] text-left">
                      {dayDividends.map((div, dIdx) => (
                          <div
                              key={div.id || dIdx} 
                              className={`px-1 py-0.5 rounded font-mono font-bold truncate leading-tight ${
                                div.estimated
                                  ? 'bg-purple-50 text-purple-800 border border-purple-100'
                                  : div.received 
                                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-100' 
                                  : 'bg-amber-50 text-amber-800 border border-amber-100'
                              }`} 
                              title={`${div.ticker}: ${formatCLP(div.totalAmount)}${div.estimated ? ' (estimado)' : ''}`}
                            >
                              <span className="font-extrabold">{div.ticker}</span>: {formatCLP(div.totalAmount)}
                            </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Agenda Agenda details list for the selected Month */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
            <h4 className="font-bold text-slate-800 text-sm mb-3">
              Detalle de Pagos para {MONTH_NAMES[currentMonth]} {currentYear}
            </h4>
            
            {dividendsInSelectedMonth.length === 0 ? (
              <div className="text-center p-8 text-slate-400 text-xs">
                <AlertCircle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                Ningún dividendo programado para este período.
              </div>
            ) : (
              <div className="space-y-2 text-xs">
                {dividendsInSelectedMonth.map(div => (
                  <div 
                    key={div.id} 
                    className="flex justify-between items-center p-3 rounded-lg border border-slate-100 hover:bg-slate-50 transition"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="font-mono bg-slate-100 px-2 py-1 rounded font-bold text-slate-700">
                        {div.ticker}
                      </div>
                        <div>
                          <div className="font-semibold text-slate-800">
                            Total Pagado: {formatCLP(div.totalAmount)}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {div.sharesCount.toLocaleString('es-CL')} acciones x $ {div.amountPerShare.toLocaleString('es-CL', { minimumFractionDigits: 2, maximumFractionDigits: 8 })} por acción
                          </div>
                          {div.cutoffDate && (
                            <div className="text-[10px] text-amber-600 mt-0.5">
                              Límite compra: {formatDateChilean(div.cutoffDate)}
                            </div>
                          )}
                        </div>
                      </div>

                    <div className="flex items-center space-x-4">
                      <span className="font-mono font-bold text-slate-600 bg-slate-50 border border-slate-200/50 px-2.5 py-1 rounded">
                        {formatDateChilean(div.payoutDate)}
                      </span>
                      <button
                        onClick={() => !div.estimated && onToggleReceived(div.id)}
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          div.estimated
                            ? 'bg-purple-50 text-purple-800 border border-purple-200 cursor-default'
                            : div.received
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-100 cursor-pointer'
                            : 'bg-amber-50 text-amber-800 border border-amber-200 cursor-pointer'
                        }`}
                      >
                        {div.estimated ? 'Estimado' : div.received ? 'Cobrado' : 'Por cobrar'}
                      </button>
                      <button
                        onClick={() => onDeleteDividend(div.id)}
                        className="text-rose-500 hover:bg-rose-50 p-1.5 rounded transition"
                        title="Eliminar"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
