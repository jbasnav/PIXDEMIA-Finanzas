import React, { useState, useEffect } from 'react';
import { 
  X, Plus, Edit2, Trash2, Landmark, Wallet, TrendingUp, 
  CreditCard, CheckCircle2, AlertTriangle, RefreshCw, Sparkles 
} from 'lucide-react';
import { api } from '../services/api';

const ACCOUNT_TYPES = [
  { value: 'corriente', label: 'Cuenta Corriente / Operativa', icon: Wallet, desc: 'Para gastos corrientes, recibos y nóminas' },
  { value: 'ahorro_emergencia', label: 'Ahorro / Fondo Emergencia', icon: Landmark, desc: 'Colchón de seguridad y reservas líquidas' },
  { value: 'inversion', label: 'Inversión / Fondos', icon: TrendingUp, desc: 'Indexados, acciones y patrimonio financiero' },
  { value: 'epsv', label: 'EPSV / Plan de Pensiones', icon: TrendingUp, desc: 'Planes de previsión social y jubilación' },
  { value: 'tarjeta', label: 'Tarjeta Crédito / Pago Agrupado', icon: CreditCard, desc: 'Pagos con tarjeta agrupados o diferidos' },
];

const PRESET_COLORS = [
  '#ec0000', // Santander red
  '#008080', // Kutxa teal
  '#36a18b', // N26 green
  '#1e293b', // Indexa navy
  '#6366f1', // Indigo
  '#ec4899', // Pink
  '#f59e0b', // Amber
  '#10b981', // Emerald
  '#06b6d4', // Cyan
  '#8b5cf6', // Violet
];

