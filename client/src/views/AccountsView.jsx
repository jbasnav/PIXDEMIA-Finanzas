import React, { useState, useEffect } from 'react';
import { WalletCards, Plus, Edit2, Check, X, ShieldAlert, Sparkles } from 'lucide-react';
import { formatCurrency } from '../utils/formatters';
import { api } from '../services/api';
import { useToast } from '../context/ToastContext';

export default function AccountsView({ onOpenQuickAdd }) {
  const { toast } = useToast();
  const [cuentas, setCuentas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ nombre: '', tipo: '', saldo_inicial_2026: 0, color_hex: '#3b82f6' });
  const [showAddForm, setShowAddForm] = useState(false);
  const [newAccount, setNewAccount] = useState({ nombre: '', tipo: 'corriente', saldo_inicial_2026: 0, color_hex: '#3b82f6' });

  const loadCuentas = async () => {
    try {
      setLoading(true);
      const res = await api.getCuentas();
      setCuentas(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCuentas();
  }, []);

  const handleStartEdit = (c) => {
    setEditingId(c.id);
    setEditForm({
      nombre: c.nombre,
      tipo: c.tipo,
      saldo_inicial_2026: c.saldo_inicial_2026,
      color_hex: c.color_hex || '#3b82f6'
    });
  };

  const handleSaveEdit = async (id) => {
    try {
      await api.updateCuenta(id, editForm);
      setEditingId(null);
      loadCuentas();
      toast.success('Cuenta actualizada correctamente', 'Cuenta');
    } catch (err) {
      toast.error('Error al actualizar cuenta: ' + err.message);
    }
  };

  const handleCreateAccount = async (e) => {
    e.preventDefault();
    try {
      await api.createCuenta(newAccount);
      setShowAddForm(false);
      setNewAccount({ nombre: '', tipo: 'corriente', saldo_inicial_2026: 0, color_hex: '#3b82f6' });
      loadCuentas();
      toast.success('Cuenta bancaria creada con éxito', 'Nueva Cuenta');
    } catch (err) {
      toast.error('Error al crear cuenta: ' + err.message);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      
      {/* Cabecera */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center space-x-2">
            <WalletCards className="w-6 h-6 text-brand-600 dark:text-brand-400" />
            <span>Cuentas Bancarias & Asignación Patrimonial</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Gestión de cuentas corrientes, cajas de ahorro y carteras de inversión a largo plazo.
          </p>
        </div>

        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center space-x-1.5 px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-brand-600 hover:bg-brand-500 rounded-xl shadow-md shadow-brand-600/20 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>{showAddForm ? 'Cerrar' : 'Añadir Cuenta'}</span>
        </button>
      </div>

      {/* Formulario Crear Cuenta */}
      {showAddForm && (
        <form onSubmit={handleCreateAccount} className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-brand-200 dark:border-brand-900 shadow-sm space-y-4">
          <h3 className="font-bold text-sm text-slate-900 dark:text-white">Nueva Cuenta Financiera</h3>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Nombre</label>
              <input
                type="text"
                required
                placeholder="Ej: Revolut, BBVA..."
                value={newAccount.nombre}
                onChange={(e) => setNewAccount({ ...newAccount, nombre: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Tipo</label>
              <select
                value={newAccount.tipo}
                onChange={(e) => setNewAccount({ ...newAccount, tipo: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
              >
                <option value="corriente">Cuenta Corriente</option>
                <option value="ahorro_emergencia">Ahorro / Imprevistos</option>
                <option value="inversion">Inversión (Indexa, etc.)</option>
                <option value="epsv">Plan EPSV / Pensiones</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Saldo Apertura 2026 (€)</label>
              <input
                type="number"
                step="0.01"
                value={newAccount.saldo_inicial_2026}
                onChange={(e) => setNewAccount({ ...newAccount, saldo_inicial_2026: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Color Identificativo</label>
              <input
                type="color"
                value={newAccount.color_hex}
                onChange={(e) => setNewAccount({ ...newAccount, color_hex: e.target.value })}
                className="w-full h-9 rounded-xl cursor-pointer bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
              />
            </div>
          </div>

          <div className="flex justify-end space-x-2">
            <button
              type="submit"
              className="px-4 py-2 text-xs font-bold text-white bg-brand-600 hover:bg-brand-500 rounded-xl"
            >
              Guardar Cuenta
            </button>
          </div>
        </form>
      )}

      {/* Grid de Cuentas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {cuentas.map(c => {
          const isEditing = editingId === c.id;

          return (
            <div 
              key={c.id}
              className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3"
            >
              {isEditing ? (
                <div className="space-y-3">
                  <div>
                    <label className="text-[10px] uppercase font-bold text-slate-400">Nombre</label>
                    <input
                      type="text"
                      value={editForm.nombre}
                      onChange={(e) => setEditForm({ ...editForm, nombre: e.target.value })}
                      className="w-full px-2.5 py-1 text-xs rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-bold text-slate-400">Saldo Apertura 2026</label>
                    <input
                      type="number"
                      step="0.01"
                      value={editForm.saldo_inicial_2026}
                      onChange={(e) => setEditForm({ ...editForm, saldo_inicial_2026: parseFloat(e.target.value) || 0 })}
                      className="w-full px-2.5 py-1 text-xs rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                    />
                  </div>
                  <div className="flex justify-end space-x-2 pt-2">
                    <button
                      onClick={() => setEditingId(null)}
                      className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100"
                    >
                      <X className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleSaveEdit(c.id)}
                      className="p-1.5 rounded-lg bg-brand-600 text-white hover:bg-brand-500"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: c.color_hex }} />
                      <h3 className="font-bold text-base text-slate-900 dark:text-white">
                        {c.nombre}
                      </h3>
                    </div>
                    <button
                      onClick={() => handleStartEdit(c)}
                      className="p-1 text-slate-400 hover:text-brand-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                      title="Editar cuenta"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <span className="inline-block text-[11px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 capitalize">
                    {c.tipo.replace('_', ' ')}
                  </span>

                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1">
                    <div className="flex justify-between items-baseline">
                      <span className="text-xs text-slate-500">Saldo Actual en Tiempo Real:</span>
                      <span className="text-xl font-black text-slate-900 dark:text-white">
                        {formatCurrency(c.saldo_actual)}
                      </span>
                    </div>

                    <div className="flex justify-between items-center text-xs text-slate-400 pt-1">
                      <span>Apertura 1 Enero 2026:</span>
                      <span>{formatCurrency(c.saldo_inicial_2026)}</span>
                    </div>
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>

    </div>
  );
}
