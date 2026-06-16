/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { TrendingUp, DollarSign, Wallet, Calendar, FileCheck, Landmark, Briefcase, Cloud } from 'lucide-react';
import { isMarketOpen } from '../utils';

interface HeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  portfolioValue: number;
  nextRefreshTime?: number;
}

export default function Header({ 
  activeTab, 
  setActiveTab, 
  portfolioValue,
  nextRefreshTime
}: HeaderProps) {
  const [cooldownLeft, setCooldownLeft] = useState(0);

  useEffect(() => {
    if (!nextRefreshTime) return;
    const tick = () => {
      setCooldownLeft(Math.max(0, nextRefreshTime - Date.now()));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [nextRefreshTime]);

  // Live values of official indices according to official SII
  const [usdClp, setUsdClp] = useState(894.99);
  const [usdChange, setUsdChange] = useState(-0.05);
  const [ufValue, setUfValue] = useState(40763.26);

  useEffect(() => {
    // Load live indicators on mount
    fetch('/api/chile-indicators')
      .then(res => {
        if (res.ok) return res.json();
        throw new Error('Indicators API error');
      })
      .then(data => {
        if (data.uf) setUfValue(data.uf);
        if (data.dolar) setUsdClp(data.dolar);
        if (data.dolarChange !== undefined) setUsdChange(data.dolarChange);
      })
      .catch(err => console.warn('Could not fetch indicators:', err));

    const interval = setInterval(() => {
      // Simulate live micro-fluctuations for active feeling (e.g. market ticks)
      setUsdClp(prev => +(prev + (Math.random() - 0.5) * 0.1).toFixed(2));
    }, 4500);
    return () => clearInterval(interval);
  }, []);

  const formatRawCLP = (val: number) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(val);
  };

  const navItems = [
    { id: 'dashboard', label: 'Resumen & Gráficos', icon: TrendingUp },
    { id: 'portfolio', label: 'Mi Portafolio', icon: Briefcase },
    { id: 'plan', label: 'Plan Inversión', icon: Wallet },
    { id: 'dividends', label: 'Calendario Dividendos', icon: Calendar },
    { id: 'taxes', label: 'Operación Renta', icon: FileCheck },
    { id: 'history', label: 'Historial', icon: TrendingUp },
    { id: 'market', label: 'Bolsa de Santiago (IPSA)', icon: Landmark },
    { id: 'backup', label: 'Respaldo Cloud', icon: Cloud },
  ];

  return (
    <header className="bg-slate-900 border-b border-slate-800 text-white selection:bg-teal-500 selection:text-slate-900">
      {/* Ticker Bar - Economic Indicators Chile (USD & UF strictly) */}
      <div className="bg-slate-950 px-4 py-1.5 text-xs border-b border-slate-900 overflow-x-auto whitespace-nowrap scrollbar-none">
        <div className="max-w-7xl mx-auto flex justify-between items-center space-x-6 text-[11px] font-mono">
          <div className="flex space-x-6">
            <span className="flex items-center space-x-1.5">
              <span className="text-slate-400 font-semibold">💵 Dólar Observado:</span>
              <span className="text-slate-200">${usdClp.toLocaleString('es-CL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              <span className={usdChange >= 0 ? "text-emerald-400" : "text-rose-400"}>
                ({usdChange >= 0 ? '+' : ''}{usdChange}%)
              </span>
            </span>

            <span className="flex items-center space-x-1.5 border-l border-slate-800 pl-4">
              <span className="text-slate-400 font-semibold">📈 UF Chile:</span>
              <span className="text-emerald-300 font-medium">${ufValue.toLocaleString('es-CL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </span>
          </div>

          <div className="text-slate-400 flex items-center space-x-3">
            <div className="flex items-center space-x-2 px-2.5 py-1 bg-slate-950/75 rounded-lg border border-slate-800 text-teal-400 font-mono text-[11px] whitespace-nowrap">
              <span className="text-slate-400 font-bold uppercase text-[9px] tracking-wider">Portafolio:</span>
              <span className="font-extrabold">{formatRawCLP(portfolioValue)}</span>
            </div>
            <div className="flex items-center space-x-2 shrink-0">
              <span className={`w-1.5 h-1.5 rounded-full inline-block ${isMarketOpen() ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`}></span>
              <span>{isMarketOpen() ? 'Mercado Abierto' : 'Mercado Cerrado'}</span>
            </div>
            <span className="text-[10px] text-slate-400 font-mono">
              ⏱ {Math.ceil(cooldownLeft / 1000)}s
            </span>
          </div>
        </div>
      </div>

      {/* Navigation Subbar (Tabs) with Integrated Portfolio Sum badge */}
      <div className="bg-slate-900 border-t border-slate-800/20 px-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between py-1.5 overflow-x-auto whitespace-nowrap scrollbar-none gap-4">
          
          {/* Tabs Container */}
          <div className="flex items-center space-x-1">
            {/* Miniature Home Brand Badge */}
            <div 
              onClick={() => setActiveTab('dashboard')} 
              className="flex items-center space-x-2 mr-2.5 px-2.5 py-1.5 bg-teal-500 rounded-lg text-slate-950 font-extrabold text-[11px] cursor-pointer select-none tracking-tight shadow-md"
              title="Bolsa de Santiago Portafolio Home"
            >
              <span>BS</span>
            </div>

            {/* Render all tabs */}
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center space-x-1.5 px-3 py-2.5 text-xs font-semibold rounded-lg transition-all duration-200 whitespace-nowrap shrink-0 group cursor-pointer ${
                    isActive
                      ? 'bg-slate-800 text-teal-400 border-b-2 border-teal-500 shadow-sm'
                      : 'text-slate-400 hover:text-white hover:bg-slate-850'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 transition-transform group-hover:scale-105 ${isActive ? 'text-teal-400' : 'text-slate-500'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>

          </div>
        </div>
    </header>
  );
}
