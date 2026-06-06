/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface StockHolding {
  id: string;
  ticker: string;
  name: string;
  shares: number;
  buyPrice: number;      // CLP
  currentPrice: number;  // CLP
  buyDate: string;
  annualTargetYield: number; // Porcentaje anual objetivo, ej: 8.5 (%)
}

export interface DividendPayment {
  id: string;
  ticker: string;
  sharesCount: number;
  amountPerShare: number; // CLP por acción
  totalAmount: number;    // CLP total
  payoutDate: string;     // Fecha de pago del dividendo
  received: boolean;      // Recibido o Estimado
}

export interface TaxRefund {
  id: string;
  year: number;          // Año de Operación Renta (ej. 2026)
  amount: number;        // CLP devuelto
  refundDate: string;    // Fecha aproximada (ej. 2026-05-15)
  received: boolean;     // Recibido o Estimado
}

export interface MarketStock {
  ticker: string;
  name: string;
  price: number;         // CLP
  changePercent: number; // Variación diaria %
  dividendYield: number; // Dividendo anual aproximado %
  sector: string;
  volumeCLP: number;     // Volumen diario de transacciones
}

export interface PortfolioSummary {
  contributedCapital: number;
  currentValue: number;
  totalDividendsReceived: number;
  totalTaxRefunds: number;
  annualPerformancePercentage: number;
}

export interface StockAlert {
  ticker: string;
  starredPrice: number;     // Precio en el momento de marcar como favorita
  targetPrice: number;      // Precio límite configurado para activar la alerta
  triggered: boolean;       // Si la alarma ya fue disparada
  lastTriggeredAt?: string; // Fecha y hora en que se disparó la alarma
}

