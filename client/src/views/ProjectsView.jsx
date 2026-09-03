import React, { useState, useEffect } from 'react';
import { Hammer, FolderKanban, Plane, Truck, Plus, Sparkles, Receipt, Calendar, ArrowRight } from 'lucide-react';
import { formatCurrency, formatDate } from '../utils/formatters';
import { api } from '../services/api';

export default function ProjectsView({ onOpenQuickAdd }) {
  const [proyectos, setProyectos] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [movimientos, setMovimientos] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadProyectos = async () => {
    try {
      setLoading(true);
      const res = await api.getProyectosResumen();
      setProyectos(res);
      if (res.length > 0 && !selectedProject) {
        setSelectedProject(res[0].etiqueta);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadProjectTransactions = async (tag) => {
    if (!tag) return;
    try {
      const res = await api.getMovimientos({ etiqueta_especial: tag, limit: 100 });
      setMovimientos(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadProyectos();
  }, []);

  useEffect(() => {
    if (selectedProject) {
      loadProjectTransactions(selectedProject);
    }
  }, [selectedProject]);

  const getProjectIcon = (tag = '') => {
    const lower = tag.toLowerCase();
    if (lower.includes('obra') || lower.includes('local') || lower.includes('riff') || lower.includes('reonor')) {
      return Hammer;
    }
    if (lower.includes('viaje') || lower.includes('londres')) {
      return Plane;
    }
    if (lower.includes('furgoneta') || lower.includes('camper')) {
      return Truck;
    }
    return FolderKanban;
  };

  const activeProjSummary = proyectos.find(p => p.etiqueta === selectedProject);

  return (
    <div className="space-y-6 pb-12">
      
      {/* Cabecera */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center space-x-2">
            <FolderKanban className="w-6 h-6 text-amber-500" />
            <span>Monitor de Obras y Proyectos Especiales</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Seguimiento presupuestario de hitos extraordinarios (Reforma Local / Riff / Reonor, Viajes, etc.)
          </p>
        </div>

        <button
          onClick={onOpenQuickAdd}
          className="flex items-center space-x-1.5 px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-amber-600 hover:bg-amber-500 rounded-xl shadow-md shadow-amber-600/20 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Añadir Gasto a Proyecto</span>
        </button>
      </div>

      {/* Grid de Proyectos / Tarjetas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {proyectos.map(p => {
          const Icon = getProjectIcon(p.etiqueta);
          const isSelected = selectedProject === p.etiqueta;

          return (
            <div
              key={p.etiqueta}
              onClick={() => setSelectedProject(p.etiqueta)}
              className={`p-5 rounded-2xl border cursor-pointer transition-all ${
                isSelected
                  ? 'bg-amber-50/60 dark:bg-amber-950/30 border-amber-300 dark:border-amber-700 shadow-md ring-2 ring-amber-500/20'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 hover:shadow-sm'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="p-3 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                  <Icon className="w-5 h-5" />
                </div>
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                  {p.total_movimientos} pagos
                </span>
              </div>

              <h3 className="font-bold text-lg text-slate-900 dark:text-white mt-3 truncate">
                {p.etiqueta}
              </h3>

              <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/80 space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Inversión acumulada:</span>
                  <span className="font-extrabold text-slate-900 dark:text-white">
                    {formatCurrency(p.total_gastado)}
                  </span>
                </div>
                {p.primer_movimiento && (
                  <div className="flex justify-between text-[11px] text-slate-400 pt-1">
                    <span>Periodo:</span>
                    <span>{formatDate(p.primer_movimiento)} - {formatDate(p.ultimo_movimiento)}</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Detalle y Libro de Gastos del Proyecto Seleccionado */}
      {selectedProject && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                <Sparkles className="w-5 h-5 text-amber-500" />
                <span>Desglose de Partidas: {selectedProject}</span>
              </h2>
              <p className="text-xs text-slate-500">
                Detalle exacto de facturas, compras y materiales imputados al proyecto
              </p>
            </div>
            {activeProjSummary && (
              <div className="text-right">
                <span className="text-xs text-slate-500">Coste Total Consolidado:</span>
                <p className="text-xl font-black text-rose-600 dark:text-rose-400">
                  {formatCurrency(activeProjSummary.total_gastado)}
                </p>
              </div>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/60 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200 dark:border-slate-800">
                  <th className="py-2.5 px-3">Fecha</th>
                  <th className="py-2.5 px-3">Cuenta</th>
                  <th className="py-2.5 px-3">Proveedor / Tienda</th>
                  <th className="py-2.5 px-3">Concepto</th>
                  <th className="py-2.5 px-3 text-right">Importe</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {movimientos.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="text-center py-8 text-slate-400">
                      No hay pagos registrados para este proyecto.
                    </td>
                  </tr>
                ) : (
                  movimientos.map(m => (
                    <tr key={m.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300 font-medium">
                        {formatDate(m.fecha)}
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-slate-800 dark:text-slate-200">
                        {m.cuenta_nombre}
                      </td>
                      <td className="py-2.5 px-3 font-medium text-slate-900 dark:text-white">
                        {m.subcategoria || '-'}
                      </td>
                      <td className="py-2.5 px-3 text-slate-700 dark:text-slate-300">
                        {m.concepto}
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-rose-600 dark:text-rose-400">
                        {formatCurrency(m.importe)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
}
