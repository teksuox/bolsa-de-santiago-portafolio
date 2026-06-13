/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { MarketStock, StockHolding, DividendPayment, TaxRefund } from './types';

export const INITIAL_MARKET_STOCKS: MarketStock[] = [
  {
    ticker: "CHILE",
    name: "Banco de Chile",
    price: 118.25,
    changePercent: 0.85,
    previousClose: 117.25,
    dividendYield: 8.4,
    sector: "Financiero",
    volumeCLP: 1845000000
  },
  {
    ticker: "SQM-B",
    name: "Sociedad Química y Minera (SQM)",
    price: 39150.00,
    changePercent: -1.42,
    previousClose: 39713.94,
    dividendYield: 10.2,
    sector: "Minero & Químico",
    volumeCLP: 3450000000
  },
  {
    ticker: "ENELCHILE",
    name: "Enel Chile S.A.",
    price: 56.80,
    changePercent: 1.15,
    previousClose: 56.15,
    dividendYield: 9.1,
    sector: "Servicios Públicos",
    volumeCLP: 980000000
  },
  {
    ticker: "CENCOSHOP",
    name: "Cencosud Shopping S.A.",
    price: 1480.00,
    changePercent: -0.20,
    previousClose: 1482.97,
    dividendYield: 7.2,
    sector: "Inmobiliario Comercial",
    volumeCLP: 1200000000
  },
  {
    ticker: "COPEC",
    name: "Empresas Copec S.A.",
    price: 6420.00,
    changePercent: 0.45,
    previousClose: 6391.24,
    dividendYield: 5.8,
    sector: "Energía & Recursos",
    volumeCLP: 1540000000
  },
  {
    ticker: "VAPORES",
    name: "Cía. Sudamericana de Vapores",
    price: 52.40,
    changePercent: -2.35,
    previousClose: 53.66,
    dividendYield: 13.8,
    sector: "Transporte Marítimo",
    volumeCLP: 2100000000
  },
  {
    ticker: "BSANTANDER",
    name: "Banco Santander Chile",
    price: 45.90,
    changePercent: 0.10,
    previousClose: 45.85,
    dividendYield: 8.1,
    sector: "Financiero",
    volumeCLP: 1150000000
  },
  {
    ticker: "CMPC",
    name: "Empresas CMPC S.A.",
    price: 1890.00,
    changePercent: -0.55,
    previousClose: 1900.45,
    dividendYield: 6.2,
    sector: "Forestal & Celulosa",
    volumeCLP: 950000000
  },
  {
    ticker: "FALABELLA",
    name: "Falabella S.A.",
    price: 2820.00,
    changePercent: 1.95,
    previousClose: 2766.06,
    dividendYield: 3.2,
    sector: "Retail",
    volumeCLP: 1680000000
  },
  {
    ticker: "ANDINA-B",
    name: "Embotelladora Andina S.A.",
    price: 2490.00,
    changePercent: 0.30,
    previousClose: 2482.55,
    dividendYield: 6.9,
    sector: "Consumo Masivo",
    volumeCLP: 510000000
  }
];

export const INITIAL_HOLDINGS: StockHolding[] = [];

export const INITIAL_DIVIDENDS: DividendPayment[] = [];

export const INITIAL_TAX_REFUNDS: TaxRefund[] = [];

