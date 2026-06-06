/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { MarketStock, StockAlert } from '../types';
import { formatCLP, formatPercent } from '../utils';
import { Search, Flame, TrendingUp, TrendingDown, DollarSign, PlusCircle, Check, Sparkles, Filter, Trash2, RotateCw, X, Star, Bell, RotateCcw } from 'lucide-react';
import StockHistoryVisualizer from './StockHistoryVisualizer';

interface MarketWatchProps {
  marketStocks: MarketStock[];
  onQuickBuy: (ticker: string) => void;
  holdings: { ticker: string }[];
  onSearchAndAddStock?: (stock: MarketStock) => void;
  onDeleteStock?: (ticker: string) => void;
  deletedStocksCount?: number;
  onRestoreAllStocks?: () => void;
  onRefreshPrices?: () => void;
  isRefreshing?: boolean;
  alerts?: StockAlert[];
  onToggleAlert?: (ticker: string, currentPrice: number) => void;
  onUpdateTargetPrice?: (ticker: string, targetPrice: number) => void;
  onResetAlert?: (ticker: string) => void;
}

export default function MarketWatch({ 
  marketStocks, 
  onQuickBuy, 
  holdings, 
  onSearchAndAddStock,
  onDeleteStock,
  deletedStocksCount = 0,
  onRestoreAllStocks,
  onRefreshPrices,
  isRefreshing = false,
  alerts = [],
  onToggleAlert,
  onUpdateTargetPrice,
  onResetAlert
}: MarketWatchProps) {
  const [search, setSearch] = useState('');
  const [selectedSector, setSelectedSector] = useState('ALL');
  const [portfolioFilter, setPortfolioFilter] = useState<'ALL' | 'OWNED' | 'NOT_OWNED'>('ALL');
  const [justBoughtTicker, setJustBoughtTicker] = useState<string | null>(null);
  const [expandedTicker, setExpandedTicker] = useState<string | null>(null);

  // States for the custom stock real-time search box
  const [customTicker, setCustomTicker] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [searchSuccess, setSearchSuccess] = useState('');

  const handleSearchAndAdd = async () => {
    if (!customTicker.trim()) return;
    setIsSearching(true);
    setSearchError('');
    setSearchSuccess('');

    try {
      const resp = await fetch(`/api/search-stock?ticker=${encodeURIComponent(customTicker.trim())}`);
      if (!resp.ok) {
        throw new Error(`El nemotécnico "${customTicker.trim().toUpperCase()}" no arrojó resultados o Yahoo Finance no respondió.`);
      }
      const data = await resp.json();
      if (data && data.ticker) {
        if (onSearchAndAddStock) {
          onSearchAndAddStock(data);
        }
        setSearchSuccess(`${data.ticker} - ${data.name}`);
        setCustomTicker('');
        setSearch(data.ticker); // Pre-fill searching to locate in list
        setTimeout(() => setSearchSuccess(''), 8000);
      } else {
        throw new Error('Respuesta inválida de la Bolsa');
      }
    } catch (err: any) {
      setSearchError(err?.message || 'Error al conectar con la Bolsa de Santiago.');
    } finally {
      setIsSearching(false);
    }
  };

  const sectors = ['ALL', ...Array.from(new Set(marketStocks.map(s => s.sector)))];

  const handleSimulateBuy = (ticker: string) => {
    onQuickBuy(ticker);
    setJustBoughtTicker(ticker);
    setTimeout(() => {
      setJustBoughtTicker(null);
    }, 2500);
  };

  const filteredStocks = marketStocks.filter(stock => {
    const matchesSearch = stock.ticker.toLowerCase().includes(search.toLowerCase()) || 
                          stock.name.toLowerCase().includes(search.toLowerCase());
    const matchesSector = selectedSector === 'ALL' || stock.sector === selectedSector;
    
    const isAlreadyOwned = holdings.some(h => h.ticker === stock.ticker);
    const matchesPortfolio = portfolioFilter === 'ALL' ||
                             (portfolioFilter === 'OWNED' && isAlreadyOwned) ||
                             (portfolioFilter === 'NOT_OWNED' && !isAlreadyOwned);

    return matchesSearch && matchesSector && matchesPortfolio;
  });

  return (
    <div className="space-y-6">
      {/* Intro info card */}
      <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white rounded-xl p-6 border border-slate-800 shadow-lg animate-fadeIn">
        <div className="max-w-2xl">
          <div className="flex items-center space-x-2 text-teal-400 font-semibold text-xs tracking-wider uppercase">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span>DATOS EN REAL-TIME (YAHOO FINANCE IPSA)</span>
          </div>
          <h2 className="text-xl font-bold mt-2">Bolsa de Santiago (Santiago Stock Exchange)</h2>
          <p className="text-xs text-slate-300 mt-2 leading-relaxed">
            Consulte y analice en tiempo real las principales acciones transadas en Chile. Los datos de precio, variación porcentual diaria y rentabilidad por dividendos se recogen en línea para asegurar un seguimiento fidedigno de sus inversiones.
          </p>
        </div>
      </div>

      {/* Dynamic Search & Add Custom Chilean Stocks */}
      <div className="bg-slate-900 text-white p-4 rounded-xl border border-slate-800 shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h3 className="text-xs font-bold text-teal-400 flex items-center gap-1.5 uppercase font-mono">
            <Sparkles className="w-3.5 h-3.5 text-teal-400 animate-pulse" />
            ¿Buscar cualquier indicador o acción chilena?
          </h3>
          <p className="text-[11px] text-slate-300">
            Ingresa y agrega cualquier nemotécnico de la Bolsa de Santiago (ej: CENCOSUD, ENTEL, COLBUN, AGUAS-A, ECONSUR, etc).
          </p>
        </div>
        <div className="flex w-full md:w-auto items-center gap-2">
          <div className="relative w-full md:w-44">
            <input
              type="text"
              className="w-full text-xs pl-3 pr-8 py-2 border border-slate-700 bg-slate-950 rounded-lg text-teal-300 uppercase placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 font-mono font-bold"
              placeholder="NEMOTÉCNICO (ej: ENTEL)"
              value={customTicker}
              onChange={(e) => {
                setCustomTicker(e.target.value);
                setSearchError('');
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSearchAndAdd();
              }}
            />
            {customTicker && (
              <button
                onClick={() => {
                  setCustomTicker('');
                  setSearchError('');
                }}
                className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-teal-300 cursor-pointer"
                title="Limpiar"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <button
            onClick={handleSearchAndAdd}
            disabled={isSearching || !customTicker.trim()}
            className="shrink-0 bg-teal-500 hover:bg-teal-600 disabled:bg-slate-800 text-slate-950 text-xs font-bold px-4 py-2 rounded-lg transition flex items-center gap-1.5 shadow-sm font-mono"
          >
            {isSearching ? (
              <>
                <span className="w-3 h-3 border-2 border-slate-950/30 border-t-slate-950 rounded-full animate-spin"></span>
                <span>BUSCANDO...</span>
              </>
            ) : (
              <>
                <Search className="w-3.5 h-3.5" />
                <span>BUSCAR</span>
              </>
            )}
          </button>
        </div>
      </div>

      {searchError && (
        <div className="text-rose-400 text-xs mt-1 bg-rose-950/40 border border-rose-900 rounded-lg p-3 flex items-center gap-2 animate-fadeIn font-mono">
          <span>⚠️ Error: {searchError}</span>
        </div>
      )}

      {searchSuccess && (
        <div className="text-emerald-300 text-xs mt-1 bg-emerald-950/40 border border-emerald-900 rounded-lg p-3 flex flex-col gap-1 animate-fadeIn">
          <span className="font-bold font-mono">📈 ¡Nemotécnico encontrado y cargado con éxito!</span>
          <span className="text-slate-300">Se agregó <strong>{searchSuccess}</strong> a la grilla inferior de la Bolsa de Santiago. Ya puedes agregarlo a tu portafolio o simular compras.</span>
        </div>
      )}

      {deletedStocksCount > 0 && (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex justify-between items-center text-xs text-slate-600 animate-fadeIn">
          <span className="flex items-center gap-2">
            <span className="text-base">ℹ️</span>
            <span>Se han ocultado o eliminado <strong>{deletedStocksCount}</strong> {deletedStocksCount === 1 ? 'empresa' : 'empresas'} de la grilla de la Bolsa de Santiago.</span>
          </span>
          <button
            onClick={onRestoreAllStocks}
            className="text-teal-600 hover:text-teal-700 hover:underline font-bold bg-white border border-slate-200 px-3 py-1.5 rounded-lg transition shrink-0 shadow-xs"
          >
            Restaurar todas
          </button>
        </div>
      )}

      {/* Filters and Search Bar */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row gap-4 items-stretch lg:items-center justify-between">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
              <Search className="w-4 h-4" />
            </span>
            <input
              type="text"
              className="w-full text-xs pl-9 pr-8 py-2 border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition"
              placeholder="Buscar por nemotécnico o empresa..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-650 cursor-pointer"
                title="Limpiar"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Portfolio Status Filter Toggle */}
          <div className="flex items-center space-x-2 overflow-x-auto pb-1 lg:pb-0 scrollbar-none shrink-0">
            <span className="text-xs font-bold text-slate-700 flex items-center gap-1 shrink-0">
              💼 Portafolio:
            </span>
            <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200">
              <button
                onClick={() => setPortfolioFilter('ALL')}
                className={`px-3 py-1.5 rounded-md text-[11px] font-bold transition whitespace-nowrap ${
                  portfolioFilter === 'ALL'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Todas
              </button>
              <button
                onClick={() => setPortfolioFilter('OWNED')}
                className={`px-3 py-1.5 rounded-md text-[11px] font-bold transition whitespace-nowrap flex items-center gap-1 ${
                  portfolioFilter === 'OWNED'
                    ? 'bg-teal-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                En mi Portafolio
                <span className="bg-emerald-200 text-emerald-950 font-mono text-[9px] px-1.5 py-0.2 rounded-full leading-tight font-bold">
                  {holdings.length}
                </span>
              </button>
              <button
                onClick={() => setPortfolioFilter('NOT_OWNED')}
                className={`px-3 py-1.5 rounded-md text-[11px] font-bold transition whitespace-nowrap ${
                  portfolioFilter === 'NOT_OWNED'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Fuera del Portafolio
              </button>
            </div>

            {onRefreshPrices && (
              <button
                onClick={onRefreshPrices}
                disabled={isRefreshing}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 disabled:bg-slate-50 text-slate-700 disabled:text-slate-400 border border-slate-200 rounded-lg text-[11px] font-bold transition shrink-0 shadow-xs cursor-pointer"
                title="Actualizar precios en tiempo real"
              >
                <RotateCw className={`w-3.5 h-3.5 text-teal-600 ${isRefreshing ? 'animate-spin' : ''}`} />
                <span>{isRefreshing ? 'Actualizando...' : 'Actualizar precio'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Sector Tabs (Second Row) */}
        <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
          <span className="text-xs font-semibold text-slate-500 flex items-center gap-1 shrink-0 mr-1">
            <Filter className="w-3.5 h-3.5" /> Sector:
          </span>
          <div className="flex flex-wrap gap-1.5 pl-1">
            {sectors.map(sector => (
              <button
                key={sector}
                onClick={() => setSelectedSector(sector)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition whitespace-nowrap ${
                  selectedSector === sector
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-50 text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                {sector === 'ALL' ? 'Todos los Sectores' : sector}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Stock List Panel */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 font-semibold text-slate-500 uppercase tracking-wider">
              <th className="py-3 px-2 w-10 text-center">⭐</th>
              <th className="py-3 px-4">Nemotécnico</th>
              <th className="py-3 px-4 font-normal">Nombre Corto</th>
              <th className="py-3 px-4 text-right">Precio Actual</th>
              <th className="py-3 px-4 text-center bg-teal-50/25">Límite Alerta 🔔</th>
              <th className="py-3 px-4 text-right">Var. Diaria</th>
              <th className="py-3 px-4 text-right">Rendimiento dividendo % (Est.)</th>
              <th className="py-3 px-4 font-normal pl-6">Sector Principal</th>
              <th className="py-3 px-4 text-right">Volumen Diario</th>
              <th className="py-3 px-4 text-center">Inversión</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredStocks.map((stock) => {
              const isAlreadyOwned = holdings.some(h => h.ticker === stock.ticker);
              const isTickingBuy = justBoughtTicker === stock.ticker;
              const alert = alerts.find(a => a.ticker === stock.ticker);
              const isStarred = !!alert;
              const isExpanded = expandedTicker === stock.ticker;

              return (
                <React.Fragment key={stock.ticker}>
                  <tr className={`hover:bg-slate-50/50 transition ${isStarred ? 'bg-amber-50/10' : ''} ${isExpanded ? 'bg-slate-50' : ''}`}>
                    {/* Star Favorite Indicator Column */}
                    <td className="py-4 px-2 text-center">
                      <button
                        onClick={() => onToggleAlert && onToggleAlert(stock.ticker, stock.price)}
                        title={isStarred ? "Quitar de favoritas / Desactivar alerta sonoro" : "Marcar como favorita y activar alerta sonora"}
                        className={`p-1.5 rounded-full transition-all hover:scale-110 active:scale-95 cursor-pointer ${
                          isStarred 
                            ? 'text-amber-500 fill-amber-400 drop-shadow-xs' 
                            : 'text-slate-300 hover:text-amber-400'
                        }`}
                      >
                        <Star className="w-4 h-4" />
                      </button>
                    </td>

                    {/* Ticker (Clickable Toggle to expand detail) */}
                    <td className="py-4 px-4 font-mono">
                      <button
                        onClick={() => setExpandedTicker(isExpanded ? null : stock.ticker)}
                        className="font-bold text-slate-900 text-sm hover:text-teal-600 hover:underline transition-colors focus:outline-none text-left cursor-pointer flex items-center gap-1 group"
                        title="Haz clic para ver la fluctuación histórica y configurar rangos"
                      >
                        <span className="group-hover:text-teal-600">{stock.ticker}</span>
                        <span className="text-[10px] text-slate-400 font-sans font-normal opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap ml-1">
                          ({isExpanded ? 'Ocultar info 📊' : 'Ver info 📊'})
                        </span>
                      </button>
                      {isAlreadyOwned && (
                        <span className="ml-2 bg-teal-50 text-teal-800 text-[9px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap inline-block mt-0.5">
                          En Portafolio
                        </span>
                      )}
                    </td>

                  {/* Name */}
                  <td className="py-4 px-4 text-slate-600 font-medium">
                    {stock.name}
                  </td>

                  {/* Price */}
                  <td className="py-4 px-4 text-right font-bold text-slate-800 font-mono">
                    {formatCLP(stock.price, true)}
                  </td>

                  {/* Limit Price Alarm Configuration Column */}
                  <td className="py-2 px-4 text-center bg-teal-50/10 border-x border-teal-50/20">
                    {isStarred && alert ? (
                      alert.triggered ? (
                        <div className="flex flex-col items-center justify-center space-y-1">
                          <span className="text-[10px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-md animate-pulse inline-flex items-center gap-1">
                            <Bell className="w-3 h-3 text-rose-500 shrink-0" />
                            ¡BAJÓ DE LÍMITE!
                          </span>
                          <span className="text-[9px] font-medium text-slate-500">
                            Fijado: {formatCLP(alert.starredPrice)}
                          </span>
                          <button
                            onClick={() => onResetAlert && onResetAlert(stock.ticker)}
                            className="text-[10px] font-bold text-teal-600 hover:text-teal-800 hover:underline inline-flex items-center gap-1 mt-0.5 cursor-pointer bg-white border border-slate-200 shadow-xs px-1.5 py-0.5 rounded"
                            title="Haz clic para volver a monitorear con los precios actuales"
                          >
                            <RotateCcw className="w-2.5 h-2.5" />
                            Monitorear de nuevo
                          </button>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center space-y-1">
                          <div className="flex items-center gap-1 bg-white border border-slate-300 rounded-lg px-2 py-0.5 shadow-xs">
                            <span className="text-slate-400 font-mono text-[10px] font-bold">$</span>
                            <input
                              type="number"
                              value={alert.targetPrice}
                              onChange={(e) => {
                                const val = Number(e.target.value);
                                if (onUpdateTargetPrice && val >= 0) {
                                  onUpdateTargetPrice(stock.ticker, val);
                                }
                              }}
                              className="w-20 bg-transparent text-center text-xs font-mono font-bold text-slate-800 focus:outline-none"
                              title="Configura el precio mínimo que activará la alerta sonorizada"
                            />
                          </div>
                          <span className="text-[9px] text-slate-400 italic">
                            Iniciado en: {formatCLP(alert.starredPrice)}
                          </span>
                        </div>
                      )
                    ) : (
                      <button
                        onClick={() => onToggleAlert && onToggleAlert(stock.ticker, stock.price)}
                        className="text-[10px] text-slate-500 hover:text-teal-600 font-bold transition flex items-center justify-center gap-1 mx-auto bg-slate-50 hover:bg-slate-100 px-2.5 py-1.5 rounded-lg border border-slate-200 cursor-pointer"
                      >
                        <Star className="w-3 h-3" /> Configurar Alerta
                      </button>
                    )}
                  </td>

                  {/* Change % */}
                  <td className="py-4 px-4 text-right font-mono">
                    <span className={`inline-flex items-center space-x-0.5 px-2 py-0.5 rounded-md font-semibold text-[11px] ${
                      stock.changePercent >= 0 
                        ? 'bg-emerald-50 text-emerald-700' 
                        : 'bg-rose-50 text-rose-700'
                    }`}>
                      {stock.changePercent >= 0 ? '+' : ''}{stock.changePercent.toFixed(2)}%
                    </span>
                  </td>

                  {/* Dividend Yield */}
                  <td className="py-4 px-4 text-right font-semibold text-indigo-700 font-mono">
                    {stock.dividendYield.toFixed(1)}%
                  </td>

                  {/* Sector */}
                  <td className="py-4 px-4 text-slate-500 pl-6">
                    {stock.sector}
                  </td>

                  {/* Volume */}
                  <td className="py-4 px-4 text-right text-slate-400 font-mono">
                    {formatCLP(stock.volumeCLP)}
                  </td>

                  {/* Actions */}
                  <td className="py-4 px-4 text-center">
                    <div className="flex items-center justify-center space-x-2">
                      <button
                        onClick={() => handleSimulateBuy(stock.ticker)}
                        disabled={isTickingBuy}
                        className={`flex items-center space-x-1 text-xs font-semibold px-3 py-1.5 rounded-lg transition shrink-0 ${
                          isTickingBuy
                            ? 'bg-emerald-600 text-white'
                            : 'bg-teal-50 text-teal-700 hover:bg-teal-100'
                        }`}
                      >
                        {isTickingBuy ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>¡Cargado!</span>
                          </>
                        ) : (
                          <>
                            <PlusCircle className="w-3.5 h-3.5" />
                            <span>Simular Compra</span>
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => onDeleteStock && onDeleteStock(stock.ticker)}
                        disabled={isAlreadyOwned}
                        title={isAlreadyOwned ? "Este nemotécnico está activo en su portafolio. No se puede eliminar por seguridad." : "Eliminar de la grilla"}
                        className={`p-1.5 rounded-lg transition shrink-0 ${
                          isAlreadyOwned
                            ? 'text-slate-200 cursor-not-allowed opacity-40'
                            : 'text-slate-400 hover:text-rose-600 hover:bg-rose-50'
                        }`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>

                {/* Expanded stock history fluctuation detail row */}
                {isExpanded && (
                  <tr key={`${stock.ticker}-detail`}>
                    <td colSpan={10} className="px-5 py-4 bg-slate-100/50 border-y border-slate-200">
                      <StockHistoryVisualizer
                        stock={stock}
                        onClose={() => setExpandedTicker(null)}
                      />
                    </td>
                  </tr>
                )}
              </React.Fragment>
              );
            })}
          </tbody>
        </table>
        {filteredStocks.length === 0 && (
          <div className="p-8 text-center text-slate-400">
            No se encontraron acciones con los filtros actuales.
          </div>
        )}
      </div>
    </div>
  );
}
