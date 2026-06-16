import React, { useState, useEffect } from 'react';
import { StockHolding } from '../types';
import { formatCLP } from '../utils';
import { PlusCircle, X, AlertCircle, ArrowRight } from 'lucide-react';

interface Allocation {
  ticker: string;
  name: string;
  percent: number;
  inPlan: boolean;
  brokerPrice?: number;
  amount?: number;
}

interface InvestmentPlanProps {
  marketStocks: { ticker: string; name: string; price: number }[];
  holdings: StockHolding[];
}

const STORAGE_KEY = 'investment_plan_data';

export default function InvestmentPlan({ marketStocks }: InvestmentPlanProps) {
  const [budget, setBudget] = useState<number>(() => {
    try { return Number(localStorage.getItem('investment_plan_budget')) || 1000000; }
    catch { return 1000000; }
  });

  const [allocations, setAllocations] = useState<Allocation[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  const [selectedTicker, setSelectedTicker] = useState('');
  const [customTicker, setCustomTicker] = useState('');
  const [customName, setCustomName] = useState('');
  const [percent, setPercent] = useState<number | ''>(10);
  const [formAmount, setFormAmount] = useState<number | ''>('');
  const [formPrice, setFormPrice] = useState<number | ''>('');
  const [inPlan, setInPlan] = useState(true);
  const [isCustom, setIsCustom] = useState(false);
  const [formOpen, setFormOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem('investment_plan_budget', String(budget));
  }, [budget]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(allocations));
  }, [allocations]);

  const getPrice = (ticker: string): number => {
    const s = marketStocks.find(m => m.ticker === ticker);
    return s?.price || 0;
  };

  const effectivePrice = (a: Allocation): number => a.brokerPrice ?? getPrice(a.ticker);
  const amountFor = (a: Allocation): number => a.inPlan ? budget * a.percent / 100 : (a.amount ?? 0);
  const sharesFor = (a: Allocation): number => {
    const ep = effectivePrice(a);
    const amt = amountFor(a);
    return ep > 0 && amt > 0 ? Math.floor(amt / ep) : 0;
  };

  const planItems = allocations.filter(a => a.inPlan);
  const outsideItems = allocations.filter(a => !a.inPlan);

  const totalPercent = planItems.reduce((s, a) => s + a.percent, 0);
  const totalAllocated = planItems.reduce((s, a) => s + (budget * a.percent / 100), 0);
  const totalOutside = outsideItems.reduce((s, a) => s + amountFor(a), 0);
  const remainingBudget = budget - totalAllocated;
  const overBudget = totalPercent > 100;

  const addAllocation = () => {
    const ticker = isCustom ? customTicker.toUpperCase().trim() : selectedTicker;
    const name = isCustom ? customName : (marketStocks.find(s => s.ticker === ticker)?.name || ticker);
    if (!ticker) return alert('Selecciona o ingresa un ticker');
    if (inPlan && (!percent || Number(percent) <= 0)) return alert('Ingresa un porcentaje válido');
    if (!inPlan && (!formAmount || Number(formAmount) <= 0)) return alert('Ingresa un monto válido');
    if (allocations.some(a => a.ticker === ticker)) return alert('Esa acción ya está agregada');
    const bp = formPrice !== '' && Number(formPrice) > 0 ? Number(formPrice) : undefined;
    setAllocations(prev => [...prev, {
      ticker, name,
      percent: inPlan ? Number(percent) : 0,
      inPlan,
      brokerPrice: bp,
      amount: !inPlan ? Number(formAmount) : undefined
    }]);
    setCustomTicker('');
    setCustomName('');
    setPercent(10);
    setFormAmount('');
    setFormPrice('');
    setInPlan(true);
    setFormOpen(false);
  };

  const removeAllocation = (ticker: string) => {
    setAllocations(prev => prev.filter(a => a.ticker !== ticker));
  };

  const updatePercent = (ticker: string, newPercent: number) => {
    setAllocations(prev => prev.map(a => a.ticker === ticker ? { ...a, percent: newPercent } : a));
  };

  const updateBrokerPrice = (ticker: string, price: number) => {
    setAllocations(prev => prev.map(a => a.ticker === ticker ? { ...a, brokerPrice: price > 0 ? price : undefined } : a));
  };

  const updateAmount = (ticker: string, amount: number) => {
    setAllocations(prev => prev.map(a => a.ticker === ticker ? { ...a, amount: amount > 0 ? amount : undefined } : a));
  };

  const moveToPlan = (ticker: string) => {
    setAllocations(prev => prev.map(a => {
      if (a.ticker !== ticker) return a;
      const amt = amountFor(a);
      const newPercent = budget > 0 && amt > 0 ? Math.round((amt / budget) * 100 * 10) / 10 : 5;
      return { ...a, inPlan: true, percent: newPercent, amount: undefined };
    }));
  };

  const moveOutside = (ticker: string) => {
    setAllocations(prev => prev.map(a => {
      if (a.ticker !== ticker) return a;
      const amt = amountFor(a);
      return { ...a, inPlan: false, percent: 0, amount: amt > 0 ? amt : undefined };
    }));
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-lg font-bold text-slate-900 mb-4">Plan de Inversión</h2>

        {/* Budget Input */}
        <div className="mb-6">
          <label className="block text-xs font-medium text-slate-600 mb-1">Presupuesto Total (CLP)</label>
          <input
            type="number"
            value={budget}
            onChange={(e) => setBudget(Number(e.target.value))}
            className="w-full max-w-xs text-sm border border-slate-200 rounded-lg p-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 font-mono"
          />
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
            <span className="text-xs text-slate-500 uppercase tracking-wider font-medium">Presupuesto</span>
            <span className="text-xl font-bold font-mono text-slate-900 block mt-1">{formatCLP(budget)}</span>
          </div>
          <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
            <span className="text-xs text-slate-500 uppercase tracking-wider font-medium">Asignado al Plan</span>
            <span className={`text-xl font-bold font-mono block mt-1 ${totalPercent > 100 ? 'text-rose-600' : 'text-teal-600'}`}>
              {formatCLP(totalAllocated)}
            </span>
            <span className="text-xs text-slate-400 block">{totalPercent.toFixed(1)}% del presupuesto</span>
          </div>
          <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
            <span className="text-xs text-slate-500 uppercase tracking-wider font-medium">Fuera del Plan</span>
            <span className="text-xl font-bold font-mono text-slate-700 block mt-1">{formatCLP(totalOutside)}</span>
            <span className="text-xs text-slate-400 block">{outsideItems.length} acción{outsideItems.length !== 1 ? 'es' : ''}</span>
          </div>
        </div>

        {overBudget && (
          <div className="flex items-center gap-2 p-3 bg-rose-50 border border-rose-200 rounded-lg mb-4 text-sm text-rose-700">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>La suma de porcentajes supera el 100%. Ajusta los porcentajes o mueve acciones fuera del plan.</span>
          </div>
        )}

        {/* Add Allocation Button */}
        <button
          onClick={() => setFormOpen(!formOpen)}
          className="flex items-center space-x-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium px-4 py-2 rounded-lg transition mb-4"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Agregar Acción</span>
        </button>

        {/* Add Form */}
        {formOpen && (
          <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 mb-4 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Acción</label>
                <select
                  value={isCustom ? 'CUSTOM' : selectedTicker}
                  onChange={(e) => {
                    if (e.target.value === 'CUSTOM') { setIsCustom(true); setSelectedTicker(''); }
                    else { setIsCustom(false); setSelectedTicker(e.target.value); }
                  }}
                  className="w-full text-xs border border-slate-200 rounded-lg p-2 bg-white"
                >
                  <option value="">Seleccionar...</option>
                  {[...marketStocks].sort((a, b) => a.ticker.localeCompare(b.ticker)).map(s => (
                    <option key={s.ticker} value={s.ticker}>{s.ticker} - {s.name}</option>
                  ))}
                  <option value="CUSTOM">OTRA (Personalizado)</option>
                </select>
              </div>
              {isCustom && (
                <>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Ticker</label>
                    <input type="text" value={customTicker} onChange={(e) => setCustomTicker(e.target.value.toUpperCase())} placeholder="Ej: COLBUN" className="w-full text-xs border border-slate-200 rounded-lg p-2 bg-white" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Nombre</label>
                    <input type="text" value={customName} onChange={(e) => setCustomName(e.target.value)} placeholder="Ej: Colbún S.A." className="w-full text-xs border border-slate-200 rounded-lg p-2 bg-white" />
                  </div>
                </>
              )}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Tipo</label>
                <select
                  value={inPlan ? 'plan' : 'outside'}
                  onChange={(e) => setInPlan(e.target.value === 'plan')}
                  className="w-full text-xs border border-slate-200 rounded-lg p-2 bg-white"
                >
                  <option value="plan">En el Plan</option>
                  <option value="outside">Fuera del Plan</option>
                </select>
              </div>
              {inPlan ? (
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Porcentaje (%)</label>
                  <input
                    type="number" step="0.1" min="0.1" max="100"
                    value={percent} onChange={(e) => setPercent(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full text-xs border border-slate-200 rounded-lg p-2 bg-white"
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Monto a invertir (CLP)</label>
                  <input
                    type="number" min="1"
                    value={formAmount} onChange={(e) => setFormAmount(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full text-xs border border-slate-200 rounded-lg p-2 bg-white font-mono"
                  />
                </div>
              )}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Precio broker (opcional)</label>
                <input
                  type="number" step="0.01" min="0"
                  value={formPrice} onChange={(e) => setFormPrice(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder={(() => {
                    const ticker = isCustom ? customTicker.toUpperCase().trim() : selectedTicker;
                    if (!ticker) return 'Automático';
                    const p = getPrice(ticker);
                    return p > 0 ? `Auto: ${formatCLP(p, true)}` : 'Automático';
                  })()}
                  className="w-full text-xs border border-slate-200 rounded-lg p-2 bg-white font-mono"
                />
              </div>
              <div className="flex items-end">
                <button onClick={addAllocation} className="bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold px-4 py-2 rounded-lg transition w-full">
                  Agregar
                </button>
              </div>
            </div>
          </div>
        )}

        {allocations.length === 0 && (
          <div className="text-center py-8 text-slate-400 text-sm">
            <p>No has agregado acciones.</p>
            <p className="text-xs mt-1">Define tu presupuesto y agrega las acciones indicando si entran en el plan o quedan fuera.</p>
          </div>
        )}

        {/* Two Grids */}
        {allocations.length > 0 && (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {/* Plan Grid */}
            <div>
              <h3 className="text-sm font-semibold text-teal-700 bg-teal-50 px-3 py-2 rounded-lg mb-3 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-teal-500"></span>
                En el Plan ({planItems.length})
              </h3>
              {planItems.length === 0 ? (
                <div className="text-center py-6 text-slate-400 text-xs border border-dashed border-slate-200 rounded-lg">
                  Sin acciones en el plan
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                        <th className="py-2.5 px-2">Acción</th>
                        <th className="py-2.5 px-2 text-right">%</th>
                        <th className="py-2.5 px-2 text-right">Precio</th>
                        <th className="py-2.5 px-2 text-right">Monto</th>
                        <th className="py-2.5 px-2 text-right">Accs.</th>
                        <th className="py-2.5 px-2 text-center"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {planItems.map((a) => {
                        const ep = effectivePrice(a);
                        const amt = amountFor(a);
                        const shares = sharesFor(a);
                        return (
                          <tr key={a.ticker} className="hover:bg-slate-50/50 transition">
                            <td className="py-2.5 px-2">
                              <span className="font-semibold text-slate-900">{a.ticker}</span>
                              <span className="text-[10px] text-slate-400 ml-1">{a.name}</span>
                            </td>
                            <td className="py-2.5 px-2 text-right">
                              <input
                                type="number" step="0.1" min="0" max="100"
                                value={a.percent}
                                onChange={(e) => updatePercent(a.ticker, Number(e.target.value))}
                                className="w-14 text-right text-xs border border-slate-200 rounded p-1 font-mono"
                              />
                            </td>
                            <td className="py-2.5 px-2 text-right">
                              <input
                                type="number" step="0.01" min="0"
                                value={ep > 0 ? ep : ''}
                                onChange={(e) => updateBrokerPrice(a.ticker, Number(e.target.value))}
                                placeholder="—"
                                className="w-20 text-right text-xs border border-slate-200 rounded p-1 font-mono text-slate-700"
                              />
                            </td>
                            <td className="py-2.5 px-2 text-right font-mono font-semibold text-slate-900">
                              {formatCLP(amt)}
                            </td>
                            <td className="py-2.5 px-2 text-right font-mono font-semibold text-slate-900">
                              {shares > 0 ? shares.toLocaleString('es-CL') : '—'}
                            </td>
                            <td className="py-2.5 px-2 text-center">
                              <div className="flex items-center justify-center gap-1">
                                <button onClick={() => moveOutside(a.ticker)} className="p-1 text-amber-500 hover:text-amber-600 transition" title="Mover fuera del plan">
                                  <ArrowRight className="w-3.5 h-3.5" />
                                </button>
                                <button onClick={() => removeAllocation(a.ticker)} className="p-1 text-rose-400 hover:text-rose-600 transition" title="Eliminar">
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Outside Grid */}
            <div>
              <h3 className="text-sm font-semibold text-slate-500 bg-slate-100 px-3 py-2 rounded-lg mb-3 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                Fuera del Plan ({outsideItems.length})
              </h3>
              {outsideItems.length === 0 ? (
                <div className="text-center py-6 text-slate-400 text-xs border border-dashed border-slate-200 rounded-lg">
                  Sin acciones fuera del plan
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                        <th className="py-2.5 px-2">Acción</th>
                        <th className="py-2.5 px-2 text-right">Precio</th>
                        <th className="py-2.5 px-2 text-right">Monto</th>
                        <th className="py-2.5 px-2 text-right">Accs.</th>
                        <th className="py-2.5 px-2 text-center"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {outsideItems.map((a) => {
                        const ep = effectivePrice(a);
                        const amt = amountFor(a);
                        const shares = sharesFor(a);
                        return (
                          <tr key={a.ticker} className="hover:bg-slate-50/50 transition">
                            <td className="py-2.5 px-2">
                              <span className="font-semibold text-slate-500">{a.ticker}</span>
                              <span className="text-[10px] text-slate-400 ml-1">{a.name}</span>
                            </td>
                            <td className="py-2.5 px-2 text-right">
                              <input
                                type="number" step="0.01" min="0"
                                value={ep > 0 ? ep : ''}
                                onChange={(e) => updateBrokerPrice(a.ticker, Number(e.target.value))}
                                placeholder="—"
                                className="w-20 text-right text-xs border border-slate-200 rounded p-1 font-mono text-slate-500"
                              />
                            </td>
                            <td className="py-2.5 px-2 text-right">
                              <input
                                type="number" min="0"
                                value={amt > 0 ? amt : ''}
                                onChange={(e) => updateAmount(a.ticker, Number(e.target.value))}
                                placeholder="—"
                                className="w-24 text-right text-xs border border-slate-200 rounded p-1 font-mono text-slate-700"
                              />
                            </td>
                            <td className="py-2.5 px-2 text-right font-mono font-semibold text-slate-900">
                              {shares > 0 ? shares.toLocaleString('es-CL') : '—'}
                            </td>
                            <td className="py-2.5 px-2 text-center">
                              <div className="flex items-center justify-center gap-1">
                                <button onClick={() => moveToPlan(a.ticker)} className="p-1 text-teal-500 hover:text-teal-600 transition" title="Mover al plan">
                                  <ArrowRight className="w-3.5 h-3.5 rotate-180" />
                                </button>
                                <button onClick={() => removeAllocation(a.ticker)} className="p-1 text-rose-400 hover:text-rose-600 transition" title="Eliminar">
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
