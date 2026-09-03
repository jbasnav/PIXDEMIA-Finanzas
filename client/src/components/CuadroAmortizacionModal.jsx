import React, { useState, useEffect } from 'react';
import { 
  X, 
  Download, 
  Table, 
  Calendar, 
  DollarSign, 
  Percent, 
  TrendingDown, 
  CheckCircle2, 
  Clock, 
  Loader2,
  FileSpreadsheet,
  Check
} from 'lucide-react';
import { formatCurrency, formatPercent } from '../utils/formatters';
import { api } from '../services/api';

export default function CuadroAmortizacionModal({ pasivoId, pasivoNombre, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('anual'); // 'anual' | 'mensual'

  useEffect(() => {
    if (!pasivoId) return;
    const fetchCuadro = async () => {
      try {
        setLoading(true);
        const res = await api.getCuadroVida(pasivoId);
        setData(res);
      } catch (err) {
        console.error('Error cargando cuadro de amortización:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchCuadro();
  }, [pasivoId]);

  const handleExportCSV = () => {
    if (!data || !data.cuadro) return;
    const { scheduleMensual } = data.cuadro;

    const headers = ['Mes', 'Periodo', 'Año', 'TIN (%)', 'Cuota Total', 'Amortizacion Capital', 'Intereses', 'Saldo Restante'];
    const rows = scheduleMensual.map(s => [
      s.numeroMes,
      `"${s.fechaLabel}"`,
      s.ano,
      s.tipoInteresAplicado,
      s.cuota,
      s.amortizacionCapital,
      s.pagoIntereses,
      s.saldoRestante
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `cuadro_amortizacion_${(pasivoNombre || 'prestamo').toLowerCase().replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const cuadro = data?.cuadro || {};
  const pasivo = data?.pasivo || {};

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-5xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Cabecera */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40">
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center space-x-2">
              <Table className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <span>Cuadro de Amortización + Intereses a lo Largo de la Vida</span>
            </h3>
            <p className="text-xs text-slate-500">
              {pasivo.nombre || pasivoNombre} • Capital Inicial: {formatCurrency(cuadro.capitalInicial || pasivo.capital_inicial)}
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleExportCSV}
              disabled={loading || !data}
              className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 rounded-xl border border-emerald-200 dark:border-emerald-800 transition-colors disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Descargar CSV</span>
            </button>
            <button 
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="p-16 flex flex-col items-center justify-center space-y-3">
            <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
            <p className="text-sm font-semibold text-slate-500">Calculando cuadro de amortización integral...</p>
          </div>
        ) : (
          <div className="p-6 overflow-y-auto space-y-6">
            
            {/* Tarjetas de Resumen Financiero Global */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              
              <div className="p-4 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50">
                <span className="text-xs font-semibold text-indigo-700 dark:text-indigo-300">Total Desembolso (Vida)</span>
                <p className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-1">
                  {formatCurrency(cuadro.totalPagadoVida)}
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Capital: {formatCurrency(cuadro.capitalInicial)}
                </p>
              </div>

              <div className="p-4 rounded-xl bg-rose-50/60 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900/50">
                <span className="text-xs font-semibold text-rose-700 dark:text-rose-300">
                  {cuadro.sinInteres ? 'Coste en Intereses' : 'Total Intereses Bancarios'}
                </span>
                <p className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-1">
                  {formatCurrency(cuadro.totalInteresesVida)}
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {cuadro.sinInteres ? 'Préstamo sin coste financiero' : `Sobre toda la vida del préstamo`}
                </p>
              </div>

              <div className="p-4 rounded-xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900/50">
                <span className="text-xs font-semibold text-amber-700 dark:text-amber-300">Intereses Pagados hasta Hoy</span>
                <p className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">
                  {formatCurrency(cuadro.interesesPagadosHastaHoy)}
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Restan por pagar: {formatCurrency(cuadro.interesesPendientes)}
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <span className="text-xs font-semibold text-slate-500">Plazo Total Estimado</span>
                <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                  {cuadro.totalMeses} meses
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {(cuadro.totalMeses / 12).toFixed(1)} años de duración
                </p>
              </div>

            </div>

            {/* Selector de Modo de Vista */}
            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setViewMode('anual')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    viewMode === 'anual'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  Resumen Anual (Año a Año)
                </button>
                <button
                  onClick={() => setViewMode('mensual')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    viewMode === 'mensual'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  Detalle Mensual ({cuadro.totalMeses} meses)
                </button>
              </div>

              <span className="text-xs text-slate-400">
                {viewMode === 'anual' ? `${cuadro.resumenAnual?.length || 0} años de vigencia` : `${cuadro.scheduleMensual?.length || 0} cuotas emitidas`}
              </span>
            </div>

            {/* TABLA: RESUMEN ANUAL */}
            {viewMode === 'anual' && (
              <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 uppercase font-bold border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="px-4 py-3">Año</th>
                      <th className="px-4 py-3">TIN Medio (%)</th>
                      <th className="px-4 py-3 text-right">Cuotas Totales (€)</th>
                      <th className="px-4 py-3 text-right">Capital Amortizado (€)</th>
                      <th className="px-4 py-3 text-right">Intereses Pagados (€)</th>
                      <th className="px-4 py-3 text-right">Saldo a Fin de Año (€)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                    {cuadro.resumenAnual?.map((y, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="px-4 py-3 font-bold text-slate-900 dark:text-white flex items-center space-x-1.5">
                          <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                          <span>{y.ano}</span>
                          {y.ano < 2026 && <span className="text-[10px] text-slate-400 font-normal">(pasado)</span>}
                          {y.ano === 2026 && <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 dark:bg-indigo-950/60 px-1.5 py-0.5 rounded">Actual</span>}
                        </td>
                        <td className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-300">
                          {y.tipoInteres}%
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-slate-900 dark:text-white">
                          {formatCurrency(y.cuotasPagadas)}
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-emerald-600 dark:text-emerald-400">
                          +{formatCurrency(y.capitalAmortizado)}
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-rose-600 dark:text-rose-400">
                          {formatCurrency(y.interesesPagados)}
                        </td>
                        <td className="px-4 py-3 text-right font-extrabold text-indigo-600 dark:text-indigo-400">
                          {formatCurrency(y.saldoFinAno)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-100/70 dark:bg-slate-800/80 font-black text-slate-900 dark:text-white border-t border-slate-200 dark:border-slate-800">
                    <tr>
                      <td className="px-4 py-3 uppercase">Total Acumulado</td>
                      <td className="px-4 py-3">—</td>
                      <td className="px-4 py-3 text-right">{formatCurrency(cuadro.totalPagadoVida)}</td>
                      <td className="px-4 py-3 text-right text-emerald-600 dark:text-emerald-400">{formatCurrency(cuadro.capitalInicial)}</td>
                      <td className="px-4 py-3 text-right text-rose-600 dark:text-rose-400">{formatCurrency(cuadro.totalInteresesVida)}</td>
                      <td className="px-4 py-3 text-right text-indigo-600 dark:text-indigo-400">0,00 €</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}

            {/* TABLA: DETALLE MES A MES */}
            {viewMode === 'mensual' && (
              <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 max-h-96 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="sticky top-0 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 uppercase font-bold border-b border-slate-200 dark:border-slate-800 z-10">
                    <tr>
                      <th className="px-3 py-2.5">Mes</th>
                      <th className="px-3 py-2.5">Fecha</th>
                      <th className="px-3 py-2.5">TIN (%)</th>
                      <th className="px-3 py-2.5 text-right">Cuota (€)</th>
                      <th className="px-3 py-2.5 text-right">Amortización (€)</th>
                      <th className="px-3 py-2.5 text-right">Intereses (€)</th>
                      <th className="px-3 py-2.5 text-right">Saldo Restante (€)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                    {cuadro.scheduleMensual?.map((m, idx) => (
                      <tr key={idx} className={`${m.esPasado ? 'opacity-70 bg-slate-50/50 dark:bg-slate-900/50' : 'hover:bg-indigo-50/30'} transition-colors`}>
                        <td className="px-3 py-2 font-semibold text-slate-500">
                          #{m.numeroMes}
                        </td>
                        <td className="px-3 py-2 font-bold text-slate-800 dark:text-slate-200">
                          {m.fechaLabel}
                          {m.esPasado && <span className="ml-1 text-[10px] text-slate-400 font-normal">✓</span>}
                        </td>
                        <td className="px-3 py-2 text-slate-600 dark:text-slate-400">
                          {m.tipoInteresAplicado}%
                        </td>
                        <td className="px-3 py-2 text-right font-bold text-slate-900 dark:text-white">
                          {formatCurrency(m.cuota)}
                        </td>
                        <td className="px-3 py-2 text-right font-semibold text-emerald-600 dark:text-emerald-400">
                          +{formatCurrency(m.amortizacionCapital)}
                        </td>
                        <td className="px-3 py-2 text-right font-semibold text-rose-600 dark:text-rose-400">
                          {formatCurrency(m.pagoIntereses)}
                        </td>
                        <td className="px-3 py-2 text-right font-extrabold text-indigo-600 dark:text-indigo-400">
                          {formatCurrency(m.saldoRestante)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

          </div>
        )}

      </div>
    </div>
  );
}
