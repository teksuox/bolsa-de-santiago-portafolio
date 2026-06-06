/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { StockHolding } from '../types';
import { formatCLP, formatPercent, formatDateChilean } from '../utils';
import { PlusCircle, Trash2, Edit2, Check, X, RefreshCw, Landmark, HelpCircle, Flame, ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface MyPortfolioProps {
  holdings: StockHolding[];
  onAddHolding: (holding: Omit<StockHolding, 'id'>) => void;
  onUpdateHoldingPrice: (id: string, newPrice: number) => void;
  onUpdateHoldingYield: (id: string, newYield: number) => void;
  onDeleteHolding: (id: string) => void;
  marketStocks: { ticker: string; name: string; price: number; dividendYield: number }[];
}

export default function MyPortfolio({
  holdings,
  onAddHolding,
  onUpdateHoldingPrice,
  onUpdateHoldingYield,
  onDeleteHolding,
  marketStocks
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

  const startEditPrice = (h: StockHolding) => {
    setEditingId(h.id);
    setEditPrice(h.currentPrice);
  };

  const saveEditPrice = (id: string) => {
    if (editPrice <= 0) return;
    onUpdateHoldingPrice(id, editPrice);
    setEditingId(null);
  };

  const startEditYield = (h: StockHolding) => {
    setEditingYieldId(h.id);
    setEditYield(h.annualTargetYield);
  };

  const saveEditYield = (id: string) => {
    if (editYield < 0) return;
    onUpdateHoldingYield(id, editYield);
    setEditingYieldId(null);
  };

  // Capital aggregation
  const totalContributed = holdings.reduce((sum, h) => sum + (h.shares * h.buyPrice), 0);
  const totalCurrent = holdings.reduce((sum, h) => sum + (h.shares * h.currentPrice), 0);
  const totalGainLoss = totalCurrent - totalContributed;
  const totalGainLossPercent = totalContributed > 0 ? (totalGainLoss / totalContributed) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Overview Metric Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
        <div className="overflow-x-auto">
          {holdings.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <HelpCircle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-sm font-semibold">No tienes acciones registradas</p>
              <p className="text-xs mt-1">Utiliza el botón de registrar o añade acciones de prueba desde la pestaña "Bolsa de Santiago" para comenzar.</p>
            </div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Nemotécnico / Empresa</th>
                  <th className="py-3 px-4 text-right">Cant. Acciones</th>
                  <th className="py-3 px-4 text-right">Precio Compra</th>
                  <th className="py-3 px-4 text-right group relative cursor-help">
                    Precio Mercado (CLP)
                    <span className="invisible group-hover:visible absolute top-full right-4 mt-2 p-2 bg-slate-900 text-white text-[10px] rounded-lg w-48 font-normal leading-normal shadow-lg z-20 whitespace-normal">
                      Haz clic en el lápiz para simular fluctuaciones de precio en tiempo real.
                    </span>
                  </th>
                  <th className="py-3 px-4 text-right">Costo Total</th>
                  <th className="py-3 px-4 text-right">Valor actual</th>
                  <th className="py-3 px-4 text-right">Rentabilidad (%)</th>
                  <th className="py-3 px-4 text-center">Rendimiento Objetivo anual %</th>
                  <th className="py-3 px-4 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {holdings.map((h) => {
                  const cost = h.shares * h.buyPrice;
                  const currentVal = h.shares * h.currentPrice;
                  const absProfit = currentVal - cost;
                  const relativeProfit = cost > 0 ? (absProfit / cost) * 100 : 0;

                  return (
                    <tr key={h.id} className="hover:bg-slate-50/50 transition duration-150">
                      {/* Name/Ticker */}
                      <td className="py-4 px-4">
                        <div className="font-bold text-slate-900 group flex items-center space-x-1.5">
                          <span className="text-slate-900 hover:text-teal-600 transition">{h.ticker}</span>
                          <span className="text-[10px] text-slate-400 font-normal truncate max-w-[120px]">{h.name}</span>
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">Adquirido: {formatDateChilean(h.buyDate)}</div>
                      </td>

                      {/* Shares */}
                      <td className="py-4 px-4 text-right font-semibold text-slate-800 font-mono">
                        {h.shares.toLocaleString('es-CL')}
                      </td>

                      {/* Buy Price */}
                      <td className="py-4 px-4 text-right text-slate-700 font-mono">
                        {formatCLP(h.buyPrice, true)}
                      </td>

                      {/* Current Price (Editable) */}
                      <td className="py-4 px-4 text-right font-mono">
                        {editingId === h.id ? (
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
                              onClick={() => saveEditPrice(h.id)}
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
                            <button
                              onClick={() => startEditPrice(h)}
                              className="text-slate-400 hover:text-teal-500 opacity-0 group-hover:opacity-100 transition"
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

                      {/* Rendimiento */}
                      <td className="py-4 px-4 text-right">
                        <div className={`font-semibold font-mono ${absProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {absProfit >= 0 ? '+' : ''}{relativeProfit.toFixed(2)}%
                        </div>
                        <div className={`text-[10px] font-mono ${absProfit >= 0 ? 'text-emerald-500' : 'text-rose-400'}`}>
                          {absProfit >= 0 ? '+' : ''}{formatCLP(absProfit)}
                        </div>
                      </td>

                      {/* Annual Target Yield (Editable) */}
                      <td className="py-4 px-4 text-center font-mono">
                        {editingYieldId === h.id ? (
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
                              onClick={() => saveEditYield(h.id)}
                              className="p-1 rounded text-emerald-600 hover:bg-emerald-50 transition"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setEditingYieldId(null)}
                              className="p-1 rounded text-slate-400 hover:bg-slate-100 transition"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center space-x-1 group cursor-pointer" onClick={() => startEditYield(h)}>
                            <span className="text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded font-bold">{h.annualTargetYield.toFixed(1)}%</span>
                            <Edit2 className="w-3 h-3 text-indigo-400 opacity-0 group-hover:opacity-100 transition" />
                          </div>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-4 text-center">
                        <button
                          onClick={() => onDeleteHolding(h.id)}
                          className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition"
                          title="Eliminar acción de mi portafolio"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
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
