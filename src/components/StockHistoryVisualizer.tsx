import React, { useState, useMemo, useEffect } from 'react';
import { MarketStock } from '../types';
import { generateStockHistory, getPriceOnOrClosestTo, HistoryPoint } from '../utils/stockHistory';
import { formatCLP, formatPercent } from '../utils';
import { Calendar, TrendingUp, TrendingDown, Clock, Search, X, RefreshCw, LineChart, HelpCircle } from 'lucide-react';

interface StockHistoryVisualizerProps {
  stock: MarketStock;
  onClose: () => void;
}

export default function StockHistoryVisualizer({ stock, onClose }: StockHistoryVisualizerProps) {
  const [realHistory, setRealHistory] = useState<HistoryPoint[] | null>(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function fetchHistory() {
      try {
        const res = await fetch(`/api/portfolio-history?tickers=${encodeURIComponent(stock.ticker)}`);
        if (res.ok) {
          const data: { ticker: string; history: { date: string; close: number }[] }[] = await res.json();
          const item = data.find(d => d.ticker === stock.ticker);
          if (item && item.history.length > 1 && !cancelled) {
            setRealHistory(item.history.map(h => ({ date: h.date, price: h.close })));
            setIsLoadingHistory(false);
            return;
          }
        }
      } catch { /* fallback to simulated */ }
      if (!cancelled) setIsLoadingHistory(false);
    }
    fetchHistory();
    return () => { cancelled = true; };
  }, [stock.ticker]);

  // Use real history when available, fall back to simulated
  const history = useMemo(() => {
    if (realHistory) return realHistory;
    return generateStockHistory(stock);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [realHistory, stock.ticker, stock.price, stock.changePercent]);

  const maxDateStr = useMemo(() => {
    return new Date().toISOString().split('T')[0];
  }, []);

  const minDateStr = useMemo(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 3);
    return d.toISOString().split('T')[0];
  }, []);

  // Default custom range: 1 Month ago to Today
  const defaultStartStr = useMemo(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return d.toISOString().split('T')[0];
  }, []);

  const [customStart, setCustomStart] = useState(defaultStartStr);
  const [customEnd, setCustomEnd] = useState(maxDateStr);
  const [hoveredPoint, setHoveredPoint] = useState<HistoryPoint | null>(null);

  // Predefined periods calculation helper
  const periodsData = useMemo(() => {
    if (history.length < 2) return null;

    const todayPoint = history[history.length - 1];

    const getPeriodStats = (daysAgo: number) => {
      const idx = Math.max(0, history.length - 1 - daysAgo);
      const pastPoint = history[idx];
      const diff = todayPoint.price - pastPoint.price;
      const pct = (diff / pastPoint.price) * 100;
      return { price: pastPoint.price, diff, pct };
    };

    return {
      oneDay: getPeriodStats(1),
      oneWeek: getPeriodStats(7),
      oneMonth: getPeriodStats(30),
      oneYear: getPeriodStats(365),
      total: getPeriodStats(history.length - 1),
    };
  }, [history]);

  // Filtered points based on custom start and end dates
  const filteredPoints = useMemo(() => {
    return history.filter(p => p.date >= customStart && p.date <= customEnd);
  }, [history, customStart, customEnd]);

  // Performance stats based on custom start and end dates
  const customStats = useMemo(() => {
    if (filteredPoints.length < 2) return null;
    const startPoint = filteredPoints[0];
    const endPoint = filteredPoints[filteredPoints.length - 1];
    const diff = endPoint.price - startPoint.price;
    const pct = (diff / startPoint.price) * 100;
    return {
      startPrice: startPoint.price,
      endPrice: endPoint.price,
      startDate: startPoint.date,
      endDate: endPoint.date,
      diff,
      pct
    };
  }, [filteredPoints]);

  // SVG Chart variables and mapping
  const width = 600;
  const height = 180;
  const paddingX = 40;
  const paddingY = 20;

  const chartPaths = useMemo(() => {
    if (filteredPoints.length < 2) return null;

    const prices = filteredPoints.map(p => p.price);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const range = maxPrice - minPrice || 1;

    // Expand min/max a small bit for padding inside chart
    const minBound = Math.max(0, minPrice - range * 0.05);
    const maxBound = maxPrice + range * 0.05;
    const boundRange = maxBound - minBound;

    const pointsCount = filteredPoints.length;

    // Build the SVG path
    let linePath = '';
    let areaPath = '';

    const coords = filteredPoints.map((p, i) => {
      const x = paddingX + (i / (pointsCount - 1)) * (width - 2 * paddingX);
      const y = height - paddingY - ((p.price - minBound) / boundRange) * (height - 2 * paddingY);
      return { x, y, price: p.price, date: p.date };
    });

    if (coords.length > 0) {
      linePath = `M ${coords[0].x} ${coords[0].y}`;
      for (let i = 1; i < coords.length; i++) {
        linePath += ` L ${coords[i].x} ${coords[i].y}`;
      }

      areaPath = `${linePath} L ${coords[coords.length - 1].x} ${height - paddingY} L ${coords[0].x} ${height - paddingY} Z`;
    }

    return { coords, minBound, maxBound, linePath, areaPath, isPositive: filteredPoints[filteredPoints.length - 1].price >= filteredPoints[0].price };
  }, [filteredPoints]);

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement, MouseEvent>) => {
    if (!chartPaths || chartPaths.coords.length === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const xPos = e.clientX - rect.left;
    
    // Convert current mouse coordinate back to chart point index
    const chartWidth = width - 2 * paddingX;
    const fraction = (xPos - paddingX) / chartWidth;
    let index = Math.round(fraction * (chartPaths.coords.length - 1));
    index = Math.max(0, Math.min(chartPaths.coords.length - 1, index));

    const pt = filteredPoints[index];
    setHoveredPoint(pt);
  };

  const handleMouseLeave = () => {
    setHoveredPoint(null);
  };

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 shadow-inner space-y-5 animate-slideDown text-slate-800">
      {/* Visualizer Header */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-3">
        <div className="flex items-center space-x-2.5">
          <div className="p-2 bg-slate-900 text-white rounded-lg font-mono font-bold text-sm">
            {stock.ticker}
          </div>
          <div>
            <h4 className="text-sm font-black text-slate-900">{stock.name}</h4>
            <p className="text-[10.5px] text-slate-500 font-mono flex items-center gap-1 mt-0.5">
              <Clock className="w-3 h-3 text-teal-600" />
              Precio base en simulación histórica IPSA: <span className="font-bold text-slate-700">{formatCLP(stock.price)}</span>
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-200/60 transition cursor-pointer"
          title="Cerrar detalles de fluctuación"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Preset Fluctuations Row */}
      {periodsData && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
          {/* 1 dia */}
          <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">1 Día</span>
            <div className="mt-1">
              <span className="text-xs font-mono text-slate-500 block">Antes: {formatCLP(periodsData.oneDay.price)}</span>
              <span className={`text-sm font-mono font-black flex items-center gap-0.5 mt-0.5 ${periodsData.oneDay.diff >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                {periodsData.oneDay.diff >= 0 ? <TrendingUp className="w-3.5 h-3.5 shrink-0" /> : <TrendingDown className="w-3.5 h-3.5 shrink-0" />}
                {periodsData.oneDay.diff >= 0 ? '+' : ''}{formatPercent(periodsData.oneDay.pct)}
              </span>
            </div>
          </div>

          {/* 1 semana */}
          <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">1 Semana</span>
            <div className="mt-1">
              <span className="text-xs font-mono text-slate-500 block">Antes: {formatCLP(periodsData.oneWeek.price)}</span>
              <span className={`text-sm font-mono font-black flex items-center gap-0.5 mt-0.5 ${periodsData.oneWeek.diff >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                {periodsData.oneWeek.diff >= 0 ? <TrendingUp className="w-3.5 h-3.5 shrink-0" /> : <TrendingDown className="w-3.5 h-3.5 shrink-0" />}
                {periodsData.oneWeek.diff >= 0 ? '+' : ''}{formatPercent(periodsData.oneWeek.pct)}
              </span>
            </div>
          </div>

          {/* 1 mes */}
          <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">1 Mes</span>
            <div className="mt-1">
              <span className="text-xs font-mono text-slate-500 block">Antes: {formatCLP(periodsData.oneMonth.price)}</span>
              <span className={`text-sm font-mono font-black flex items-center gap-0.5 mt-0.5 ${periodsData.oneMonth.diff >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                {periodsData.oneMonth.diff >= 0 ? <TrendingUp className="w-3.5 h-3.5 shrink-0" /> : <TrendingDown className="w-3.5 h-3.5 shrink-0" />}
                {periodsData.oneMonth.diff >= 0 ? '+' : ''}{formatPercent(periodsData.oneMonth.pct)}
              </span>
            </div>
          </div>

          {/* 1 año */}
          <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">1 Año</span>
            <div className="mt-1">
              <span className="text-xs font-mono text-slate-500 block">Antes: {formatCLP(periodsData.oneYear.price)}</span>
              <span className={`text-sm font-mono font-black flex items-center gap-0.5 mt-0.5 ${periodsData.oneYear.diff >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                {periodsData.oneYear.diff >= 0 ? <TrendingUp className="w-3.5 h-3.5 shrink-0" /> : <TrendingDown className="w-3.5 h-3.5 shrink-0" />}
                {periodsData.oneYear.diff >= 0 ? '+' : ''}{formatPercent(periodsData.oneYear.pct)}
              </span>
            </div>
          </div>

          {/* total */}
          <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-xs flex flex-col justify-between col-span-2 md:col-span-1">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Total (3 Años)</span>
            <div className="mt-1">
              <span className="text-xs font-mono text-slate-500 block">Antes: {formatCLP(periodsData.total.price)}</span>
              <span className={`text-sm font-mono font-black flex items-center gap-0.5 mt-0.5 ${periodsData.total.diff >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                {periodsData.total.diff >= 0 ? <TrendingUp className="w-3.5 h-3.5 shrink-0" /> : <TrendingDown className="w-3.5 h-3.5 shrink-0" />}
                {periodsData.total.diff >= 0 ? '+' : ''}{formatPercent(periodsData.total.pct)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Main interactive area (Left: Custom Dates, Right: SVG Chart Plot) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 pt-2">
        
        {/* Left Side: Interactive Custom date selectors */}
        <div className="lg:col-span-4 bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <h5 className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1.5 border-b border-slate-150 pb-2">
              <Calendar className="w-3.5 h-3.5 text-teal-600" />
              Filtrar Rango Personalizado
            </h5>

            {/* Date Inputs */}
            <div className="space-y-2.5">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-tight block mb-1">Fecha de comienzo</label>
                <input
                  type="date"
                  value={customStart}
                  min={minDateStr}
                  max={customEnd}
                  onChange={(e) => setCustomStart(e.target.value)}
                  className="w-full bg-slate-50 hover:bg-slate-100/80 transition text-xs border border-slate-200 rounded-lg p-2 font-mono font-medium focus:outline-none focus:ring-2 focus:ring-teal-500/20 text-slate-700"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-tight block mb-1">Fecha de fin</label>
                <input
                  type="date"
                  value={customEnd}
                  min={customStart}
                  max={maxDateStr}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  className="w-full bg-slate-50 hover:bg-slate-100/80 transition text-xs border border-slate-200 rounded-lg p-2 font-mono font-medium focus:outline-none focus:ring-2 focus:ring-teal-500/20 text-slate-700"
                />
              </div>
            </div>
          </div>

          {/* Range Performance output */}
          {customStats ? (
            <div className="bg-slate-50 rounded-lg p-3 border border-slate-150 space-y-2 mt-4">
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-slate-500">Precio Inicial:</span>
                <span className="font-mono font-bold text-slate-700">{formatCLP(customStats.startPrice)}</span>
              </div>
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-slate-500">Precio Final:</span>
                <span className="font-mono font-bold text-slate-700">{formatCLP(customStats.endPrice)}</span>
              </div>
              <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-600">Rendimiento:</span>
                <div className="text-right">
                  <span className={`text-xs font-mono font-black block leading-none ${customStats.diff >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {customStats.diff >= 0 ? '+' : ''}{formatCLP(customStats.diff)}
                  </span>
                  <span className={`text-[10px] font-mono font-bold ${customStats.diff >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                    ({customStats.diff >= 0 ? '+' : ''}{customStats.pct.toFixed(2)}%)
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-rose-50 border border-rose-100 rounded-lg p-2 text-rose-500 text-[10px] text-center">
              Seleccione un rango de fechas con datos para calcular.
            </div>
          )}
        </div>

        {/* Right Side: Beautiful SVG Chart rendering */}
        <div className="lg:col-span-8 bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex justify-between items-center mb-1 border-b border-slate-100 pb-2">
            <h5 className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
              <LineChart className="w-3.5 h-3.5 text-teal-600" />
              Gráfico de Tendencia en Rango
            </h5>
            <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-2.5 py-1 rounded-full font-semibold">
              {filteredPoints.length} puntos diarios
            </span>
          </div>

          <div className="relative w-full overflow-hidden mt-1 bg-slate-950/2.5 border border-dashed border-slate-200 rounded-lg py-2.5 flex flex-col items-center justify-center">
            {chartPaths ? (
              <div className="w-full">
                <svg
                  viewBox={`0 0 ${width} ${height}`}
                  className="w-full h-auto cursor-crosshair select-none"
                  onMouseMove={handleMouseMove}
                  onMouseLeave={handleMouseLeave}
                >
                  <defs>
                    <linearGradient id="positiveAreaGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
                      <stop offset="100%" stopColor="#10b981" stopOpacity="0.00" />
                    </linearGradient>
                    <linearGradient id="negativeAreaGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.25" />
                      <stop offset="100%" stopColor="#f43f5e" stopOpacity="0.00" />
                    </linearGradient>
                  </defs>

                  {/* Horizontal grid lines */}
                  <line x1={paddingX} y1={paddingY} x2={width - paddingX} y2={paddingY} stroke="#e2e8f0" strokeWidth="1" strokeDasharray="4 4" />
                  <line x1={paddingX} y1={height / 2} x2={width - paddingX} y2={height / 2} stroke="#e2e8f0" strokeWidth="1" strokeDasharray="4 4" />
                  <line x1={paddingX} y1={height - paddingY} x2={width - paddingX} y2={height - paddingY} stroke="#e2e8f0" strokeWidth="1" strokeDasharray="4 4" />

                  {/* The filled gradient area */}
                  <path
                    d={chartPaths.areaPath}
                    fill={chartPaths.isPositive ? "url(#positiveAreaGrad)" : "url(#negativeAreaGrad)"}
                  />

                  {/* The glowing price sparkline */}
                  <path
                    d={chartPaths.linePath}
                    fill="none"
                    stroke={chartPaths.isPositive ? "#10b981" : "#f43f5e"}
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />

                  {/* Left-most start point circle */}
                  <circle
                    cx={chartPaths.coords[0].x}
                    cy={chartPaths.coords[0].y}
                    r="4"
                    fill={chartPaths.isPositive ? "#059669" : "#e11d48"}
                  />

                  {/* Right-most end point circle */}
                  <circle
                    cx={chartPaths.coords[chartPaths.coords.length - 1].x}
                    cy={chartPaths.coords[chartPaths.coords.length - 1].y}
                    r="4"
                    fill={chartPaths.isPositive ? "#059669" : "#e11d48"}
                  />

                  {/* Hover interactive vertical guideline and price point */}
                  {hoveredPoint && (
                    (() => {
                      const idx = filteredPoints.findIndex(p => p.date === hoveredPoint.date);
                      if (idx === -1) return null;
                      const coord = chartPaths.coords[idx];
                      return (
                        <g>
                          <line
                            x1={coord.x}
                            y1={paddingY}
                            x2={coord.x}
                            y2={height - paddingY}
                            stroke="#94a3b8"
                            strokeWidth="1"
                            strokeDasharray="2 2"
                          />
                          <circle
                            cx={coord.x}
                            cy={coord.y}
                            r="5"
                            fill="#0f172a"
                            stroke={chartPaths.isPositive ? "#2dd4bf" : "#fb7185"}
                            strokeWidth="2"
                          />
                        </g>
                      );
                    })()
                  )}
                </svg>

                {/* Y-Axis range labels */}
                <div className="flex justify-between items-center text-[9px] font-mono font-bold text-slate-400 px-10 pt-1 border-t border-slate-100">
                  <span>Mínimo: {formatCLP(chartPaths.minBound)}</span>
                  <span>Máximo: {formatCLP(chartPaths.maxBound)}</span>
                </div>
              </div>
            ) : (
              <div className="py-12 text-slate-400 text-xs">Alineando datos...</div>
            )}

            {/* Hover tooltip text display */}
            <div className="h-6 mt-1 flex items-center justify-center">
              {hoveredPoint ? (
                <div className="bg-slate-900 text-teal-300 text-[10.5px] font-mono font-bold px-3 py-0.5 rounded-full shadow-md flex items-center gap-1.5">
                  <span className="text-white">{hoveredPoint.date}:</span>
                  <span className="font-extrabold">{formatCLP(hoveredPoint.price)}</span>
                </div>
              ) : (
                <span className="text-[10px] text-slate-400 italic flex items-center gap-1">
                  <HelpCircle className="w-3.5 h-3.5 text-slate-300" />
                  Mueve el mouse por el gráfico para ver el precio de cada día.
                </span>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