export default function AccountsManagerModal({ isOpen, onClose, onAccountsUpdated }) {
  const [cuentas, setCuentas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editingCuentaId, setEditingCuentaId] = useState(null);
  const [calibrationMode, setCalibrationMode] = useState('inicial'); // 'inicial' o 'actual'
  const [errorMsg, setErrorMsg] = useState('');

  const [form, setForm] = useState({
    nombre: '',
    tipo: 'corriente',
    saldo_inicial_2026: 0,
    calibrar_saldo_actual: 0,
    color_hex: '#6366f1',
    activo: 1
  });

  const loadCuentas = async () => {
    try {
      setLoading(true);
      setErrorMsg('');
      const data = await api.getCuentas();
      setCuentas(data || []);
    } catch (err) {
      setErrorMsg('Error al cargar cuentas: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadCuentas();
      resetForm();
    }
  }, [isOpen]);

  const resetForm = () => {
    setForm({
      nombre: '',
      tipo: 'corriente',
      saldo_inicial_2026: 0,
      calibrar_saldo_actual: 0,
      color_hex: PRESET_COLORS[Math.floor(Math.random() * PRESET_COLORS.length)],
      activo: 1
    });
    setIsEditing(false);
    setEditingCuentaId(null);
    setCalibrationMode('inicial');
    setErrorMsg('');
  };

  const handleOpenEdit = (cuenta) => {
    setIsEditing(true);
    setEditingCuentaId(cuenta.id);
    setForm({
      nombre: cuenta.nombre,
      tipo: cuenta.tipo,
      saldo_inicial_2026: cuenta.saldo_inicial_2026 || 0,
      calibrar_saldo_actual: cuenta.saldo_actual !== undefined ? cuenta.saldo_actual : (cuenta.saldo_inicial_2026 || 0),
      color_hex: cuenta.color_hex || '#6366f1',
      activo: cuenta.activo !== undefined ? cuenta.activo : 1
    });
    setCalibrationMode('actual');
    setErrorMsg('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!form.nombre.trim()) {
      setErrorMsg('El nombre de la cuenta es obligatorio.');
      return;
    }

    try {
      if (isEditing && editingCuentaId) {
        const payload = {
          nombre: form.nombre.trim(),
          tipo: form.tipo,
          color_hex: form.color_hex,
          activo: form.activo
        };

        if (calibrationMode === 'actual') {
          payload.calibrar_saldo_actual = Number(form.calibrar_saldo_actual);
        } else {
          payload.saldo_inicial_2026 = Number(form.saldo_inicial_2026);
        }

        await api.updateCuenta(editingCuentaId, payload);
      } else {
        await api.createCuenta({
          nombre: form.nombre.trim(),
          tipo: form.tipo,
          saldo_inicial_2026: Number(form.saldo_inicial_2026) || 0,
          color_hex: form.color_hex
        });
      }

      resetForm();
      await loadCuentas();
      if (onAccountsUpdated) onAccountsUpdated();
    } catch (err) {
      setErrorMsg(err.message || 'Error al guardar cuenta');
    }
  };

  const handleDelete = async (cuenta) => {
    const confirmMsg = cuenta.total_movimientos > 0
      ? `La cuenta "${cuenta.nombre}" tiene ${cuenta.total_movimientos} movimientos registrados. ¿Deseas eliminarla junto con todos sus movimientos? (Esta acción no se puede deshacer)`
      : `¿Estás seguro de eliminar la cuenta "${cuenta.nombre}"?`;

    if (!window.confirm(confirmMsg)) return;

    try {
      await api.deleteCuenta(cuenta.id, cuenta.total_movimientos > 0);
      await loadCuentas();
      if (onAccountsUpdated) onAccountsUpdated();
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 w-full max-w-4xl rounded-3xl p-6 sm:p-7 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-6 max-h-[92vh] overflow-y-auto">
        
        {/* Cabecera Modal */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
              <Landmark className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900 dark:text-white">
                Gestión de Cuentas Bancarias & Saldos
              </h2>
              <p className="text-xs text-slate-500">
                Configura tus entidades, tarjetas y calibra los saldos a día de hoy para prescindir de Excel.
              </p>
            </div>
          </div>

          <button 
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300 flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Listado de Cuentas Existentes (Lado Izquierdo) */}
          <div className="lg:col-span-7 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider">
                Cuentas y Entidades Activas ({cuentas.length})
              </h3>
              {isEditing && (
                <button
                  onClick={resetForm}
                  className="text-xs font-bold text-indigo-600 hover:underline flex items-center space-x-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Crear Nueva Cuenta</span>
                </button>
              )}
            </div>

            {loading ? (
              <div className="p-8 text-center text-xs text-slate-400">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-500" />
                <span>Cargando cuentas...</span>
              </div>
            ) : cuentas.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 text-slate-400 text-xs">
                No tienes cuentas creadas para esta gestión. ¡Añade tu primera cuenta en el formulario!
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
                {cuentas.map(c => {
                  const isSelected = editingCuentaId === c.id;
                  const isNeg = (c.saldo_actual || 0) < 0;

                  return (
                    <div
                      key={c.id}
                      className={`p-4 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                        isSelected 
                          ? 'border-indigo-500 bg-indigo-50/40 dark:bg-indigo-950/30 ring-2 ring-indigo-500/20' 
                          : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center space-x-3 min-w-0">
                        <div 
                          className="w-3.5 h-3.5 rounded-full shrink-0 shadow-xs" 
                          style={{ backgroundColor: c.color_hex || '#6366f1' }}
                        />
                        <div className="min-w-0">
                          <h4 className="font-black text-sm text-slate-900 dark:text-white truncate">
                            {c.nombre}
                          </h4>
                          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                            {c.tipo.replace('_', ' ')} • {c.total_movimientos || 0} movs
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center space-x-3 shrink-0">
                        <div className="text-right">
                          <span className="text-[10px] text-slate-400 block font-medium">Saldo Actual</span>
                          <span className={`text-sm font-black font-mono ${isNeg ? 'text-rose-600' : 'text-slate-900 dark:text-white'}`}>
                            {Number(c.saldo_actual || 0).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                          </span>
                        </div>

                        <div className="flex items-center space-x-1 pl-2 border-l border-slate-100 dark:border-slate-800">
                          <button
                            onClick={() => handleOpenEdit(c)}
                            title="Editar cuenta y calibrar saldo"
                            className="p-1.5 rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(c)}
                            title="Eliminar cuenta"
                            className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Formulario de Creación / Edición / Calibración (Lado Derecho) */}
          <div className="lg:col-span-5 bg-slate-50 dark:bg-slate-800/60 p-5 rounded-3xl border border-slate-200 dark:border-slate-700 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-3">
              <h3 className="font-black text-sm text-slate-900 dark:text-white flex items-center space-x-1.5">
                <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span>{isEditing ? 'Editar / Calibrar Cuenta' : 'Nueva Cuenta Bancaria'}</span>
              </h3>
              {isEditing && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300">
                  Modo Edición
                </span>
              )}
            </div>

            <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
              
              {/* Nombre de la Cuenta */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Nombre de la Entidad / Cuenta *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Santander, Kutxa, Tarjeta Kutxa, Revolut..."
                  value={form.nombre}
                  onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold text-xs"
                />
              </div>

              {/* Tipo de Cuenta */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Tipo de Cuenta / Función *
                </label>
                <select
                  value={form.tipo}
                  onChange={(e) => setForm({ ...form, tipo: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-semibold text-xs"
                >
                  {ACCOUNT_TYPES.map(t => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Calibración de Saldos */}
              {isEditing ? (
                <div className="space-y-2 p-3 bg-white dark:bg-slate-900 rounded-2xl border border-indigo-200 dark:border-indigo-800">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-black text-indigo-900 dark:text-indigo-300 text-[11px]">
                      Calibración de Saldo
                    </span>
                    <div className="flex bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg text-[10px] font-bold">
                      <button
                        type="button"
                        onClick={() => setCalibrationMode('actual')}
                        className={`px-2 py-0.5 rounded-md transition-all ${calibrationMode === 'actual' ? 'bg-white dark:bg-slate-900 text-indigo-600 shadow-xs' : 'text-slate-500'}`}
                      >
                        Saldo Actual (Hoy)
                      </button>
                      <button
                        type="button"
                        onClick={() => setCalibrationMode('inicial')}
                        className={`px-2 py-0.5 rounded-md transition-all ${calibrationMode === 'inicial' ? 'bg-white dark:bg-slate-900 text-indigo-600 shadow-xs' : 'text-slate-500'}`}
                      >
                        Saldo Apertura
                      </button>
                    </div>
                  </div>

                  {calibrationMode === 'actual' ? (
                    <div>
                      <label className="block text-[10px] text-slate-500 mb-1">
                        Introduce el saldo que muestra el banco a fecha de hoy. Se recalculará automáticamente la base.
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          step="0.01"
                          required
                          value={form.calibrar_saldo_actual}
                          onChange={(e) => setForm({ ...form, calibrar_saldo_actual: parseFloat(e.target.value) || 0 })}
                          className="w-full pl-3 pr-8 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono font-black text-slate-900 dark:text-white text-sm"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 font-bold text-slate-400">€</span>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <label className="block text-[10px] text-slate-500 mb-1">
                        Saldo inicial de apertura del ejercicio fiscal 2026.
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          step="0.01"
                          required
                          value={form.saldo_inicial_2026}
                          onChange={(e) => setForm({ ...form, saldo_inicial_2026: parseFloat(e.target.value) || 0 })}
                          className="w-full pl-3 pr-8 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono font-bold text-slate-900 dark:text-white"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 font-bold text-slate-400">€</span>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Saldo Inicial / Saldo de Apertura (€)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      required
                      placeholder="0.00"
                      value={form.saldo_inicial_2026}
                      onChange={(e) => setForm({ ...form, saldo_inicial_2026: parseFloat(e.target.value) || 0 })}
                      className="w-full pl-3 pr-8 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-mono font-black text-slate-900 dark:text-white text-sm"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 font-bold text-slate-400">€</span>
                  </div>
                </div>
              )}

              {/* Selector de Color */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Color Identificativo
                </label>
                <div className="flex flex-wrap gap-2 items-center">
                  {PRESET_COLORS.map(col => (
                    <button
                      key={col}
                      type="button"
                      onClick={() => setForm({ ...form, color_hex: col })}
                      className={`w-6 h-6 rounded-full border-2 transition-transform ${form.color_hex === col ? 'scale-125 border-slate-900 dark:border-white shadow-md' : 'border-transparent hover:scale-110'}`}
                      style={{ backgroundColor: col }}
                    />
                  ))}
                  <input
                    type="color"
                    value={form.color_hex}
                    onChange={(e) => setForm({ ...form, color_hex: e.target.value })}
                    className="w-7 h-7 rounded-xl border-0 p-0 cursor-pointer"
                    title="Color personalizado"
                  />
                </div>
              </div>

              {/* Botones de Acción */}
              <div className="pt-3 border-t border-slate-200 dark:border-slate-700 flex items-center justify-end space-x-2">
                {isEditing && (
                  <button
                    type="button"
                    onClick={resetForm}
                    className="px-3 py-2 rounded-xl text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 font-bold"
                  >
                    Cancelar
                  </button>
                )}
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black shadow-md shadow-indigo-600/30 transition-all flex items-center space-x-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{isEditing ? 'Guardar Cambios' : 'Crear Cuenta'}</span>
                </button>
              </div>

            </form>
          </div>

        </div>

      </div>
    </div>
  );
}
