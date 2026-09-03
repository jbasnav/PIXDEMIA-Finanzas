import React, { useState } from 'react';
import { AlertTriangle, CheckCircle, Flame, Edit2, Check } from 'lucide-react';
import { formatCurrency } from '../utils/formatters';
import { api } from '../services/api';

export default function BudgetAlerts({ presupuestos, onBudgetUpdated, currentMonthName }) {
  const [editingCatId, setEditingCatId] = useState(null);
  const [editLimit, setEditLimit] = useState('');

  if (!presupuestos || presupuestos.length === 0) return null;

  const handleStartEdit = (item) => {
    setEditingCatId(item.categoria_id);
    setEditLimit(item.limite_mensual || '');
  };

  const handleSaveEdit = async (catId) => {
    try {
      const num = parseFloat(editLimit) || 0;
      await api.savePresupuesto({
        categoria_id: catId,
        limite_mensual: num
      });
      setEditingCatId(null);
      onBudgetUpdated();
    } catch (err) {
      console.error('Error guardando presupuesto:', err);
    }
  };

  const alertas = presupuestos.filter(p => p.limite_mensual > 0);

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-bold text-base text-slate-900 dark:text-white">
            Control de Presupuestos ({currentMonthName})
          </h3>
          <p className="text-xs text-slate-500">
            Monitor de consumo en tiempo real y alertas de desviación
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {alertas.map(item => {
          const isOver = item.alerta === 'superado';
          const isNear = item.alerta === 'cuidado';
          const pct = Math.min(item.porcentaje_consumido, 100);

          let barColor = 'bg-emerald-500';
          let badgeText = 'En objetivo';
          let badgeClass = 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';

          if (isOver) {
            barColor = 'bg-rose-500';
            badgeText = `Excedido +${formatCurrency(item.gasto_real - item.limite_mensual)}`;
            badgeClass = 'bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800';
          } else if (isNear) {
            barColor = 'bg-amber-500';
            badgeText = `${item.porcentaje_consumido}% consumido`;
            badgeClass = 'bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800';
          }

          return (
            <div 
              key={item.categoria_id}
              className={`p-3.5 rounded-xl border transition-all ${
                isOver 
                  ? 'bg-rose-50/40 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/50' 
                  : isNear
                  ? 'bg-amber-50/30 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/50'
                  : 'bg-slate-50/50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold text-sm text-slate-900 dark:text-white truncate">
                  {item.categoria_nombre}
                </span>
                <span className={`text-[11px] px-2 py-0.5 rounded-full font-bold border ${badgeClass}`}>
                  {badgeText}
                </span>
              </div>

              {/* Barra de Progreso */}
              <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden mt-3">
                <div 
                  className={`h-full ${barColor} transition-all duration-500`} 
                  style={{ width: `${pct}%` }} 
                />
              </div>

              {/* Valores Gasto / Límite */}
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mt-2">
                <span>
                  Real: <strong className="text-slate-900 dark:text-slate-200">{formatCurrency(item.gasto_real)}</strong>
                </span>

                {editingCatId === item.categoria_id ? (
                  <div className="flex items-center space-x-1">
                    <input
                      type="number"
                      value={editLimit}
                      onChange={(e) => setEditLimit(e.target.value)}
                      className="w-16 px-1.5 py-0.5 text-xs rounded bg-white dark:bg-slate-900 border border-brand-500 text-slate-900 dark:text-white"
                      autoFocus
                    />
                    <button
                      onClick={() => handleSaveEdit(item.categoria_id)}
                      className="p-1 rounded bg-brand-600 text-white"
                    >
                      <Check className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => handleStartEdit(item)}
                    className="flex items-center space-x-1 hover:text-brand-600 dark:hover:text-brand-400"
                    title="Editar límite mensual"
                  >
                    <span>Límite: {formatCurrency(item.limite_mensual)}</span>
                    <Edit2 className="w-3 h-3 ml-0.5 opacity-60" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
