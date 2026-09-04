import React, { useState, useEffect } from 'react';
import { X, ArrowRightLeft, ArrowDownRight, ArrowUpRight, Check, AlertCircle, Landmark, Repeat, CalendarDays, Layers, Sparkles, TrendingUp } from 'lucide-react';
import { api } from '../services/api';

export default function QuickTransactionModal({ isOpen, onClose, onTransactionCreated, cuentas, categorias, pasivos = [] }) {
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
  const [pasivoId, setPasivoId] = useState('');
  const [pasivosList, setPasivosList] = useState(pasivos || []);
  const [etiquetaEspecial, setEtiquetaEspecial] = useState('');
  const [notas, setNotas] = useState('');

  // Estados de Serie Repetitiva
  const [esSerie, setEsSerie] = useState(false);
  const [frecuenciaSerie, setFrecuenciaSerie] = useState('mensual');
  const [modoFin, setModoFin] = useState('fecha_fin');
  const [fechaFinSerie, setFechaFinSerie] = useState('');
  const [numeroCuotasSerie, setNumeroCuotasSerie] = useState(12);

  const [tiendasHabituales, setTiendasHabituales] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen) {
      setError(null);
      const todayStr = new Date().toISOString().split('T')[0];
      setFecha(todayStr);
      // Fecha fin por defecto +1 año
      const baseD = new Date();
      baseD.setFullYear(baseD.getFullYear() + 1);
      setFechaFinSerie(baseD.toISOString().split('T')[0]);
      setEsSerie(false);
      setPasivoId('');

      // Seleccionar por defecto primera cuenta corriente
      if (cuentas && cuentas.length > 0 && !cuentaId) {
        setCuentaId(cuentas[0].id);
      }
      // Cargar tiendas habituales y pasivos
      api.getTiendasHabituales().then(setTiendasHabituales).catch(console.error);
      api.getPasivos().then(pList => setPasivosList(pList || [])).catch(console.error);
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
        cuenta_destino_id: cuentaDestinoId ? Number(cuentaDestinoId) : null,
        pasivo_id: pasivoId ? Number(pasivoId) : null,
        es_consolidado: Number(esConsolidado),
        etiqueta_especial: etiquetaEspecial.trim() || null,
        notas: notas.trim() || null,
        frecuencia_recurrencia: esSerie ? frecuenciaSerie : null
      };

      const creado = await api.createMovimiento(payload);

      if (esSerie && creado?.id) {
        try {
          await api.convertirEnSerie(creado.id, {
            frecuencia: frecuenciaSerie,
            modo_fin: modoFin,
            fecha_fin: modoFin === 'numero_cuotas' ? null : fechaFinSerie,
            numero_cuotas: Number(numeroCuotasSerie),
            fecha_inicio: fecha
          });
        } catch (sErr) {
          console.error('Error generando serie en alta rápida:', sErr);
        }
      }
      
      // Reset form
      setImporte('');
      setConcepto('');
      setSubcategoria('');
      setCuentaImputadaId('');
      setPasivoId('');
      setEsSerie(false);
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

          {/* Vincular con Préstamo / Pasivo */}
          {tipoMov !== 'transferencia' && pasivosList.length > 0 && (
            <div className="p-3.5 rounded-2xl border border-indigo-100 dark:border-indigo-900/40 bg-indigo-50/50 dark:bg-indigo-950/20 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-indigo-950 dark:text-indigo-200 flex items-center space-x-1.5">
                  <Landmark className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <span>Vincular con Préstamo / Pasivo</span>
                </label>
                {pasivoId && (
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                    esConsolidado === 1 
                      ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300' 
                      : 'bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300'
                  }`}>
                    {esConsolidado === 1 ? '🟢 Descuenta Saldo Vivo' : '🟡 Previsión Tesorería'}
                  </span>
                )}
              </div>
              <select
                value={pasivoId}
                onChange={(e) => setPasivoId(e.target.value)}
                className="w-full px-3 py-2 text-xs font-semibold rounded-xl bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none cursor-pointer"
              >
                <option value="" className="dark:bg-slate-900">-- Ninguno (Gasto / Ingreso general) --</option>
                {pasivosList.map(p => (
                  <option key={p.id} value={p.id} className="dark:bg-slate-900">
                    🏦 {p.nombre} (Saldo vivo: {Number(p.capital_pendiente || 0).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €)
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Vincular con Fondo / Plan de Pensiones / EPSV / Inversión */}
          {tipoMov !== 'transferencia' && (
            <div className="p-3.5 rounded-2xl border border-emerald-100 dark:border-emerald-900/40 bg-emerald-50/40 dark:bg-emerald-950/20 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-emerald-950 dark:text-emerald-200 flex items-center space-x-1.5">
                  <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>Vincular con Fondo de Pensiones / EPSV / Inversión</span>
                </label>
                {cuentaDestinoId && (
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                    esConsolidado === 1 
                      ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300' 
                      : 'bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300'
                  }`}>
                    {esConsolidado === 1 ? '🟢 Suma a Patrimonio' : '🟡 Previsión Aportación'}
                  </span>
                )}
              </div>
              <select
                value={cuentaDestinoId}
                onChange={(e) => setCuentaDestinoId(e.target.value)}
                className="w-full px-3 py-2 text-xs font-semibold rounded-xl bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none cursor-pointer"
              >
                <option value="" className="dark:bg-slate-900">-- Ninguno (Gasto general / Sin destino patrimonial) --</option>
                {cuentas.filter(c => c.id !== Number(cuentaId)).map(c => (
                  <option key={c.id} value={c.id} className="dark:bg-slate-900">
                    📈 {c.nombre} ({c.tipo === 'epsv' ? 'Plan de Pensiones / EPSV' : c.tipo === 'inversion' ? 'Inversión / Cartera' : c.tipo})
                  </option>
                ))}
              </select>
              {cuentaDestinoId && (
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
                  {esConsolidado === 1 
                    ? '💡 Al estar CONSOLIDADO, esta aportación incrementa el saldo patrimonial de este fondo/EPSV.'
                    : '⏳ Al estar en PREVISIÓN, no altera el saldo hasta que se marque como Consolidado.'}
                </p>
              )}
            </div>
          )}

          {/* Serie Repetitiva / Recurrencias (Gastos Tipo 2) */}
          <div className={`p-3.5 rounded-2xl border transition-all space-y-3 ${
            esSerie 
              ? 'border-purple-200 dark:border-purple-800/80 bg-purple-50/40 dark:bg-purple-950/20 shadow-sm' 
              : 'border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/20'
          }`}>
            <label className="flex items-center space-x-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={esSerie}
                onChange={(e) => setEsSerie(e.target.checked)}
                className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 border-slate-300 dark:border-slate-700 cursor-pointer"
              />
              <div>
                <span className="flex items-center space-x-1.5 text-xs font-bold text-slate-900 dark:text-white">
                  <Repeat className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                  <span>Crear como Serie Repetitiva / Periódica</span>
                </span>
                <span className="text-[10px] text-purple-700 dark:text-purple-300 font-semibold block">
                  🏷️ Gasto Tipo 2 (Fijo / Recurrente según modelo Excel)
                </span>
              </div>
            </label>

            {esSerie && (
              <div className="space-y-3 pt-1 border-t border-purple-100 dark:border-purple-900/40 animate-fadeIn">
                {/* Selector de Frecuencia */}
                <div>
                  <label className="block text-[11px] font-bold text-purple-950 dark:text-purple-200 mb-1">
                    Frecuencia de Repetición
                  </label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {[
                      { id: 'mensual', label: 'Mensual' },
                      { id: 'quincenal', label: 'Quincenal' },
                      { id: 'semanal', label: 'Semanal' },
                      { id: 'trimestral', label: 'Trimestral' },
                      { id: 'bimestral', label: 'Bimestral' },
                      { id: 'semestral', label: 'Semestral' },
                      { id: 'anual', label: 'Anual' }
                    ].map(f => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => setFrecuenciaSerie(f.id)}
                        className={`py-1.5 px-2 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
                          frecuenciaSerie === f.id
                            ? 'bg-purple-600 text-white shadow-sm font-black'
                            : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-purple-100 dark:border-purple-900/60 hover:bg-purple-50'
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Modo de Finalización */}
                <div className="space-y-2">
                  <label className="block text-[11px] font-bold text-purple-950 dark:text-purple-200">
                    Límite o Finalización de la Serie
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setModoFin('fecha_fin')}
                      className={`flex items-center justify-center space-x-1.5 py-1.5 px-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                        modoFin === 'fecha_fin'
                          ? 'bg-purple-600 text-white border-purple-700 shadow-sm font-black'
                          : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      <CalendarDays className="w-3.5 h-3.5" />
                      <span>Hasta una Fecha Fin</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setModoFin('numero_cuotas')}
                      className={`flex items-center justify-center space-x-1.5 py-1.5 px-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                        modoFin === 'numero_cuotas'
                          ? 'bg-purple-600 text-white border-purple-700 shadow-sm font-black'
                          : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      <Layers className="w-3.5 h-3.5" />
                      <span>Por Nº de Cuotas</span>
                    </button>
                  </div>

                  {modoFin === 'fecha_fin' ? (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-semibold text-slate-600 dark:text-slate-300">Fecha de Finalización *</span>
                        {pasivoId && pasivosList.find(p => String(p.id) === String(pasivoId))?.fecha_fin_prevista && (
                          <button
                            type="button"
                            onClick={() => {
                              const p = pasivosList.find(item => String(item.id) === String(pasivoId));
                              if (p?.fecha_fin_prevista) {
                                setFechaFinSerie(p.fecha_fin_prevista.substring(0, 10));
                              }
                            }}
                            className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer flex items-center space-x-1"
                          >
                            <Sparkles className="w-3 h-3" />
                            <span>Copiar fin del préstamo</span>
                          </button>
                        )}
                      </div>
                      <input
                        type="date"
                        required={esSerie && modoFin === 'fecha_fin'}
                        value={fechaFinSerie}
                        min={fecha}
                        onChange={(e) => setFechaFinSerie(e.target.value)}
                        className="w-full px-3 py-2 text-xs font-semibold rounded-xl bg-white dark:bg-slate-900 border border-purple-200 dark:border-purple-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:outline-none"
                      />
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-semibold text-slate-600 dark:text-slate-300">Número de Ocurrencias / Cuotas *</span>
                        <div className="flex items-center space-x-1">
                          {[6, 12, 24, 36, 60].map(n => (
                            <button
                              key={n}
                              type="button"
                              onClick={() => setNumeroCuotasSerie(n)}
                              className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 hover:bg-purple-100 text-slate-700 dark:text-slate-300 cursor-pointer"
                            >
                              {n}
                            </button>
                          ))}
                        </div>
                      </div>
                      <input
                        type="number"
                        min="2"
                        max="240"
                        required={esSerie && modoFin === 'numero_cuotas'}
                        value={numeroCuotasSerie}
                        onChange={(e) => setNumeroCuotasSerie(Number(e.target.value))}
                        className="w-full px-3 py-2 text-xs font-black rounded-xl bg-white dark:bg-slate-900 border border-purple-200 dark:border-purple-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:outline-none"
                      />
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

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
