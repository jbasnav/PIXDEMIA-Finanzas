import React, { useState, useEffect } from 'react';
import { 
  X, 
  Download, 
  Upload, 
  Database, 
  ShieldCheck, 
  AlertTriangle, 
  RefreshCw, 
  CheckCircle2, 
  FileJson, 
  HardDrive, 
  Clock, 
  Layers, 
  Save 
} from 'lucide-react';
import { api } from '../services/api';
import { useToast } from '../context/ToastContext';

export default function BackupManagerModal({ isOpen, onClose, onDataRestored }) {
  const { toast, confirmDialog } = useToast();
  const [activeTab, setActiveTab] = useState('export'); // 'export', 'restore', 'snapshots'
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Estados de restauración
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewData, setPreviewData] = useState(null);

  // Estados de instantáneas
  const [snapshots, setSnapshots] = useState([]);

  useEffect(() => {
    if (isOpen) {
      setSuccessMsg('');
      setErrorMsg('');
      setSelectedFile(null);
      setPreviewData(null);
      loadSnapshots();
    }
  }, [isOpen]);

  const loadSnapshots = async () => {
    try {
      const list = await api.getBackupSnapshots();
      setSnapshots(list || []);
    } catch (err) {
      console.warn('Error loading snapshots:', err);
    }
  };

  if (!isOpen) return null;

  // 1. Descargar Backup JSON
  const handleDownloadJSON = async () => {
    try {
      setLoading(true);
      setErrorMsg('');
      setSuccessMsg('');

      const backup = await api.exportBackup();
      const dateStr = new Date().toISOString().split('T')[0];
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = Backup_Finanzas_.json;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setSuccessMsg('¡Copia de seguridad descargada con éxito!');
      loadSnapshots();
    } catch (err) {
      setErrorMsg(err.message || 'Error exportando backup');
    } finally {
      setLoading(false);
    }
  };

  // 2. Descargar Archivo SQLite .db
  const handleDownloadDB = () => {
    const a = document.createElement('a');
    a.href = '/api/backup/download-db';
    a.download = Finanzas_SQLite_.db;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setSuccessMsg('Descargando archivo físico SQLite...');
  };

  // 3. Crear instantánea manual en servidor
  const handleCreateSnapshot = async () => {
    try {
      setLoading(true);
      setErrorMsg('');
      setSuccessMsg('');
      const res = await api.createBackupSnapshot();
      setSuccessMsg(res.message || '¡Instantánea creada en el servidor!');
      await loadSnapshots();
    } catch (err) {
      setErrorMsg(err.message || 'Error creando instantánea');
    } finally {
      setLoading(false);
    }
  };

  // 4. Procesar archivo seleccionado para restauración
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setErrorMsg('');
    setSuccessMsg('');
    setSelectedFile(file);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target.result);
        if (!json.data && !json.movimientos && !json.cuentas) {
          throw new Error('El archivo no parece una copia de seguridad válida de Finanzas Personales');
        }
        setPreviewData(json);
      } catch (err) {
        setErrorMsg('Error al leer el archivo JSON: ' + err.message);
        setPreviewData(null);
      }
    };
    reader.readAsText(file);
  };

  // 5. Ejecutar Restauración
  const handleRestoreSubmit = async () => {
    if (!previewData) return;

    const ok = await confirmDialog({
      title: 'Restaurar Copia de Seguridad',
      message: '⚠️ ATENCIÓN: Esta acción reemplazará los datos actuales con los datos del archivo seleccionado. Se creará automáticamente un punto de restauración previo en el servidor. ¿Deseas continuar?',
      confirmText: 'Sí, Restaurar Base de Datos',
      type: 'danger'
    });
    if (!ok) return;

    try {
      setLoading(true);
      setErrorMsg('');
      setSuccessMsg('');

      const res = await api.restoreBackup(previewData);
      setSuccessMsg(res.message || '¡Base de datos restaurada con éxito!');
      toast.success(res.message || 'Base de datos restaurada con éxito', 'Restauración');
      if (onDataRestored) {
        onDataRestored();
      }
      setTimeout(() => {
        window.location.reload();
      }, 1200);
    } catch (err) {
      setErrorMsg(err.message || 'Error restaurando la copia de seguridad');
      toast.error(err.message || 'Error restaurando copia', 'Error');
    } finally {
      setLoading(false);
    }
  };

  // 6. Restaurar desde instantánea del servidor
  const handleRestoreSnapshot = async (filename) => {
    const ok = await confirmDialog({
      title: 'Restaurar Instantánea Local',
      message: `¿Deseas restaurar la instantánea "${filename}"? Reemplazará los datos actuales con los de esta copia.`,
      confirmText: 'Sí, Restaurar',
      type: 'danger'
    });
    if (!ok) return;

    try {
      setLoading(true);
      setErrorMsg('');
      setSuccessMsg('');

      const res = await api.restoreBackupSnapshot(filename);
      setSuccessMsg(res.message || '¡Instantánea restaurada con éxito!');
      toast.success(res.message || 'Instantánea restaurada con éxito', 'Restauración');
      if (onDataRestored) {
        onDataRestored();
      }
      setTimeout(() => {
        window.location.reload();
      }, 1200);
    } catch (err) {
      setErrorMsg(err.message || 'Error restaurando instantánea');
      toast.error(err.message || 'Error restaurando instantánea', 'Error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div 
        className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] animate-scaleUp"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-600/20">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                Seguridad & Datos
              </span>
              <h3 className="text-lg font-black text-slate-900 dark:text-white">
                Copias de Seguridad (Backup) & Restauración
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Pestañas del Modal */}
        <div className="flex border-b border-slate-100 dark:border-slate-800 px-6 bg-slate-50/30 dark:bg-slate-800/20">
          <button
            onClick={() => setActiveTab('export')}
            className={`flex items-center space-x-2 py-3 px-4 text-xs font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'export'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            <span>Crear / Descargar Copia</span>
          </button>

          <button
            onClick={() => setActiveTab('restore')}
            className={`flex items-center space-x-2 py-3 px-4 text-xs font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'restore'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Restaurar Copia</span>
          </button>

          <button
            onClick={() => setActiveTab('snapshots')}
            className={`flex items-center space-x-2 py-3 px-4 text-xs font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'snapshots'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Instantáneas del Servidor ({snapshots.length})</span>
          </button>
        </div>

        {/* Contenido Principal */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {/* Alertas de Éxito / Error */}
          {successMsg && (
            <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs font-bold flex items-center space-x-2 animate-fadeIn">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {errorMsg && (
            <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs font-bold flex items-center space-x-2 animate-fadeIn">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* TAB 1: EXPORTAR */}
          {activeTab === 'export' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80 space-y-2">
                <div className="flex items-center space-x-2 text-slate-900 dark:text-white font-bold text-sm">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Copia de Seguridad Integral</span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Exporta en un solo archivo todos los movimientos, cuentas bancarias, pasivos e hipotecas, presupuestos, suscripciones y categorías para guardarlos en tu ordenador.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                {/* Opción JSON */}
                <div className="p-4 rounded-2xl border border-indigo-200 dark:border-indigo-900/60 bg-indigo-50/40 dark:bg-indigo-950/20 flex flex-col justify-between space-y-3">
                  <div>
                    <div className="flex items-center space-x-2">
                      <FileJson className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                      <span className="font-extrabold text-xs text-slate-900 dark:text-white">Backup JSON Completo</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Formato universal de texto estructurado. Permite restaurar todos tus datos en cualquier momento con 1 clic.
                    </p>
                  </div>
                  <button
                    onClick={handleDownloadJSON}
                    disabled={loading}
                    className="w-full py-2.5 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/20 flex items-center justify-center space-x-1.5 transition-all cursor-pointer disabled:opacity-50"
                  >
                    <Download className="w-4 h-4" />
                    <span>{loading ? 'Generando...' : 'Descargar Backup (.json)'}</span>
                  </button>
                </div>

                {/* Opción SQLite DB */}
                <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40 flex flex-col justify-between space-y-3">
                  <div>
                    <div className="flex items-center space-x-2">
                      <HardDrive className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                      <span className="font-extrabold text-xs text-slate-900 dark:text-white">Archivo SQLite (.db)</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Copia binaria directa de la base de datos local <code className="text-[10px]">finanzas.db</code>.
                    </p>
                  </div>
                  <button
                    onClick={handleDownloadDB}
                    className="w-full py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 text-white text-xs font-bold flex items-center justify-center space-x-1.5 transition-all cursor-pointer"
                  >
                    <HardDrive className="w-4 h-4" />
                    <span>Descargar finanzas.db</span>
                  </button>
                </div>
              </div>

              <div className="pt-2">
                <button
                  onClick={handleCreateSnapshot}
                  disabled={loading}
                  className="w-full py-2.5 px-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold flex items-center justify-center space-x-2 transition-all cursor-pointer"
                >
                  <Save className="w-4 h-4 text-indigo-500" />
                  <span>Crear Punto de Restauración / Instantánea en el Servidor</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: RESTAURAR */}
          {activeTab === 'restore' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 space-y-1.5">
                <div className="flex items-center space-x-2 text-amber-800 dark:text-amber-300 font-bold text-xs">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Restauración de Datos</span>
                </div>
                <p className="text-[11px] text-amber-700 dark:text-amber-400">
                  Al restaurar una copia, los registros actuales se reemplazarán por los del archivo de backup. El sistema creará una instantánea de seguridad automática antes de aplicar los cambios.
                </p>
              </div>

              {/* Selector de Archivo */}
              <div className="border-2 border-dashed border-slate-200 dark:border-slate-700 hover:border-indigo-500 dark:hover:border-indigo-500 rounded-2xl p-6 text-center transition-all bg-slate-50/50 dark:bg-slate-800/30">
                <FileJson className="w-8 h-8 mx-auto text-indigo-500 mb-2" />
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1 cursor-pointer">
                  <span>Seleccionar archivo de copia de seguridad (.json)</span>
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
                <p className="text-[10px] text-slate-400">
                  {selectedFile ? `Archivo seleccionado: ${selectedFile.name}` : 'Haz clic para explorar tus carpetas'}
                </p>
              </div>

              {/* Vista Previa del Backup */}
              {previewData && (
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3 animate-fadeIn">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 dark:text-white">
                      Resumen del contenido a restaurar:
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">
                      {previewData.exported_at ? new Date(previewData.exported_at).toLocaleString('es-ES') : 'Copia'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center">
                      <span className="text-[10px] text-slate-400 uppercase block font-bold">Movimientos</span>
                      <span className="text-sm font-black text-indigo-600 dark:text-indigo-400">
                        {previewData.summary?.movimientos ?? (previewData.data?.movimientos?.length || 0)}
                      </span>
                    </div>

                    <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center">
                      <span className="text-[10px] text-slate-400 uppercase block font-bold">Cuentas</span>
                      <span className="text-sm font-black text-slate-800 dark:text-slate-200">
                        {previewData.summary?.cuentas ?? (previewData.data?.cuentas?.length || 0)}
                      </span>
                    </div>

                    <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center">
                      <span className="text-[10px] text-slate-400 uppercase block font-bold">Pasivos</span>
                      <span className="text-sm font-black text-slate-800 dark:text-slate-200">
                        {previewData.summary?.pasivos ?? (previewData.data?.pasivos?.length || 0)}
                      </span>
                    </div>

                    <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center">
                      <span className="text-[10px] text-slate-400 uppercase block font-bold">Categorías</span>
                      <span className="text-sm font-black text-slate-800 dark:text-slate-200">
                        {previewData.summary?.categorias ?? (previewData.data?.categorias?.length || 0)}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={handleRestoreSubmit}
                    disabled={loading}
                    className="w-full py-3 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-black shadow-lg shadow-rose-600/20 flex items-center justify-center space-x-2 transition-all cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    <span>{loading ? 'Restaurando Base de Datos...' : 'Confirmar y Restaurar Datos Ahora'}</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: INSTANTÁNEAS LOCALES */}
          {activeTab === 'snapshots' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                  Copias automáticas guardadas en el servidor ({snapshots.length})
                </span>
                <button
                  onClick={loadSnapshots}
                  className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center space-x-1 cursor-pointer"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Actualizar lista</span>
                </button>
              </div>

              {snapshots.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-xs">
                  No hay instantáneas guardadas todavía. Crea una en la primera pestaña.
                </div>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {snapshots.map((snap) => (
                    <div 
                      key={snap.filename} 
                      className="p-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="min-w-0">
                        <p className="font-bold text-slate-900 dark:text-white truncate">
                          {snap.filename}
                        </p>
                        <p className="text-[10px] text-slate-400">
                          {new Date(snap.created_at).toLocaleString('es-ES')} • {(snap.size / 1024).toFixed(1)} KB
                        </p>
                      </div>

                      <button
                        onClick={() => handleRestoreSnapshot(snap.filename)}
                        disabled={loading}
                        className="px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/80 text-indigo-700 dark:text-indigo-300 font-bold text-[11px] border border-indigo-200 dark:border-indigo-800 transition-colors shrink-0 cursor-pointer disabled:opacity-50"
                      >
                        Restaurar
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Pie de Modal */}
        <div className="px-6 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex items-center justify-between">
          <span className="text-[11px] text-slate-400">
            Los datos se almacenan de forma privada y local en tu máquina.
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 rounded-xl transition-colors cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
