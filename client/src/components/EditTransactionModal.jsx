import React, { useState, useEffect } from 'react';
import { X, ArrowRightLeft, ArrowDownRight, ArrowUpRight, Check, AlertCircle, Trash2, CheckCircle2, Clock } from 'lucide-react';
import { api } from '../services/api';

export default function EditTransactionModal({ isOpen, onClose, movimiento, onTransactionUpdated, onTransactionDeleted, cuentas = [], categorias = [] }) {
  const [tipoMov, setTipoMov] = useState('gasto'); // 'gasto', 'ingreso', 'transferencia'
  const [fecha, setFecha] = useState('');
  const [cuentaId, setCuentaId] = useState('');
  const [cuentaDestinoId, setCuentaDestinoId] = useState('');
  const [categoriaId, setCategoriaId] = useState('');
  const [subcategoria, setSubcategoria] = useState('');
  const [concepto, setConcepto] = useState('');
  const [importe, setImporte] = useState('');
  const [esConsolidado, setEsConsolidado] = useState(1);
  const [etiquetaEspecial, setEtiquetaEspecial] = useState('');
  const [notas, setNotas] = useState('');

  const [tiendasHabituales, setTiendasHabituales] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen && movimiento) {
      setError(null);
      setFecha(movimiento.fecha ? movimiento.fecha.substring(0, 10) : new Date().toISOString().split('T')[0]);
      setCuentaId(movimiento.cuenta_id || (cuentas[0]?.id || ''));
      setCuentaDestinoId(movimiento.cuenta_destino_id || '');
      setCategoriaId(movimiento.categoria_id || (categorias[0]?.id || ''));
      setSubcategoria(movimiento.subcategoria || '');
      setConcepto(movimiento.concepto || '');
      setImporte(Math.abs(movimiento.importe || 0).toString());
      setEsConsolidado(movimiento.es_consolidado !== undefined ? Number(movimiento.es_consolidado) : 1);
      setEtiquetaEspecial(movimiento.etiqueta_especial || '');
      setNotas(movimiento.notas || '');

      if (movimiento.es_transferencia_interna === 1) {
        setTipoMov('transferencia');
      } else if (movimiento.importe >= 0) {
        setTipoMov('ingreso');
      } else {
        setTipoMov('gasto');
      }

      api.getTiendasHabituales().then(setTiendasHabituales).catch(console.error);
    }
  }, [isOpen, movimiento, cuentas, categorias]);

  if (!isOpen || !movimiento) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    const numImporte = parseFloat(importe);
    if (isNaN(numImporte) || numImporte <= 0) {
      setError('Por favor introduce un importe válido mayor a 0');
      return;
    }

    if (tipoMov === 'transferencia') {
      if (!cuentaDestinoId) {
        setError('Debes seleccionar la cuenta de destino para la transferencia');
        return;
      }
      if (Number(cuentaId) === Number(cuentaDestinoId)) {
        setError('La cuenta origen y destino deben ser diferentes');
        return;
      }
    }

    try {
      setLoading(true);

      const finalImporte = tipoMov === 'ingreso' ? Math.abs(numImporte) : -Math.abs(numImporte);
      const isTransfer = tipoMov === 'transferencia' ? 1 : 0;

      const payload = {
        fecha,
        cuenta_id: Number(cuentaId),
        categoria_id: Number(categoriaId),
        subcategoria: subcategoria.trim(),
        concepto: concepto.trim() || (isTransfer ? 'Traspaso interno' : (subcategoria || 'Gasto')),
        importe: finalImporte,
        es_transferencia_interna: isTransfer,
        cuenta_destino_id: isTransfer ? Number(cuentaDestinoId) : null,
        es_consolidado: Number(esConsolidado),
        etiqueta_especial: etiquetaEspecial.trim() || null,
        notas: notas.trim() || null
      };

      const updated = await api.updateMovimiento(movimiento.id, payload);
      if (onTransactionUpdated) {
        onTransactionUpdated(updated);
      }
      onClose();
    } catch (err) {
      setError(err.message || 'Error al actualizar el movimiento');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (window.confirm('¿Estás seguro de que deseas eliminar permanentemente este movimiento?')) {
      try {
        setLoading(true);
        await api.deleteMovimiento(movimiento.id);
        if (onTransactionDeleted) {
          onTransactionDeleted(movimiento.id);
        }
        onClose();
      } catch (err) {
        setError(err.message || 'Error al eliminar el movimiento');
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div 
        className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[92vh] animate-scaleUp"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
              Gestión de Movimiento
            </span>
            <h3 className="text-lg font-black text-slate-900 dark:text-white">
              Editar Movimiento #{movimiento.id}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4">
          {error && (
            <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 flex items-center space-x-2 text-rose-700 dark:text-rose-300 text-xs font-bold animate-shake">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Selector de Tipo de Movimiento */}
          <div className="grid grid-cols-3 gap-2 p-1 bg-slate-100 dark:bg-slate-800/60 rounded-2xl">
            <button
              type="button"
              onClick={() => setTipoMov('gasto')}
              className={`flex items-center justify-center space-x-1.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                tipoMov === 'gasto'
                  ? 'bg-rose-500 text-white shadow-md shadow-rose-500/20 font-black'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <ArrowDownRight className="w-4 h-4" />
              <span>Gasto</span>
            </button>

            <button
              type="button"
              onClick={() => setTipoMov('ingreso')}
              className={`flex items-center justify-center space-x-1.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                tipoMov === 'ingreso'
                  ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20 font-black'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <ArrowUpRight className="w-4 h-4" />
              <span>Ingreso</span>
            </button>

            <button
              type="button"
              onClick={() => setTipoMov('transferencia')}
              className={`flex items-center justify-center space-x-1.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                tipoMov === 'transferencia'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20 font-black'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <ArrowRightLeft className="w-4 h-4" />
              <span>Traspaso</span>
            </button>
          </div>

          {/* Estado de Consolidación (Real vs Simulación / Previsto) */}
          <div className="p-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Estado del Movimiento
              </span>
              <span className={`text-[11px] font-black px-2.5 py-0.5 rounded-full ${
                esConsolidado === 1 
                  ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300' 
                  : 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300'
              }`}>
                {esConsolidado === 1 ? '✓ Consolidado (Real)' : '⏳ Previsto (Simulación)'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setEsConsolidado(1)}
                className={`flex items-center justify-center space-x-1.5 py-1.5 px-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                  esConsolidado === 1
                    ? 'bg-emerald-500 text-white border-emerald-600 shadow-sm font-black'
                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Consolidado (Real)</span>
              </button>

              <button
                type="button"
                onClick={() => setEsConsolidado(0)}
                className={`flex items-center justify-center space-x-1.5 py-1.5 px-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                  esConsolidado === 0
                    ? 'bg-amber-500 text-white border-amber-600 shadow-sm font-black'
                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Previsto / Simulación</span>
              </button>
            </div>
          </div>

          {/* Importe y Fecha */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Importe (€) *
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="0.00"
                  value={importe}
                  onChange={(e) => setImporte(e.target.value)}
                  className="w-full px-3.5 py-2 text-base font-black rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">
                  €
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Fecha *
              </label>
              <input
                type="date"
                required
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                className="w-full px-3.5 py-2 text-xs font-semibold rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Cuentas Origen y Destino */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                {tipoMov === 'transferencia' ? 'Cuenta Origen *' : 'Cuenta / Banco *'}
              </label>
              <select
                value={cuentaId}
                onChange={(e) => setCuentaId(e.target.value)}
                className="w-full px-3 py-2 text-xs font-semibold rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none cursor-pointer"
              >
                {cuentas.map(c => (
                  <option key={c.id} value={c.id} className="dark:bg-slate-900">
                    {c.nombre}
                  </option>
                ))}
              </select>
            </div>

            {tipoMov === 'transferencia' ? (
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Cuenta Destino *
                </label>
                <select
                  value={cuentaDestinoId}
                  onChange={(e) => setCuentaDestinoId(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-semibold rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none cursor-pointer"
                >
                  <option value="" className="dark:bg-slate-900">Seleccionar destino...</option>
                  {cuentas.filter(c => c.id !== Number(cuentaId)).map(c => (
                    <option key={c.id} value={c.id} className="dark:bg-slate-900">
                      {c.nombre}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Categoría *
                </label>
                <select
                  value={categoriaId}
                  onChange={(e) => setCategoriaId(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-semibold rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none cursor-pointer"
                >
                  {categorias.map(cat => (
                    <option key={cat.id} value={cat.id} className="dark:bg-slate-900">
                      {cat.nombre}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Concepto y Tienda / Subcategoría */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Concepto / Descripción *
              </label>
              <input
                type="text"
                required
                placeholder="Ej. Compra semanal, Factura luz..."
                value={concepto}
                onChange={(e) => setConcepto(e.target.value)}
                className="w-full px-3.5 py-2 text-xs font-semibold rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Comercio / Tienda / Detalle
              </label>
              <input
                type="text"
                list="tiendas-list-edit"
                placeholder="Ej. Mercadona, Amazon, Iberdrola..."
                value={subcategoria}
                onChange={(e) => setSubcategoria(e.target.value)}
                className="w-full px-3.5 py-2 text-xs font-semibold rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
              <datalist id="tiendas-list-edit">
                {tiendasHabituales.map((t, idx) => (
                  <option key={idx} value={t.nombre} />
                ))}
              </datalist>
            </div>
          </div>

          {/* Etiqueta Especial / Proyecto */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Proyecto Especial / Etiqueta (Opcional)
            </label>
            <input
              type="text"
              placeholder="Ej. Obra Local, Viaje Londres, Furgoneta..."
              value={etiquetaEspecial}
              onChange={(e) => setEtiquetaEspecial(e.target.value)}
              className="w-full px-3.5 py-2 text-xs font-semibold rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          {/* Notas */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Notas Adicionales
            </label>
            <textarea
              rows={2}
              placeholder="Observaciones adicionales..."
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              className="w-full px-3.5 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          {/* Botones de Acción */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800 gap-3">
            <button
              type="button"
              onClick={handleDelete}
              className="px-3.5 py-2 rounded-xl text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 border border-rose-200 dark:border-rose-900/60 transition-colors flex items-center space-x-1.5 cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
              <span>Eliminar</span>
            </button>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Cancelar
              </button>

              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-600/30 transition-all flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
              >
                <Check className="w-4 h-4" />
                <span>{loading ? 'Guardando...' : 'Guardar Cambios'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
