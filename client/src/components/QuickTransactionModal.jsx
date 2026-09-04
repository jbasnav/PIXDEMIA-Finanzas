import React, { useState, useEffect } from 'react';
import { X, ArrowRightLeft, ArrowDownRight, ArrowUpRight, Check, AlertCircle } from 'lucide-react';
import { api } from '../services/api';

export default function QuickTransactionModal({ isOpen, onClose, onTransactionCreated, cuentas, categorias }) {
  const [tipoMov, setTipoMov] = useState('gasto'); // 'gasto', 'ingreso', 'transferencia'
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
  const [cuentaId, setCuentaId] = useState('');
  const [cuentaDestinoId, setCuentaDestinoId] = useState('');
  const [cuentaImputadaId, setCuentaImputadaId] = useState('');
  const [esConsolidado, setEsConsolidado] = useState(1);
  const [categoriaId, setCategoriaId] = useState('');
  const [subcategoria, setSubcategoria] = useState('');
  const [concepto, setConcepto] = useState('');
  const [importe, setImporte] = useState('');
  const [etiquetaEspecial, setEtiquetaEspecial] = useState('');
  const [notas, setNotas] = useState('');

  const [tiendasHabituales, setTiendasHabituales] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen) {
      setError(null);
      // Seleccionar por defecto primera cuenta corriente
      if (cuentas && cuentas.length > 0 && !cuentaId) {
        setCuentaId(cuentas[0].id);
      }
      // Cargar tiendas habituales para autocompletado
      api.getTiendasHabituales().then(setTiendasHabituales).catch(console.error);
    }
  }, [isOpen, cuentas]);

  // Actualizar categoría por defecto según el tipo de movimiento
  useEffect(() => {
    if (!categorias || categorias.length === 0) return;

    if (tipoMov === 'transferencia') {
      const catTransf = categorias.find(c => c.tipo === 'transferencia_interna');
      if (catTransf) setCategoriaId(catTransf.id);
    } else if (tipoMov === 'ingreso') {
      const catIng = categorias.find(c => c.tipo === 'ingreso');
      if (catIng) setCategoriaId(catIng.id);
    } else {
      const catGasto = categorias.find(c => c.tipo === 'gasto_variable' || c.tipo === 'gasto_fijo');
      if (catGasto && (!categoriaId || categorias.find(c => c.id === Number(categoriaId))?.tipo === 'transferencia_interna')) {
        setCategoriaId(catGasto.id);
      }
    }
  }, [tipoMov, categorias]);

  if (!isOpen) return null;

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
        cuenta_imputada_id: cuentaImputadaId ? Number(cuentaImputadaId) : null,
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

      await api.createMovimiento(payload);
      
      // Reset form
      setImporte('');
      setConcepto('');
      setSubcategoria('');
      setCuentaImputadaId('');
      setEsConsolidado(1);
      setEtiquetaEspecial('');
      setNotas('');
      
      onTransactionCreated();
      onClose();
    } catch (err) {
      setError(err.message || 'Error al registrar el movimiento');
    } finally {
      setLoading(false);
    }
  };

  const filteredCategories = categorias.filter(c => {
    if (tipoMov === 'transferencia') return c.tipo === 'transferencia_interna';
    if (tipoMov === 'ingreso') return c.tipo === 'ingreso';
    return c.tipo !== 'transferencia_interna' && c.tipo !== 'ingreso';
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        
        {/* Cabecera Modal */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">
            Registrar Movimiento
          </h3>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[85vh] overflow-y-auto">
          {error && (
            <div className="flex items-center space-x-2 p-3 text-sm text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-xl">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Selector de Tipo de Movimiento */}
          <div className="grid grid-cols-3 gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
            <button
              type="button"
              onClick={() => setTipoMov('gasto')}
              className={`flex items-center justify-center space-x-1.5 py-2.5 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
                tipoMov === 'gasto'
                  ? 'bg-white dark:bg-slate-900 text-rose-600 dark:text-rose-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <ArrowDownRight className="w-4 h-4" />
              <span>Gasto</span>
            </button>

            <button
              type="button"
              onClick={() => setTipoMov('ingreso')}
              className={`flex items-center justify-center space-x-1.5 py-2.5 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
                tipoMov === 'ingreso'
                  ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <ArrowUpRight className="w-4 h-4" />
              <span>Ingreso</span>
            </button>

            <button
              type="button"
              onClick={() => setTipoMov('transferencia')}
              className={`flex items-center justify-center space-x-1.5 py-2.5 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
                tipoMov === 'transferencia'
                  ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
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
                <span>✓ Consolidado (Real)</span>
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
                <span>⏳ Previsto / Simulado</span>
              </button>
            </div>
          </div>

          {/* Fecha e Importe */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                Fecha
              </label>
              <input
                type="date"
                required
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:outline-none text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                Importe (€)
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                placeholder="0.00"
                value={importe}
                onChange={(e) => setImporte(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold text-base focus:ring-2 focus:ring-brand-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Cuentas (Origen y Destino / Imputación) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                {tipoMov === 'transferencia' ? 'Cuenta Origen (Sale)' : 'Cuenta Pagadora / Origen'}
              </label>
              <select
                required
                value={cuentaId}
                onChange={(e) => setCuentaId(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none"
              >
                {cuentas.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.nombre} ({c.tipo})
                  </option>
                ))}
              </select>
            </div>

            {tipoMov === 'transferencia' ? (
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  Cuenta Destino (Entra)
                </label>
                <select
                  required
                  value={cuentaDestinoId}
                  onChange={(e) => setCuentaDestinoId(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none"
                >
                  <option value="">Seleccionar destino...</option>
                  {cuentas.filter(c => c.id !== Number(cuentaId)).map(c => (
                    <option key={c.id} value={c.id}>
                      {c.nombre} ({c.tipo})
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  Categoría
                </label>
                <select
                  required
                  value={categoriaId}
                  onChange={(e) => setCategoriaId(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none"
                >
                  {filteredCategories.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.nombre}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Banco / Cuenta de Imputación (Opcional, útil para tarjetas o imputación contable a otro banco) */}
          {tipoMov !== 'transferencia' && (
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1 flex items-center justify-between">
                <span>Banco / Cuenta de Imputación (Opcional)</span>
                <span className="text-[10px] text-slate-400 font-normal">Si se debe asignar contablemente a otra entidad</span>
              </label>
              <select
                value={cuentaImputadaId}
                onChange={(e) => setCuentaImputadaId(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none"
              >
                <option value="">(Misma cuenta que el pago / Sin imputación especial)</option>
                {cuentas.map(c => (
                  <option key={c.id} value={c.id}>
                    Imputar a: {c.nombre} ({c.entidad || c.tipo})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Tienda / Subcategoría con Autocompletado */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
              Establecimiento / Tienda / Subcategoría
            </label>
            <input
              type="text"
              list="tiendas-list"
              placeholder="Ej: Eroski, Lidl, Leroy Merlin, Nómina..."
              value={subcategoria}
              onChange={(e) => setSubcategoria(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none"
            />
            <datalist id="tiendas-list">
              {tiendasHabituales.map((t, idx) => (
                <option key={idx} value={t} />
              ))}
            </datalist>
          </div>

          {/* Concepto Descriptivo */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
              Concepto / Detalle
            </label>
            <input
              type="text"
              required
              placeholder="Ej: Compra semanal, Factura luz, Repuestos furgoneta..."
              value={concepto}
              onChange={(e) => setConcepto(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none"
            />
          </div>

          {/* Proyecto / Etiqueta Especial */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                Proyecto / Etiqueta Especial
              </label>
              <input
                type="text"
                list="proyectos-list"
                placeholder="Ej: Obra Local, Viaje Londres, Furgoneta"
                value={etiquetaEspecial}
                onChange={(e) => setEtiquetaEspecial(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none"
              />
              <datalist id="proyectos-list">
                <option value="Obra Local" />
                <option value="Reonor" />
                <option value="Riff" />
                <option value="Viaje Londres" />
                <option value="Furgoneta" />
              </datalist>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                Notas Adicionales (Opcional)
              </label>
              <input
                type="text"
                placeholder="Detalles opcionales..."
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Botón Guardar */}
          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center space-x-2 px-5 py-2 text-sm font-semibold text-white bg-brand-600 hover:bg-brand-500 rounded-xl shadow-md shadow-brand-600/20 transition-all disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              <span>{loading ? 'Guardando...' : 'Guardar Movimiento'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
