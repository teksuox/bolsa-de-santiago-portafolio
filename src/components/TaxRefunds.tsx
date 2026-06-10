/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { TaxRefund } from '../types';
import { formatCLP, formatDateChilean } from '../utils';
import { useSortable } from '../lib/useSortable';
import { FileCheck, Plus, Trash2, HelpCircle, AlertCircle, Landmark, ShieldCheck } from 'lucide-react';

interface TaxRefundsProps {
  refunds: TaxRefund[];
  onAddRefund: (refund: Omit<TaxRefund, 'id'>) => void;
  onDeleteRefund: (id: string) => void;
}

export default function TaxRefunds({ refunds, onAddRefund, onDeleteRefund }: TaxRefundsProps) {
  const [year, setYear] = useState<number>(2026);
  const [amount, setAmount] = useState<number | ''>('');
  const [refundDate, setRefundDate] = useState('2026-05-15');
  const [received, setReceived] = useState(true);

  const [formOpen, setFormOpen] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || amount <= 0) return alert('Por favor ingresa un monto válido');

    onAddRefund({
      year,
      amount: Number(amount),
      refundDate,
      received
    });

    setAmount('');
    setFormOpen(false);
  };

  const totalRefunded = refunds.filter(r => r.received).reduce((sum, r) => sum + r.amount, 0);

  const { sortedData: sortedRefunds, sortKey: trSortKey, toggleSort: trToggleSort, getSortIcon: trIcon } = useSortable(refunds, '');

  return (
    <div className="space-y-6">
      {/* Educational Box on Chile tax returns */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-6">
        <div className="flex items-start space-x-3">
          <div className="p-2 bg-indigo-100 text-indigo-700 rounded-lg mt-0.5 shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-sm">💡 ¿Por qué las acciones chilenas devuelven impuestos?</h3>
            <p className="text-xs text-slate-600 mt-1 leading-relaxed">
              En Chile, las corporaciones (S.A.) pagan un <strong>27% de Impuesto de Primera Categoría (IDPC)</strong> sobre sus utilidades antes de repartir dividendos. Al recibir tus dividendos, tienes derecho a reclamar ese 27% pagado por la empresa como un <strong>"Crédito por IDPC"</strong> en tu Declaración de Renta F22 de cada año en <strong>Abril-Mayo (Operación Renta)</strong>.
            </p>
            <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
              Si tus ingresos anuales totales se sitúan en tramos exentos o bajos del <em>Impuesto Global Complementario</em> (menores a 27%), <strong>¡la Tesorería General de la República (TGR) te devolverá toda esa diferencia en efectivo en tu cuenta bancaria a mediados de Mayo!</strong>
            </p>
          </div>
        </div>
      </div>

      {/* Metrics of tax returns */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200">
          <span className="text-xs text-slate-500 font-medium uppercase tracking-wider block">Total Devuelto Acumulado (SII / TGR)</span>
          <span className="text-2xl font-bold font-mono text-indigo-600 block mt-1">{formatCLP(totalRefunded)}</span>
          <span className="text-xs text-slate-400 mt-2 block">Devolución histórica por Operación Renta F22</span>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 flex flex-col justify-between">
          <div>
            <span className="text-xs text-slate-400 font-medium uppercase tracking-wider block">Calendarios Históricos SII</span>
            <p className="text-xs text-slate-600 mt-2">
              📅 Las fechas de devolución de impuestos en Chile son habitualmente entre el <strong>14 y el 28 de Mayo</strong> dependiendo del envío del formulario 22.
            </p>
          </div>
        </div>
      </div>

      {/* Grid of history */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <div className="flex items-center space-x-2">
            <FileCheck className="w-5 h-5 text-slate-700" />
            <h3 className="font-semibold text-slate-800 text-sm">Registro de Devoluciones de Impuestos recibidas</h3>
          </div>
          <button
            onClick={() => setFormOpen(!formOpen)}
            className="flex items-center space-x-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold px-4 py-2 rounded-lg transition"
          >
            <Plus className="w-4 h-4" />
            <span>Registrar Devolución</span>
          </button>
        </div>

        {formOpen && (
          <form onSubmit={handleSubmit} className="p-6 border-b border-slate-100 bg-slate-50/50 space-y-4 animate-fadeIn">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Year */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Año Tributario</label>
                <input
                  type="number"
                  min="1900"
                  max="2100"
                  required
                  value={year}
                  onChange={(e) => setYear(e.target.value === '' ? 2026 : Number(e.target.value))}
                  placeholder="Ej: 2026"
                  className="w-full text-xs border border-slate-200 rounded-lg p-2.5 bg-white focus:outline-none"
                />
              </div>

              {/* Amount */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Monto de Devolución F22 (CLP)</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="Ej: 215000"
                  className="w-full text-xs border border-slate-200 rounded-lg p-2.5 bg-white"
                />
              </div>

              {/* Refund Date */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Día de Devolución</label>
                <input
                  type="date"
                  required
                  value={refundDate}
                  onChange={(e) => setRefundDate(e.target.value)}
                  className="w-full text-xs border border-slate-200 rounded-lg p-2.5 bg-white"
                />
              </div>

              {/* Status */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Estado</label>
                <div className="flex items-center space-x-2 pt-2">
                  <input
                    type="checkbox"
                    id="refundReceived"
                    checked={received}
                    onChange={(e) => setReceived(e.target.checked)}
                    className="w-4 h-4 text-teal-600 focus:ring-teal-500 rounded border-slate-300"
                  />
                  <label htmlFor="refundReceived" className="text-xs text-slate-700 cursor-pointer">
                    Ya Recibido / Depositado
                  </label>
                </div>
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
                Guardar Devolución
              </button>
            </div>
          </form>
        )}

        <div className="overflow-x-auto table-scroll-container">
          {refunds.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <FileCheck className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-sm font-semibold">No se han ingresado devoluciones de impuestos</p>
              <p className="text-xs mt-1">Registra las devoluciones de las Operaciones Renta pasadas para sumarlos al total aportado.</p>
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4 cursor-pointer hover:text-slate-800 select-none" onClick={() => trToggleSort('year')}>Año Tributario (SII Chile){trIcon('year')}</th>
                  <th className="py-3 px-4 text-right cursor-pointer hover:text-slate-800 select-none" onClick={() => trToggleSort('amount')}>Monto Devuelto{trIcon('amount')}</th>
                  <th className="py-3 px-4 cursor-pointer hover:text-slate-800 select-none" onClick={() => trToggleSort('refundDate')}>Día de Devolución{trIcon('refundDate')}</th>
                  <th className="py-3 px-4 text-center">Estado Oficial</th>
                  <th className="py-3 px-4 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sortedRefunds.map((ref) => (
                  <tr key={ref.id} className="hover:bg-slate-50/50 transition">
                    <td className="py-4 px-4 font-bold text-slate-900">
                      Operación Renta {ref.year} (F22)
                    </td>
                    <td className="py-4 px-4 text-right font-bold text-slate-800 font-mono">
                      {formatCLP(ref.amount)}
                    </td>
                    <td className="py-4 px-4 text-slate-600 font-mono">
                      {formatDateChilean(ref.refundDate)}
                    </td>
                    <td className="py-4 px-4 text-center">
                      <span className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        ref.received 
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
                          : 'bg-amber-50 text-amber-800 border border-amber-200'
                      }`}>
                        {ref.received ? 'Depositado TGR' : 'Por depositar'}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <button
                        onClick={() => onDeleteRefund(ref.id)}
                        className="p-1.5 text-rose-500 hover:bg-rose-50 rounded transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
