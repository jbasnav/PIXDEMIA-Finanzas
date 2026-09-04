import React, { useState, useEffect } from 'react';
import { 
  X, Plus, Check, Trash2, Edit2, Users, Building, 
  Briefcase, User, Sparkles, AlertTriangle 
} from 'lucide-react';
import { api, getGlobalUser, setGlobalUser } from '../services/api';

const ICONS_MAP = {
  Users: Users,
  Building: Building,
  Briefcase: Briefcase,
  User: User
};

const PRESET_USER_COLORS = [
  '#4f46e5', // Indigo
  '#0284c7', // Sky
  '#059669', // Emerald
  '#d97706', // Amber
  '#dc2626', // Red
  '#7c3aed', // Purple
  '#db2777'  // Pink
];

export default function UsersManagerModal({ isOpen, onClose, onUserSwitched }) {
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState(getGlobalUser());
  const [isEditing, setIsEditing] = useState(false);
  const [editingUserId, setEditingUserId] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  const [form, setForm] = useState({
    nombre: '',
    email_o_alias: '',
    color_hex: '#4f46e5',
    icono: 'Users'
  });

  const loadUsuarios = async () => {
    try {
      setLoading(true);
      setErrorMsg('');
      const data = await api.getUsuarios();
      setUsuarios(data || []);
      const current = getGlobalUser();
      setActiveId(Number(current));
    } catch (err) {
      setErrorMsg('Error al cargar perfiles: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadUsuarios();
      resetForm();
    }
  }, [isOpen]);

  const resetForm = () => {
    setForm({
      nombre: '',
      email_o_alias: '',
      color_hex: PRESET_USER_COLORS[Math.floor(Math.random() * PRESET_USER_COLORS.length)],
      icono: 'Users'
    });
    setIsEditing(false);
    setEditingUserId(null);
    setErrorMsg('');
  };

  const handleSelectUser = (user) => {
    setGlobalUser(user.id);
    setActiveId(user.id);
    if (onUserSwitched) onUserSwitched(user);
    onClose();
  };

  const handleOpenEdit = (user, e) => {
    e.stopPropagation();
    setIsEditing(true);
    setEditingUserId(user.id);
    setForm({
      nombre: user.nombre,
      email_o_alias: user.email_o_alias || '',
      color_hex: user.color_hex || '#4f46e5',
      icono: user.icono || 'Users'
    });
    setErrorMsg('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!form.nombre.trim()) {
      setErrorMsg('El nombre de la gestión o usuario es obligatorio.');
      return;
    }

    try {
      if (isEditing && editingUserId) {
        await api.updateUsuario(editingUserId, form);
      } else {
        const nuevo = await api.createUsuario(form);
        // Si es el primer usuario o se crea nuevo, cambiar a él
        if (nuevo && nuevo.id) {
          setGlobalUser(nuevo.id);
          setActiveId(nuevo.id);
        }
      }

      resetForm();
      await loadUsuarios();
      if (onUserSwitched) onUserSwitched();
    } catch (err) {
      setErrorMsg(err.message || 'Error al guardar perfil');
    }
  };

  const handleDelete = async (user, e) => {
    e.stopPropagation();
    if (!window.confirm(`¿Estás seguro de eliminar el perfil "${user.nombre}" y todos sus datos asociados?`)) return;

    try {
      await api.deleteUsuario(user.id);
      const data = await api.getUsuarios();
      setUsuarios(data || []);
      if (activeId === user.id && data && data.length > 0) {
        setGlobalUser(data[0].id);
        setActiveId(data[0].id);
      }
      if (onUserSwitched) onUserSwitched();
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-3xl p-6 sm:p-7 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
        
        {/* Cabecera Modal */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900 dark:text-white">
                Gestiones & Perfiles de Usuario
              </h2>
              <p className="text-xs text-slate-500">
                Alterna entre diferentes gestiones financieras (Familia, Empresa, Personal) o crea un entorno nuevo.
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

        {/* Lista de Perfiles Existentes */}
        <div className="space-y-3">
          <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider">
            Perfiles Disponibles
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {usuarios.map(u => {
              const isSelected = activeId === u.id;
              const IconComp = ICONS_MAP[u.icono] || Users;

              return (
                <div
                  key={u.id}
                  onClick={() => handleSelectUser(u)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                    isSelected 
                      ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/40 ring-2 ring-indigo-500 shadow-md' 
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 hover:shadow-xs'
                  }`}
                >
                  <div className="flex items-center space-x-3 min-w-0">
                    <div 
                      className="w-10 h-10 rounded-2xl flex items-center justify-center text-white shadow-xs shrink-0"
                      style={{ backgroundColor: u.color_hex || '#4f46e5' }}
                    >
                      <IconComp className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center space-x-1.5">
                        <h4 className="font-black text-sm text-slate-900 dark:text-white truncate">
                          {u.nombre}
                        </h4>
                        {isSelected && (
                          <span className="px-1.5 py-0.2 rounded-full text-[9px] font-black bg-indigo-600 text-white">
                            Activo
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 truncate">
                        {u.total_cuentas || 0} cuentas • {u.total_movimientos || 0} movimientos
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-1 shrink-0">
                    <button
                      onClick={(e) => handleOpenEdit(u, e)}
                      title="Editar perfil"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    {usuarios.length > 1 && (
                      <button
                        onClick={(e) => handleDelete(u, e)}
                        title="Eliminar perfil"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Formulario Crear / Editar Perfil */}
        <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-3.5">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-2.5">
            <h4 className="font-black text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center space-x-1.5">
              <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>{isEditing ? 'Editar Perfil / Gestión' : 'Crear Nueva Gestión / Usuario'}</span>
            </h4>
            {isEditing && (
              <button
                onClick={resetForm}
                className="text-[11px] font-bold text-indigo-600 hover:underline"
              >
                Cancelar edición
              </button>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-3 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Nombre de la Gestión / Entorno *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Finanzas Familiares, Pixdemia SL, Personal..."
                  value={form.nombre}
                  onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-bold text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Alias o Email (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ej: julio@pixdemia.com"
                  value={form.email_o_alias}
                  onChange={(e) => setForm({ ...form, email_o_alias: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Icono Representativo
                </label>
                <div className="flex space-x-2">
                  {[
                    { id: 'Users', label: 'Familia', icon: Users },
                    { id: 'Building', label: 'Empresa', icon: Building },
                    { id: 'Briefcase', label: 'Negocio', icon: Briefcase },
                    { id: 'User', label: 'Personal', icon: User }
                  ].map(item => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setForm({ ...form, icono: item.id })}
                        className={`p-2 rounded-xl border flex items-center space-x-1 transition-all ${
                          form.icono === item.id 
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs' 
                            : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        <span className="text-[10px] font-bold">{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Color Identificativo
                </label>
                <div className="flex flex-wrap gap-1.5 items-center">
                  {PRESET_USER_COLORS.map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setForm({ ...form, color_hex: c })}
                      className={`w-6 h-6 rounded-full border-2 transition-transform ${form.color_hex === c ? 'scale-125 border-slate-900 dark:border-white shadow-md' : 'border-transparent hover:scale-110'}`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-md shadow-indigo-600/30 transition-all flex items-center space-x-1.5"
              >
                <Check className="w-4 h-4" />
                <span>{isEditing ? 'Guardar Cambios' : 'Crear Entorno de Gestión'}</span>
              </button>
            </div>
          </form>
        </div>

      </div>
    </div>
  );
}
