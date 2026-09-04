import React, { useState, useEffect } from 'react';
import { X, ArrowRightLeft, ArrowDownRight, ArrowUpRight, Check, AlertCircle, Trash2, CheckCircle2, Clock, Landmark, Repeat, Calendar, CalendarDays, Sparkles, Layers, RefreshCw, TrendingUp } from 'lucide-react';
import { api } from '../services/api';
import { useToast } from '../context/ToastContext';

export default function EditTransactionModal({ isOpen, onClose, movimiento, onTransactionUpdated, onTransactionDeleted, cuentas = [], categorias = [], pasivos = [] }) {
  const { toast, confirmDialog } = useToast();
  const [tipoMov, setTipoMov] = useState('gasto'); // 'gasto', 'ingreso', 'transferencia'
  const [fecha, setFecha] = useState('');
  const [cuentaId, setCuentaId] = useState('');
  const [cuentaDestinoId, setCuentaDestinoId] = useState('');
  const [cuentaImputadaId, setCuentaImputadaId] = useState('');
  const [categoriaId, setCategoriaId] = useState('');
  const [subcategoria, setSubcategoria] = useState('');
  const [concepto, setConcepto] = useState('');
  const [importe, setImporte] = useState('');
  const [pasivoId, setPasivoId] = useState('');
  const [pasivosList, setPasivosList] = useState(pasivos || []);
  const [esConsolidado, setEsConsolidado] = useState(1);
  const [etiquetaEspecial, setEtiquetaEspecial] = useState('');
  const [notas, setNotas] = useState('');

  // Estados para Series Repetitivas / Recurrencias
  const [esSerie, setEsSerie] = useState(false);
  const [frecuenciaSerie, setFrecuenciaSerie] = useState('mensual');
  const [modoFin, setModoFin] = useState('fecha_fin'); // 'fecha_fin' | 'numero_cuotas' | 'solo_fin'
  const [fechaFinSerie, setFechaFinSerie] = useState('');
  const [numeroCuotasSerie, setNumeroCuotasSerie] = useState(12);
  const [generarRepeticiones, setGenerarRepeticiones] = useState(false);
  const [actualizarPosteriores, setActualizarPosteriores] = useState(true);

  const [tiendasHabituales, setTiendasHabituales] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen && movimiento) {
      setError(null);
      const movDate = movimiento.fecha ? movimiento.fecha.substring(0, 10) : new Date().toISOString().split('T')[0];
      setFecha(movDate);
      setCuentaId(movimiento.cuenta_id || (cuentas[0]?.id || ''));
      setCuentaDestinoId(movimiento.cuenta_destino_id || '');
      setCuentaImputadaId(movimiento.cuenta_imputada_id || '');
      setCategoriaId(movimiento.categoria_id || (categorias[0]?.id || ''));
      setSubcategoria(movimiento.subcategoria || '');
      setConcepto(movimiento.concepto || '');
      setImporte(Math.abs(movimiento.importe || 0).toString());
      setEsConsolidado(movimiento.es_consolidado !== undefined ? Number(movimiento.es_consolidado) : 1);
      setEtiquetaEspecial(movimiento.etiqueta_especial || '');
      setNotas(movimiento.notas || '');

      // Recurrencias
      const hasSerie = Boolean(movimiento.serie_id);
      setEsSerie(hasSerie);
      setFrecuenciaSerie(movimiento.frecuencia_recurrencia || 'mensual');
      setGenerarRepeticiones(!hasSerie); // Si es nueva serie, activar por defecto
      setActualizarPosteriores(true);

      // Calcular fecha fin por defecto (ej. +12 meses desde la fecha del movimiento)
      const baseD = new Date(movDate + 'T00:00:00');
      baseD.setFullYear(baseD.getFullYear() + 1);
      setFechaFinSerie(baseD.toISOString().split('T')[0]);
      setNumeroCuotasSerie(12);

      if (movimiento.es_transferencia_interna === 1) {
        setTipoMov('transferencia');
      } else if (movimiento.importe >= 0) {
        setTipoMov('ingreso');
      } else {
        setTipoMov('gasto');
      }

      api.getTiendasHabituales().then(setTiendasHabituales).catch(console.error);

      // Cargar lista de pasivos y auto-vincular si coincide por nombre/etiqueta
      api.getPasivos().then(pList => {
        setPasivosList(pList || []);
        if (movimiento.pasivo_id) {
          setPasivoId(String(movimiento.pasivo_id));
        } else if (pList && pList.length > 0) {
          const textMatch = `${movimiento.concepto || ''} ${movimiento.etiqueta_especial || ''} ${movimiento.subcategoria || ''}`.toLowerCase();
          const match = pList.find(p => textMatch.includes(p.nombre.toLowerCase()));
          if (match) {
            setPasivoId(String(match.id));
          } else {
            setPasivoId('');
          }
        }
      }).catch(console.error);

      // Auto-detectar Fondo de Pensiones / EPSV si coincide en el concepto
      if (movimiento.cuenta_destino_id) {
        setCuentaDestinoId(String(movimiento.cuenta_destino_id));
      } else if (cuentas && cuentas.length > 0) {
        const textMatch = `${movimiento.concepto || ''} ${movimiento.etiqueta_especial || ''} ${movimiento.subcategoria || ''}`.toLowerCase();
        const matchedCuenta = cuentas.find(c => {
          const cNom = c.nombre.toLowerCase();
          if (c.tipo === 'epsv' || c.tipo === 'inversion' || cNom.includes('epsv') || cNom.includes('indexa') || cNom.includes('fondo')) {
            if (textMatch.includes('yug') && (cNom.includes('yolanda') || cNom.includes('yug'))) return true;
            if (textMatch.includes('jbn') && (cNom.includes('julio') || cNom.includes('jbn'))) return true;
            if (textMatch.includes('julio') && cNom.includes('julio')) return true;
            if (textMatch.includes('yolanda') && cNom.includes('yolanda')) return true;
            if (textMatch.includes('indexa') && cNom.includes('indexa')) return true;
            if (textMatch.includes(cNom) || cNom.includes(textMatch)) return true;
          }
          return false;
        });
        if (matchedCuenta) {
          setCuentaDestinoId(String(matchedCuenta.id));
        }
      }
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
        cuenta_imputada_id: cuentaImputadaId ? Number(cuentaImputadaId) : null,
        categoria_id: Number(categoriaId),
        subcategoria: subcategoria.trim(),
        concepto: concepto.trim() || (isTransfer ? 'Traspaso interno' : (subcategoria || 'Gasto')),
        importe: finalImporte,
        es_transferencia_interna: isTransfer,
        cuenta_destino_id: cuentaDestinoId ? Number(cuentaDestinoId) : null,
        es_consolidado: Number(esConsolidado),
        etiqueta_especial: etiquetaEspecial.trim() || null,
        notas: notas.trim() || null,
        pasivo_id: pasivoId ? Number(pasivoId) : null,
        frecuencia_recurrencia: esSerie ? frecuenciaSerie : null,
        actualizar_posteriores_serie: Boolean(esSerie && actualizarPosteriores)
      };

      const updated = await api.updateMovimiento(movimiento.id, payload);

      if (esSerie && generarRepeticiones) {
        try {
          const serieRes = await api.convertirEnSerie(movimiento.id, {
            frecuencia: frecuenciaSerie,
            modo_fin: modoFin,
            fecha_fin: modoFin === 'numero_cuotas' ? null : fechaFinSerie,
            numero_cuotas: Number(numeroCuotasSerie),
            fecha_inicio: fecha
          });
          toast.success(
            `Serie repetitiva guardada: se generaron ${serieRes.total_generados} movimientos previstos (⏳ Simulación)`,
            'Serie Recurrente'
          );
        } catch (sErr) {
          console.error('Error generando ocurrencias de la serie:', sErr);
          toast.warning('Movimiento actualizado pero hubo un problema generando la serie: ' + sErr.message, 'Recurrencia');
        }
      } else {
        toast.success('Movimiento actualizado con éxito', 'Movimientos');
      }

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

  const handleDeleteSerieFuturos = async () => {
    const ok = await confirmDialog({
      title: 'Eliminar Previsiones Futuras de la Serie',
      message: '¿Deseas eliminar todas las repeticiones futuras no consolidadas (⏳ Previsión) asociadas a esta serie?',
      confirmText: 'Sí, Eliminar Futuros',
      type: 'warning'
    });
    if (!ok) return;

    try {
      setLoading(true);
      const res = await api.deleteSerieFuturos(movimiento.id);
      toast.info(`Se eliminaron ${res.eliminados} movimientos futuros de la serie`, 'Serie Recurrente');
      if (onTransactionUpdated) {
        onTransactionUpdated(movimiento);
      }
      onClose();
    } catch (err) {
      setError(err.message || 'Error al eliminar futuros de la serie');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    const ok = await confirmDialog({
      title: 'Eliminar Movimiento',
      message: '¿Estás seguro de que deseas eliminar permanentemente este movimiento?',
      confirmText: 'Sí, Eliminar',
      type: 'danger'
    });
    if (!ok) return;

    try {
      setLoading(true);
      await api.deleteMovimiento(movimiento.id);
      if (onTransactionDeleted) {
        onTransactionDeleted(movimiento.id);
      }
      toast.success('Movimiento eliminado', 'Movimientos');
      onClose();
    } catch (err) {
      setError(err.message || 'Error al eliminar el movimiento');
    } finally {
      setLoading(false);
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
                {tipoMov === 'transferencia' ? 'Cuenta Origen *' : 'Cuenta / Banco Pagador *'}
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

          {/* Banco / Cuenta de Imputación (Opcional) */}
          {tipoMov !== 'transferencia' && (
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center justify-between">
                <span>Banco / Cuenta de Imputación (Opcional)</span>
                <span className="text-[10px] text-slate-400 font-normal">Si se debe asignar contablemente a otra entidad</span>
              </label>
              <select
                value={cuentaImputadaId}
                onChange={(e) => setCuentaImputadaId(e.target.value)}
                className="w-full px-3 py-2 text-xs font-semibold rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none cursor-pointer"
              >
                <option value="" className="dark:bg-slate-900">(Misma cuenta que el pago / Sin imputación especial)</option>
                {cuentas.map(c => (
                  <option key={c.id} value={c.id} className="dark:bg-slate-900">
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
              {pasivoId && (
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
                  {esConsolidado === 1 
                    ? '💡 Al estar CONSOLIDADO, amortizará el capital en este pasivo y recalculará la fecha fin.'
                    : '⏳ Al estar en PREVISIÓN, no altera el saldo de deuda hasta que se marque como Consolidado.'}
                </p>
              )}
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
            <div className="flex items-center justify-between">
              <label className="flex items-center space-x-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={esSerie}
                  onChange={(e) => {
                    setEsSerie(e.target.checked);
                    if (e.target.checked) setGenerarRepeticiones(true);
                  }}
                  className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 border-slate-300 dark:border-slate-700 cursor-pointer"
                />
                <div>
                  <span className="flex items-center space-x-1.5 text-xs font-bold text-slate-900 dark:text-white">
                    <Repeat className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                    <span>Serie Repetitiva / Periódica</span>
                  </span>
                  <span className="text-[10px] text-purple-700 dark:text-purple-300 font-semibold block">
                    🏷️ Gasto Tipo 2 (Fijo / Recurrente según modelo Excel)
                  </span>
                </div>
              </label>

              {movimiento.serie_id && (
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300">
                  🔁 Serie Activa
                </span>
              )}
            </div>

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
                            <span>Copiar fin del préstamo ({pasivosList.find(p => String(p.id) === String(pasivoId))?.fecha_fin_prevista})</span>
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

                {/* Opciones de Generación y Sincronización */}
                <div className="p-2.5 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-purple-100 dark:border-purple-900/40 space-y-2 text-xs">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={generarRepeticiones}
                      onChange={(e) => setGenerarRepeticiones(e.target.checked)}
                      className="w-3.5 h-3.5 rounded text-purple-600 focus:ring-purple-500 border-slate-300 cursor-pointer"
                    />
                    <span className="font-medium text-slate-700 dark:text-slate-300">
                      Generar repeticiones automáticas como previsiones (⏳ Simulación)
                    </span>
                  </label>

                  {movimiento.serie_id && (
                    <>
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={actualizarPosteriores}
                          onChange={(e) => setActualizarPosteriores(e.target.checked)}
                          className="w-3.5 h-3.5 rounded text-purple-600 focus:ring-purple-500 border-slate-300 cursor-pointer"
                        />
                        <span className="font-medium text-slate-700 dark:text-slate-300">
                          Propagar cambios (importe/categoría/cuenta) a futuros previstos de la serie
                        </span>
                      </label>

                      <div className="pt-1 flex justify-end">
                        <button
                          type="button"
                          onClick={handleDeleteSerieFuturos}
                          className="text-[11px] font-bold text-rose-600 dark:text-rose-400 hover:underline cursor-pointer flex items-center space-x-1"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Eliminar previsiones futuras de esta serie</span>
                        </button>
                      </div>
                    </>
                  )}
                </div>
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
