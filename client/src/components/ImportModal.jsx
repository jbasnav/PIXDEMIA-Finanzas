import React, { useState, useRef } from 'react';
import { X, UploadCloud, FileSpreadsheet, CheckCircle2, AlertCircle, RefreshCw, Download, FileText } from 'lucide-react';
import { api } from '../services/api';

export default function ImportModal({ isOpen, onClose, onImportSuccess }) {
  const [file, setFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.name.match(/\.(xlsx|xls|xlsm|csv)$/i)) {
        setFile(droppedFile);
        setError(null);
      } else {
        setError('Por favor selecciona un archivo válido (.xlsx, .xls, .csv)');
      }
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
      setError(null);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError('Debes seleccionar un archivo');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const res = await api.uploadExcel(file);
      setResult(res);
      onImportSuccess();
    } catch (err) {
      setError(err.message || 'Error al procesar el archivo');
    } finally {
      setLoading(false);
    }
  };

  const downloadSampleCsv = () => {
    const headers = ['Fecha', 'Cuenta', 'Categoria', 'Subcategoria', 'Concepto', 'Importe', 'Transferencia Interna', 'Cuenta Destino', 'Etiqueta Especial'];
    const sampleRows = [
      ['2026-01-05', 'Santander', 'Ingresos Trabajo', 'Nómina', 'Nómina Enero', '3200.00', 'NO', '', ''],
      ['2026-01-08', 'Santander', 'Alimentación', 'Eroski', 'Compra semanal supermercado', '-124.50', 'NO', '', ''],
      ['2026-01-10', 'Santander', 'Movimiento Interno', 'Traspaso a N26', 'Ahorro Imprevistos', '-1000.00', 'SI', 'N26', ''],
      ['2026-01-15', 'Kutxa', 'Obras y Reformas', 'Reonor', 'Materiales reforma local', '-450.00', 'NO', '', 'Obra Local'],
      ['2026-01-20', 'N26', 'Movilidad y Vehículos', 'Repsol', 'Gasolina viaje', '-65.00', 'NO', '', '']
    ];

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...sampleRows.map(e => e.map(val => `"${val}"`).join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'plantilla_importacion_movimientos.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleReset = () => {
    setFile(null);
    setResult(null);
    setError(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        
        {/* Cabecera */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
          <div className="flex items-center space-x-2">
            <FileSpreadsheet className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              Importar Movimientos (Excel / CSV)
            </h3>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {error && (
            <div className="flex items-center space-x-2 p-3 text-sm text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-xl">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {!result ? (
            <>
              <div className="flex items-start justify-between bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300">
                <div className="space-y-1">
                  <p className="font-semibold text-slate-900 dark:text-white">
                    Formatos compatibles:
                  </p>
                  <ul className="list-disc list-inside space-y-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                    <li>Libro <strong className="text-slate-700 dark:text-slate-200">00. Balance 2026 IA.xlsx</strong> (AÑO 2026 y GASTOS).</li>
                    <li>Extractos bancarios o listados tabulares en <strong className="text-slate-700 dark:text-slate-200">CSV</strong> o <strong className="text-slate-700 dark:text-slate-200">Excel</strong>.</li>
                  </ul>
                </div>
                <button
                  type="button"
                  onClick={downloadSampleCsv}
                  className="flex items-center space-x-1 px-2.5 py-1.5 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg border border-slate-200 dark:border-slate-600 font-semibold transition-colors flex-shrink-0"
                  title="Descargar archivo CSV de ejemplo"
                >
                  <Download className="w-3.5 h-3.5 text-brand-600" />
                  <span>Plantilla CSV</span>
                </button>
              </div>

              {/* Zona Drag & Drop */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-2xl cursor-pointer transition-all ${
                  isDragging
                    ? 'border-brand-500 bg-brand-50/50 dark:bg-brand-950/20'
                    : file
                    ? 'border-emerald-500 bg-emerald-50/30 dark:bg-emerald-950/20'
                    : 'border-slate-300 dark:border-slate-700 hover:border-brand-400 dark:hover:border-brand-500 bg-slate-50/50 dark:bg-slate-800/30'
                }`}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".xlsx, .xls, .xlsm, .csv"
                  className="hidden"
                />

                <div className="p-4 rounded-2xl bg-brand-500/10 text-brand-600 dark:text-brand-400 mb-3">
                  <UploadCloud className="w-8 h-8" />
                </div>

                {file ? (
                  <div className="text-center">
                    <p className="text-sm font-bold text-slate-900 dark:text-white truncate max-w-xs">
                      {file.name}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      {(file.size / 1024).toFixed(1)} KB — Clic para cambiar de archivo
                    </p>
                  </div>
                ) : (
                  <div className="text-center">
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                      Arrastra y suelta tu archivo Excel o CSV aquí
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      o haz clic para explorar tus carpetas locales
                    </p>
                  </div>
                )}
              </div>

              {/* Botón de Procesar */}
              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleUpload}
                  disabled={!file || loading}
                  className="flex items-center space-x-2 px-5 py-2 text-sm font-semibold text-white bg-brand-600 hover:bg-brand-500 rounded-xl shadow-md shadow-brand-600/20 disabled:opacity-50 transition-all"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Importando movimientos...</span>
                    </>
                  ) : (
                    <>
                      <FileSpreadsheet className="w-4 h-4" />
                      <span>Iniciar Importación</span>
                    </>
                  )}
                </button>
              </div>
            </>
          ) : (
            /* Resultados de la Importación */
            <div className="space-y-4">
              <div className="flex items-center space-x-3 p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl text-emerald-800 dark:text-emerald-200">
                <CheckCircle2 className="w-6 h-6 flex-shrink-0 text-emerald-600 dark:text-emerald-400" />
                <div>
                  <h4 className="font-bold text-sm">¡Movimientos importados con éxito!</h4>
                  <p className="text-xs text-emerald-700 dark:text-emerald-300">
                    Se han procesado y guardado en la base de datos local SQLite.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
                  <p className="text-xs text-slate-500">Movimientos Nuevos</p>
                  <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                    +{result.movimientosImportados}
                  </p>
                </div>

                <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
                  <p className="text-xs text-slate-500">Duplicados Omitidos</p>
                  <p className="text-lg font-bold text-slate-700 dark:text-slate-300 mt-0.5">
                    {result.movimientosDuplicadosIgnorados}
                  </p>
                </div>

                {result.saldosActualizados > 0 && (
                  <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 col-span-2">
                    <p className="text-xs text-slate-500">Saldos de Apertura de Cuentas</p>
                    <p className="text-base font-semibold text-slate-700 dark:text-slate-300 mt-0.5">
                      {result.saldosActualizados} saldos actualizados
                    </p>
                  </div>
                )}
              </div>

              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={handleReset}
                  className="px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
                >
                  Importar otro archivo
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2 text-sm font-semibold text-white bg-brand-600 hover:bg-brand-500 rounded-xl shadow-md transition-all"
                >
                  Ver Movimientos
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
