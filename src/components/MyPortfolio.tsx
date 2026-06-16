/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { StockHolding } from '../types';
import { formatCLP, formatPercent, formatDateChilean, normalizeTicker } from '../utils';
import { PlusCircle, Trash2, Edit2, Check, X, RefreshCw, Landmark, HelpCircle, Flame, ArrowUpRight, ArrowDownRight, Lock } from 'lucide-react';

import { useSortable } from '../lib/useSortable';

interface MyPortfolioProps {
  holdings: StockHolding[];
  onAddHolding: (holding: Omit<StockHolding, 'id'>) => void;
  onUpdateHoldingPrice: (id: string, newPrice: number) => void;
  onUpdateHoldingYield: (id: string, newYield: number) => void;
  onDeleteHolding: (id: string) => void;
  onResetManualPrice?: (id: string) => void;
  marketStocks: { ticker: string; name: string; price: number; previousClose?: number; changePercent?: number; dividendYield: number }[];
  dailyPnL: number;
}

export default function MyPortfolio({
  holdings,
  onAddHolding,
  onUpdateHoldingPrice,
  onUpdateHoldingYield,
  onDeleteHolding,
  onResetManualPrice,
  marketStocks,
  dailyPnL
}: MyPortfolioProps) {
  // Add holding form state
  const [ticker, setTicker] = useState('CHILE');
  const [shares, setShares] = useState<number | ''>('');
  const [buyPrice, setBuyPrice] = useState<number | ''>('');
  const [customTicker, setCustomTicker] = useState('');
  const [customName, setCustomName] = useState('');
  const [isCustom, setIsCustom] = useState(false);
  const [buyDate, setBuyDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [annualTargetYield, setAnnualTargetYield] = useState<number>(7.5);
  const [formOpen, setFormOpen] = useState(false);

  // Sync ticker, buy price and annual target yield when marketStocks or form status change
  React.useEffect(() => {
    if (marketStocks && marketStocks.length > 0) {
      const exists = marketStocks.some(s => s.ticker === ticker);
      if (!exists && ticker !== 'CUSTOM') {
        const firstStock = marketStocks[0];
        setTicker(firstStock.ticker);
        setBuyPrice(firstStock.price);
        setAnnualTargetYield(firstStock.dividendYield);
      }
    }
  }, [marketStocks]);

  // When form opens, initialize inputs with currently active values
  React.useEffect(() => {
    if (formOpen && marketStocks && marketStocks.length > 0) {
      if (ticker === 'CUSTOM') {
        setIsCustom(true);
      } else {
        setIsCustom(false);
        const selected = marketStocks.find(s => s.ticker === ticker);
        if (selected) {
          setBuyPrice(selected.price);
          setAnnualTargetYield(selected.dividendYield);
        } else {
          const first = marketStocks[0];
          setTicker(first.ticker);
          setBuyPrice(first.price);
          setAnnualTargetYield(first.dividendYield);
        }
      }
    }
  }, [formOpen, marketStocks]);

  // Expand/collapse grouped holdings
  const [expandedTickers, setExpandedTickers] = useState<Set<string>>(new Set());
  const toggleExpand = (t: string) => {
    setExpandedTickers(prev => {
      const next = new Set(prev);
      if (next.has(t)) next.delete(t); else next.add(t);
      return next;
    });
  };

  // Editing price state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPrice, setEditPrice] = useState<number>(0);
  const [editingYieldId, setEditingYieldId] = useState<string | null>(null);
  const [editYield, setEditYield] = useState<number>(0);

  const handleTickerChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setIsCustom(val === 'CUSTOM');
    setTicker(val);
    
    if (val !== 'CUSTOM') {
      const selectedStock = marketStocks.find(s => s.ticker === val);
      if (selectedStock) {
        setBuyPrice(selectedStock.price);
        setAnnualTargetYield(selectedStock.dividendYield);
      }
    } else {
      setBuyPrice('');
      setAnnualTargetYield(7.5);
    }
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!shares || shares <= 0) return alert('Por favor ingresa la cantidad de acciones');
    if (!buyPrice || buyPrice <= 0) return alert('Por favor ingresa el precio de compra');

    let finalTicker = ticker;
    let finalName = '';

    if (isCustom) {
      if (!customTicker.trim()) return alert('Por favor ingresa el nemotécnico (Ticker)');
      if (!customName.trim()) return alert('Por favor ingresa el nombre de la empresa');
      finalTicker = customTicker.toUpperCase().trim();
      finalName = customName;
    } else {
      const s = marketStocks.find(m => m.ticker === ticker);
      finalName = s ? s.name : ticker;
    }

    const currentPrice = isCustom ? Number(buyPrice) : (marketStocks.find(m => m.ticker === finalTicker)?.price || Number(buyPrice));

    onAddHolding({
      ticker: finalTicker,
      name: finalName,
      shares: Number(shares),
      buyPrice: Number(buyPrice),
      currentPrice: currentPrice,
      buyDate: buyDate,
      annualTargetYield: Number(annualTargetYield)
    });

    // Reset Form
    setShares('');
    setCustomTicker('');
    setCustomName('');
    setFormOpen(false);
  };

  const startEditPrice = (h: StockHolding | { ticker: string; currentPrice: number; ids: string[] }) => {
    setEditingId('ticker_' + h.ticker);
    setEditPrice(h.currentPrice);
  };

  const saveEditPrice = (tickerOrId: string) => {
    if (editPrice <= 0) return;
    // If editing a grouped holding, update all entries with matching ticker
    const prefix = 'ticker_';
    if (tickerOrId.startsWith(prefix)) {
      const ticker = tickerOrId.slice(prefix.length);
      holdings.filter(h => h.ticker === ticker).forEach(h => onUpdateHoldingPrice(h.id, editPrice));
    } else {
      onUpdateHoldingPrice(tickerOrId, editPrice);
    }
    setEditingId(null);
  };

  const startEditYield = (h: StockHolding | { ticker: string; annualTargetYield: number; ids: string[] }) => {
    setEditingYieldId('ticker_' + h.ticker);
    setEditYield(h.annualTargetYield);
  };

  const saveEditYield = (tickerOrId: string) => {
    if (editYield < 0) return;
    const prefix = 'ticker_';
    if (tickerOrId.startsWith(prefix)) {
      const ticker = tickerOrId.slice(prefix.length);
      holdings.filter(h => h.ticker === ticker).forEach(h => onUpdateHoldingYield(h.id, editYield));
    } else {
      onUpdateHoldingYield(tickerOrId, editYield);
    }
    setEditingYieldId(null);
  };

  // Group holdings by ticker (merge same stocks bought at different times)
  const groupedHoldings = React.useMemo(() => {
    const map = new Map<string, {
      ticker: string;
      name: string;
      shares: number;
      buyPrice: number;
      currentPrice: number;
      buyDate: string;
      annualTargetYield: number;
      ids: string[];
      manualPrice: boolean;
      absProfit: number;
      dailyProfit: number;
    }>();

    for (const h of holdings) {
      const existing = map.get(h.ticker);
      if (existing) {
        const totalShares = existing.shares + h.shares;
        const weightedBuyPrice = ((existing.buyPrice * existing.shares) + (h.buyPrice * h.shares)) / totalShares;
        existing.shares = totalShares;
        existing.buyPrice = Math.round(weightedBuyPrice * 100) / 100;
        existing.currentPrice = h.currentPrice;
        if (h.buyDate < existing.buyDate) existing.buyDate = h.buyDate;
        existing.ids.push(h.id);
        if (h.manualPrice) existing.manualPrice = true;
      } else {
        map.set(h.ticker, {
          ticker: h.ticker,
          name: h.name,
          shares: h.shares,
          buyPrice: h.buyPrice,
          currentPrice: h.currentPrice,
          buyDate: h.buyDate,
          annualTargetYield: h.annualTargetYield,
          ids: [h.id],
          manualPrice: h.manualPrice || false,
          absProfit: 0,
          dailyProfit: 0
        });
      }
    }
    const result = Array.from(map.values());
    // compute absProfit and dailyProfit
    for (const g of result) {
      const cost = g.shares * g.buyPrice;
      const currentVal = g.shares * g.currentPrice;
      g.absProfit = currentVal - cost;
      const todayStrLocal = new Date().toISOString().split('T')[0];
      const mStock = marketStocks.find(s => normalizeTicker(s.ticker) === normalizeTicker(g.ticker));
      let prevClose = mStock?.previousClose;
      if ((prevClose == null || prevClose <= 0) && mStock?.changePercent != null && g.currentPrice > 0) {
        prevClose = g.currentPrice / (1 + mStock.changePercent / 100);
      }
      if (g.buyDate && g.buyDate >= todayStrLocal) {
        g.dailyProfit = 0;
      } else if (prevClose != null && prevClose > 0 && g.currentPrice > 0) {
        g.dailyProfit = (g.currentPrice - prevClose) * g.shares;
      } else {
        g.dailyProfit = 0;
      }
    }
    return result;
  }, [holdings, marketStocks]);

  const { sortedData: sortedGrouped, sortKey: pfSortKey, toggleSort: pfToggleSort, getSortIcon: pfIcon } = useSortable(groupedHoldings, 'ticker', 'sort_portfolio');

  // Capital aggregation (use grouped data for accurate totals)
  const totalContributed = groupedHoldings.reduce((sum, h) => sum + (h.shares * h.buyPrice), 0);
  const totalCurrent = groupedHoldings.reduce((sum, h) => sum + (h.shares * h.currentPrice), 0);
  const totalGainLoss = totalCurrent - totalContributed;
  const totalGainLossPercent = totalContributed > 0 ? (totalGainLoss / totalContributed) * 100 : 0;
  const todayStr = new Date().toISOString().split('T')[0];

  return (
    <div className="space-y-6">
      {/* Overview Metric Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs text-slate-500 font-medium uppercase tracking-wider block">Capital Aportado Total</span>
          <span className="text-2xl font-bold font-mono text-slate-900 block mt-1">{formatCLP(totalContributed)}</span>
          <span className="text-xs text-slate-400 mt-2 block">Suma del costo total de adquisiciones</span>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs text-slate-500 font-medium uppercase tracking-wider block">Valorización de Mercado</span>
          <span className="text-2xl font-bold font-mono text-slate-900 block mt-1">{formatCLP(totalCurrent)}</span>
          <span className="text-xs text-slate-400 mt-2 block flex items-center gap-1">
            Revalorizado con precios actuales de bolsa
          </span>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs text-slate-500 font-medium uppercase tracking-wider block">Fluctuación de Capital (Plusvalía)</span>
          <div className="flex items-baseline space-x-2 mt-1">
            <span className={`text-2xl font-bold font-mono ${totalGainLoss >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              {totalGainLoss >= 0 ? '+' : ''}{formatCLP(totalGainLoss)}
            </span>
            <span className={`text-xs font-semibold font-mono ${totalGainLoss >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'} px-2 py-0.5 rounded-full flex items-center`}>
              {totalGainLoss >= 0 ? <ArrowUpRight className="w-3.5 h-3.5 mr-0.5" /> : <ArrowDownRight className="w-3.5 h-3.5 mr-0.5" />}
              {totalGainLossPercent.toFixed(2)}%
            </span>
          </div>
          <span className="text-xs text-slate-400 mt-2 block">Diferencia entre valor actual y compra</span>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs text-slate-500 font-medium uppercase tracking-wider block">Ganancia / Pérdida del Día</span>
          <div className="flex items-baseline space-x-2 mt-1">
            <span className={`text-2xl font-bold font-mono ${dailyPnL >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              {dailyPnL >= 0 ? '+' : ''}{formatCLP(dailyPnL)}
            </span>
            <span className={`text-xs font-semibold font-mono ${dailyPnL >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'} px-2 py-0.5 rounded-full flex items-center`}>
              {dailyPnL >= 0 ? '+' : ''}
              {totalCurrent > 0 ? ((dailyPnL / (totalCurrent - dailyPnL)) * 100).toFixed(2) : '0.00'}%
            </span>
          </div>
          <span className="text-xs text-slate-400 mt-2 block">Hoy</span>
        </div>
      </div>

      {/* Action Button & Form Section */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <div className="flex items-center space-x-2">
            <Landmark className="w-5 h-5 text-slate-700" />
            <h3 className="font-semibold text-slate-800 text-sm">Acciones Compradas en Portafolio</h3>
          </div>
          <button
            onClick={() => setFormOpen(!formOpen)}
            className="flex items-center space-x-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium px-4 py-2 rounded-lg transition"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Registrar Compra o Posición</span>
          </button>
        </div>

        {formOpen && (
          <form onSubmit={handleAddSubmit} className="p-6 border-b border-slate-100 bg-slate-50/50 space-y-4 animate-fadeIn">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Ticker Selector */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Empresa / Ticker</label>
                <select
                  value={ticker}
                  onChange={handleTickerChange}
                  className="w-full text-xs border border-slate-200 rounded-lg p-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                >
                  {marketStocks.map(s => (
                    <option key={s.ticker} value={s.ticker}>{s.ticker} - {s.name}</option>
                  ))}
                  <option value="CUSTOM">OTRA (Nemotécnico Personalizado)</option>
                </select>
              </div>

              {/* Custom Fields (Only if isCustom) */}
              {isCustom ? (
                <>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Nemotécnico IPSA</label>
                    <input
                      type="text"
                      value={customTicker}
                      onChange={(e) => setCustomTicker(e.target.value.toUpperCase())}
                      placeholder="Ej: COLBUN"
                      className="w-full text-xs border border-slate-200 rounded-lg p-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Nombre Empresa</label>
                    <input
                      type="text"
                      value={customName}
                      onChange={(e) => setCustomName(e.target.value)}
                      placeholder="Ej: Colbún S.A."
                      className="w-full text-xs border border-slate-200 rounded-lg p-2.5 bg-white"
                    />
                  </div>
                </>
              ) : (
                <div className="md:col-span-2 text-xs text-slate-500 flex items-center pl-2 pt-5">
                  ✓ Nemotécnico oficial seleccionado de la Bolsa de Santiago.
                </div>
              )}

              {/* Date */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Fecha de Compra</label>
                <input
                  type="date"
                  value={buyDate}
                  onChange={(e) => setBuyDate(e.target.value)}
                  className="w-full text-xs border border-slate-200 rounded-lg p-2.5 bg-white"
                />
              </div>
            </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Quantity */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Cantidad de Acciones</label>
                <input
                  type="number"
                  min="1"
                  value={shares}
                  onChange={(e) => setShares(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="Ej: 500"
                  className="w-full text-xs border border-slate-200 rounded-lg p-2.5 bg-white focus:ring-2 focus:ring-teal-500/20"
                />
              </div>

              {/* Buy Price */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Precio de Compra (CLP por Acción)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.1"
                  value={buyPrice}
                  onChange={(e) => setBuyPrice(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="Ej: 115"
                  className="w-full text-xs border border-slate-200 rounded-lg p-2.5 bg-white"
                />
              </div>

              {/* Target Yield */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Rentabilidad Anual Proyectada (%)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={annualTargetYield}
                  onChange={(e) => setAnnualTargetYield(Number(e.target.value))}
                  placeholder="Ej: 8.5"
                  className="w-full text-xs border border-slate-200 rounded-lg p-2.5 bg-white"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100">
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
                Agregar al Portafolio
              </button>
            </div>
          </form>
        )}

        {/* Portfolio Table */}
        <div className="overflow-x-auto table-scroll-container">
          {groupedHoldings.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <HelpCircle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-sm font-semibold">No tienes acciones registradas</p>
              <p className="text-xs mt-1">Utiliza el botón de registrar o añade acciones de prueba desde la pestaña "Bolsa de Santiago" para comenzar.</p>
            </div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4 cursor-pointer hover:text-slate-800 select-none" onClick={() => pfToggleSort('ticker')}>Nemotécnico / Empresa{pfIcon('ticker')}</th>
                  <th className="py-3 px-4 text-right cursor-pointer hover:text-slate-800 select-none" onClick={() => pfToggleSort('shares')}>Cant. Acciones{pfIcon('shares')}</th>
                  <th className="py-3 px-4 text-right cursor-pointer hover:text-slate-800 select-none" onClick={() => pfToggleSort('buyPrice')}>Precio Prom. Compra{pfIcon('buyPrice')}</th>
                  <th className="py-3 px-4 text-right group relative cursor-help">
                    Precio Mercado (CLP)
                    <span className="invisible group-hover:visible absolute top-full right-4 mt-2 p-2 bg-slate-900 text-white text-[10px] rounded-lg w-48 font-normal leading-normal shadow-lg z-20 whitespace-normal">
                      Haz clic en el lápiz para simular fluctuaciones de precio en tiempo real.
                    </span>
                  </th>
                  <th className="py-3 px-4 text-right cursor-pointer hover:text-slate-800 select-none" onClick={() => pfToggleSort('buyPrice')}>Capital Aportado{pfIcon('buyPrice')}</th>
                  <th className="py-3 px-4 text-right cursor-pointer hover:text-slate-800 select-none" onClick={() => pfToggleSort('currentPrice')}>Valor actual{pfIcon('currentPrice')}</th>
                  <th className="py-3 px-4 text-right cursor-pointer hover:text-slate-800 select-none" onClick={() => pfToggleSort('dailyProfit')}>Cambio Diario{pfIcon('dailyProfit')}</th>
                  <th className="py-3 px-4 text-right cursor-pointer hover:text-slate-800 select-none" onClick={() => pfToggleSort('absProfit')}>RENTABILIDAD TOTAL{pfIcon('absProfit')}</th>
                  <th className="py-3 px-4 text-right">% Port.</th>
                  <th className="py-3 px-4 text-center cursor-pointer hover:text-slate-800 select-none" onClick={() => pfToggleSort('annualTargetYield')}>Rend. Objetivo{pfIcon('annualTargetYield')}</th>
                  <th className="py-3 px-4 text-center"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sortedGrouped.map((h) => {
                  const cost = h.shares * h.buyPrice;
                  const currentVal = h.shares * h.currentPrice;
                  const absProfit = currentVal - cost;
                  const relativeProfit = cost > 0 ? (absProfit / cost) * 100 : 0;
                  const allocationPct = totalContributed > 0 ? (cost / totalContributed) * 100 : 0;
                  const isGrouped = h.ids.length > 1;
                  const isExpanded = expandedTickers.has(h.ticker);

                  const renderGroupedHeader = () => (
                    <tr key={h.ticker} className={`hover:bg-slate-50/50 transition duration-150 ${isGrouped ? 'cursor-pointer' : ''}`} onClick={() => isGrouped && toggleExpand(h.ticker)}>
                      {/* Name/Ticker */}
                      <td className="py-4 px-4">
                        <div className="font-bold text-slate-900 group flex items-center space-x-1.5">
                          {isGrouped && (
                            <span className={`transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}>
                              <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                            </span>
                          )}
                          <span className="text-slate-900 hover:text-teal-600 transition">{h.ticker}</span>
                          {isGrouped && (
                            <span className="text-[9px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-medium">Agrupado</span>
                          )}
                          <span className="text-[10px] text-slate-400 font-normal truncate max-w-[100px]">{h.name}</span>
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5 flex items-center space-x-2">
                          <span>1ra compra: {formatDateChilean(h.buyDate)}</span>
                          {isGrouped && <span className="text-amber-500">· {h.ids.length} compras</span>}
                        </div>
                      </td>

                      {/* Shares */}
                      <td className="py-4 px-4 text-right font-semibold text-slate-800 font-mono">
                        {h.shares.toLocaleString('es-CL')}
                      </td>

                      {/* Buy Price (Weighted Average) */}
                      <td className="py-4 px-4 text-right">
                        <span className="text-slate-700 font-mono">{formatCLP(h.buyPrice, true)}</span>
                        {isGrouped && (
                          <div className="text-[9px] text-slate-400 mt-0.5">promedio ponderado</div>
                        )}
                      </td>

                      {/* Current Price (Editable) */}
                      <td className="py-4 px-4 text-right font-mono">
                        {editingId === ('ticker_' + h.ticker) ? (
                          <div className="flex items-center justify-end space-x-1.5">
                            <input
                              type="number"
                              step="0.01"
                              value={editPrice}
                              onChange={(e) => setEditPrice(Number(e.target.value))}
                              className="w-20 text-right text-xs border border-slate-200 rounded p-1"
                              autoFocus
                            />
                            <button
                              onClick={() => saveEditPrice(h.ticker)}
                              className="p-1 rounded text-emerald-600 hover:bg-emerald-50 transition"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
                              className="p-1 rounded text-slate-400 hover:bg-slate-100 transition"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-end space-x-1 group">
                            <span className="text-slate-900 font-medium">{formatCLP(h.currentPrice, true)}</span>
                            {(h as any).manualPrice && (
                              <span className="relative group/lock" title="Precio manual - click para desbloquear">
                                <button
                                  onClick={(e) => { e.stopPropagation(); if (onResetManualPrice) h.ids?.forEach((id: string) => onResetManualPrice!(id)); }}
                                  className="text-amber-500 hover:text-amber-600 transition"
                                >
                                  <Lock className="w-3 h-3" />
                                </button>
                                <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[9px] px-2 py-0.5 rounded whitespace-nowrap opacity-0 group-hover/lock:opacity-100 transition pointer-events-none">
                                  Desbloquear
                                </span>
                              </span>
                            )}
                            <button
                              onClick={(e) => { e.stopPropagation(); startEditPrice(h); }}
                              className="text-slate-400 hover:text-teal-500 transition"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </td>

                      {/* Cost Total */}
                      <td className="py-4 px-4 text-right text-slate-600 font-mono">
                        {formatCLP(cost)}
                      </td>

                      {/* Current Value */}
                      <td className="py-4 px-4 text-right font-bold text-slate-900 font-mono">
                        {formatCLP(currentVal)}
                      </td>

                      {/* Cambio Diario */}
                      <td className="py-4 px-4 text-right">
                        {(() => {
                          const mStock = marketStocks.find(s => normalizeTicker(s.ticker) === normalizeTicker(h.ticker));
                          if (h.buyDate && h.buyDate >= todayStr) {
                            return <span className="text-slate-300 font-mono">—</span>;
                          }
                          let prevClose = mStock?.previousClose;
                          let currentPrice = mStock?.price;
                          if ((prevClose == null || prevClose <= 0) && mStock?.changePercent != null && currentPrice) {
                            prevClose = currentPrice / (1 + mStock.changePercent / 100);
                          }
                          if (prevClose == null || prevClose <= 0 || currentPrice == null) {
                            const dp = (h as any).dailyProfit;
                            if (dp != null && dp !== 0 && h.shares > 0 && h.currentPrice > 0) {
                              const backPx = h.shares * h.currentPrice - dp;
                              const pct = backPx > 0 ? (dp / backPx) * 100 : 0;
                              return (
                                <div>
                                  <div className={`font-semibold font-mono ${dp >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                    {dp >= 0 ? '+' : ''}{pct.toFixed(2)}%
                                  </div>
                                  <div className={`text-[10px] font-mono ${dp >= 0 ? 'text-emerald-500' : 'text-rose-400'}`}>
                                    {dp >= 0 ? '+' : ''}{formatCLP(dp)}
                                  </div>
                                </div>
                              );
                            }
                            return <span className="text-slate-300 font-mono">—</span>;
                          }
                          const dailyProfit = (currentPrice - prevClose) * h.shares;
                          const dailyPct = ((currentPrice - prevClose) / prevClose) * 100;
                          return (
                            <div>
                              <div className={`font-semibold font-mono ${dailyProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                {dailyProfit >= 0 ? '+' : ''}{dailyPct.toFixed(2)}%
                              </div>
                              <div className={`text-[10px] font-mono ${dailyProfit >= 0 ? 'text-emerald-500' : 'text-rose-400'}`}>
                                {dailyProfit >= 0 ? '+' : ''}{formatCLP(dailyProfit)}
                              </div>
                            </div>
                          );
                        })()}
                      </td>

                      {/* RENTABILIDAD TOTAL */}
                      <td className="py-4 px-4 text-right">
                        <div className={`font-semibold font-mono ${absProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {absProfit >= 0 ? '+' : ''}{relativeProfit.toFixed(2)}%
                        </div>
                        <div className={`text-[10px] font-mono ${absProfit >= 0 ? 'text-emerald-500' : 'text-rose-400'}`}>
                          {absProfit >= 0 ? '+' : ''}{formatCLP(absProfit)}
                        </div>
                      </td>

                      {/* Allocation % */}
                      <td className="py-4 px-4 text-right">
                        <div className="font-mono text-slate-700">{allocationPct.toFixed(1)}%</div>
                        <div className="w-full h-1 bg-slate-100 rounded-full mt-1 overflow-hidden">
                          <div
                            className="h-full bg-teal-500 rounded-full"
                            style={{ width: `${Math.min(allocationPct, 100)}%` }}
                          />
                        </div>
                      </td>

                      {/* Annual Target Yield (Editable) */}
                      <td className="py-4 px-4 text-center font-mono">
                        {editingYieldId === ('ticker_' + h.ticker) ? (
                          <div className="flex items-center justify-center space-x-1">
                            <input
                              type="number"
                              step="0.1"
                              value={editYield}
                              onChange={(e) => setEditYield(Number(e.target.value))}
                              className="w-12 text-center text-xs border border-slate-200 rounded p-1"
                              autoFocus
                            />
                            <button
                              onClick={() => saveEditYield(h.ticker)}
                              className="p-1 rounded text-emerald-600 hover:bg-emerald-50 transition"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
                              className="p-1 rounded text-slate-400 hover:bg-slate-100 transition"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center space-x-1 group cursor-pointer" onClick={(e) => { e.stopPropagation(); startEditYield(h); }}>
                            <span className="text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded font-bold">{h.annualTargetYield.toFixed(1)}%</span>
                            <Edit2 className="w-3 h-3 text-indigo-400 opacity-0 group-hover:opacity-100 transition" />
                          </div>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-4 text-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (isGrouped) {
                              if (confirm(`¿Eliminar todas las entradas de ${h.ticker} (${h.ids.length} compras)?`)) {
                                h.ids.forEach(id => onDeleteHolding(id));
                              }
                            } else {
                              onDeleteHolding(h.ids[0]);
                            }
                          }}
                          className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition"
                          title="Eliminar acción de mi portafolio"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );

                  const renderIndividualRow = (holding: StockHolding) => {
                    const indCost = holding.shares * holding.buyPrice;
                    const indCurrentVal = holding.shares * holding.currentPrice;
                    const indAbsProfit = indCurrentVal - indCost;
                    const indRelProfit = indCost > 0 ? (indAbsProfit / indCost) * 100 : 0;
                    return (
                      <tr key={holding.id} className="bg-slate-50/40 hover:bg-slate-100/50 transition duration-150 text-[12px]">
                        <td className="py-2.5 px-4 pl-10">
                          <div className="font-medium text-slate-700 flex items-center space-x-1.5">
                            <span className="text-[9px] text-slate-400 font-normal">Compra del</span>
                            <span className="font-mono text-xs">{formatDateChilean(holding.buyDate)}</span>
                          </div>
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono text-slate-700">{holding.shares.toLocaleString('es-CL')}</td>
                        <td className="py-2.5 px-4 text-right font-mono text-slate-600">{formatCLP(holding.buyPrice, true)}</td>
                        <td className="py-2.5 px-4 text-right font-mono text-slate-600">{formatCLP(holding.currentPrice, true)}</td>
                        <td className="py-2.5 px-4 text-right font-mono text-slate-600">{formatCLP(indCost)}</td>
                        <td className="py-2.5 px-4 text-right font-mono text-slate-700">{formatCLP(indCurrentVal)}</td>
                        <td className="py-2.5 px-4 text-right">
                          {(() => {
                            if (holding.buyDate && holding.buyDate >= todayStr) {
                              return <span className="text-slate-300 font-mono">—</span>;
                            }
                            const mStock = marketStocks.find(s => normalizeTicker(s.ticker) === normalizeTicker(holding.ticker));
                            let prevClose = mStock?.previousClose;
                            const currentPrice = mStock?.price;
                            if ((prevClose == null || prevClose <= 0) && mStock?.changePercent != null && currentPrice) {
                              prevClose = currentPrice / (1 + mStock.changePercent / 100);
                            }
                            if (prevClose == null || prevClose <= 0 || currentPrice == null) {
                              return <span className="text-slate-300 font-mono">—</span>;
                            }
                            const dailyProfit = (currentPrice - prevClose) * holding.shares;
                            const dailyPct = ((currentPrice - prevClose) / prevClose) * 100;
                            return (
                              <span className={`font-mono font-semibold ${dailyProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                {dailyProfit >= 0 ? '+' : ''}{dailyPct.toFixed(2)}%
                              </span>
                            );
                          })()}
                        </td>
                        <td className="py-2.5 px-4 text-right">
                          <span className={`font-mono font-semibold ${indAbsProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {indAbsProfit >= 0 ? '+' : ''}{indRelProfit.toFixed(2)}%
                          </span>
                          <div className={`text-[10px] font-mono ${indAbsProfit >= 0 ? 'text-emerald-500' : 'text-rose-400'}`}>
                            {indAbsProfit >= 0 ? '+' : ''}{formatCLP(indAbsProfit)}
                          </div>
                        </td>
                        <td className="py-2.5 px-4 text-center"></td>
                        <td className="py-2.5 px-4 text-center">
                          <button
                            onClick={() => {
                              if (confirm(`¿Eliminar esta compra de ${holding.ticker} (${formatDateChilean(holding.buyDate)})?`)) {
                                onDeleteHolding(holding.id);
                              }
                            }}
                            className="p-1.5 text-rose-400 hover:bg-rose-50 rounded-lg transition"
                            title="Eliminar esta compra"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  };

                  return (
                    <React.Fragment key={h.ticker}>
                      {renderGroupedHeader()}
                      {isGrouped && isExpanded && holdings.filter(x => x.ticker === h.ticker).map(renderIndividualRow)}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
