import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Filter, 
  Download, 
  Upload,
  FileSpreadsheet,
  Trash2, 
  ArrowRightLeft, 
  ArrowDownRight, 
  ArrowUpRight, 
  Tag, 
  Calendar, 
  ChevronLeft, 
  ChevronRight,
  Plus,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Edit2,
  CheckCircle2,
  Clock,
  CreditCard
} from 'lucide-react';
import { formatCurrency, formatDate, MONTHS } from '../utils/formatters';
import { api } from '../services/api';
import EditTransactionModal from '../components/EditTransactionModal';
import CardBreakdownModal from '../components/CardBreakdownModal';

export default function TransactionsView({ onOpenQuickAdd, onOpenImport, refreshTrigger }) {
  const [movimientos, setMovimientos] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // Estados de Edición y Desglose de Tarjetas
  const [editingMovimiento, setEditingMovimiento] = useState(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedCardMov, setSelectedCardMov] = useState(null);

  // Filtros
  const [busqueda, setBusqueda] = useState('');
  const [cuentaId, setCuentaId] = useState('');
  const [categoriaId, setCategoriaId] = useState('');
  const [mes, setMes] = useState('');
  const [etiqueta, setEtiqueta] = useState('');
  const [esTransferencia, setEsTransferencia] = useState('');
  const [esConsolidadoFilter, setEsConsolidadoFilter] = useState(''); // '' = todos, '1' = consolidado, '0' = simulado/previsto
  const [page, setPage] = useState(0);
  const limit = 30;

  // Ordenación
  const [sortField, setSortField] = useState('fecha');
  const [sortDirection, setSortDirection] = useState('desc');

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection(field === 'fecha' || field === 'importe' ? 'desc' : 'asc');
    }
    setPage(0);
  };

  const renderSortIcon = (field) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-3 h-3 ml-1 opacity-25 group-hover:opacity-60 transition-opacity inline" />;
    }
    return sortDirection === 'asc' ? (
      <ArrowUp className="w-3 h-3 ml-1 text-brand-600 dark:text-brand-400 inline" />
    ) : (
      <ArrowDown className="w-3 h-3 ml-1 text-brand-600 dark:text-brand-400 inline" />
    );
  };

  // Catálogos
  const [cuentas, setCuentas] = useState([]);
  const [categorias, setCategorias] = useState([]);

  const loadCatalogs = async () => {
    try {
      const [cRes, catRes] = await Promise.all([
        api.getCuentas(),
        api.getCategorias()
      ]);
      setCuentas(cRes);
      setCategorias(catRes);
    } catch (err) {
      console.error(err);
    }
  };

  const loadTransactions = async () => {
    try {
      setLoading(true);
      const res = await api.getMovimientos({
        busqueda,
        cuenta_id: cuentaId,
        categoria_id: categoriaId,
        mes,
        etiqueta_especial: etiqueta,
        es_transferencia: esTransferencia !== '' ? esTransferencia : undefined,
        es_consolidado: esConsolidadoFilter !== '' ? esConsolidadoFilter : undefined,
        sort_by: sortField,
        order: sortDirection,
        limit,
        offset: page * limit
      });
      setMovimientos(res.data);
      setTotalCount(res.total);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCatalogs();
  }, []);

  useEffect(() => {
    loadTransactions();
  }, [busqueda, cuentaId, categoriaId, mes, etiqueta, esTransferencia, esConsolidadoFilter, sortField, sortDirection, page, refreshTrigger]);

  const handleEdit = (m) => {
    setEditingMovimiento(m);
    setIsEditOpen(true);
  };

  const handleToggleConsolidado = async (m, e) => {
    if (e) e.stopPropagation();
    try {
      await api.toggleConsolidado(m.id);
      loadTransactions();
    } catch (err) {
      console.error('Error toggling consolidado:', err);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('¿Estás seguro de que deseas eliminar este movimiento?')) {
      try {
        await api.deleteMovimiento(id);
        loadTransactions();
      } catch (err) {
        alert('Error al eliminar movimiento: ' + err.message);
      }
    }
  };

  const exportToCsv = () => {
    if (movimientos.length === 0) return;
    const headers = ['ID', 'Fecha', 'Cuenta', 'Categoría', 'Subcategoría/Tienda', 'Concepto', 'Importe', 'Transferencia Interna', 'Cuenta Destino', 'Etiqueta Especial'];
    const rows = movimientos.map(m => [
      m.id,
      m.fecha,
      `"${m.cuenta_nombre || ''}"`,
      `"${m.categoria_nombre || ''}"`,
      `"${m.subcategoria || ''}"`,
      `"${m.concepto || ''}"`,
      m.importe,
      m.es_transferencia_interna ? 'SI' : 'NO',
      `"${m.cuenta_destino_nombre || ''}"`,
      `"${m.etiqueta_especial || ''}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `movimientos_finanzas_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const totalPages = Math.ceil(totalCount / limit);
  const sortedMovimientos = movimientos;

  return (
    <div className="space-y-6 pb-12">
      
      {/* Barra de Búsqueda y Filtros */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por concepto, tienda o notas..."
              value={busqueda}
              onChange={(e) => { setBusqueda(e.target.value); setPage(0); }}
              className="w-full pl-9 pr-3.5 py-2 text-sm rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:outline-none"
            />
          </div>

          <div className="flex items-center space-x-2 w-full sm:w-auto justify-end flex-wrap gap-y-2">
            
            {/* Botón Importar CSV / Excel */}
            <button
              onClick={onOpenImport}
              className="flex items-center space-x-1.5 px-3.5 py-2 text-xs sm:text-sm font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 rounded-xl transition-colors border border-emerald-200 dark:border-emerald-800/60 shadow-sm"
              title="Importar archivo CSV o Excel de movimientos"
            >
              <Upload className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Importar CSV / Excel</span>
            </button>

            {/* Botón Exportar CSV */}
            <button
              onClick={exportToCsv}
              className="flex items-center space-x-1.5 px-3 py-2 text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors border border-slate-200 dark:border-slate-700"
              title="Descargar datos en CSV"
            >
              <Download className="w-4 h-4" />
              <span>Exportar CSV</span>
            </button>

            {/* Botón Nuevo Movimiento */}
            <button
              onClick={onOpenQuickAdd}
              className="flex items-center space-x-1.5 px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-brand-600 hover:bg-brand-500 rounded-xl shadow-md shadow-brand-600/20 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>+ Nuevo</span>
            </button>
          </div>
        </div>

        {/* Filtros desplegables */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
          
          {/* Cuenta */}
          <select
            value={cuentaId}
            onChange={(e) => { setCuentaId(e.target.value); setPage(0); }}
            className="px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-medium focus:outline-none"
          >
            <option value="">Todas las Cuentas</option>
            {cuentas.map(c => (
              <option key={c.id} value={c.id}>{c.nombre}</option>
            ))}
          </select>

          {/* Categoría */}
          <select
            value={categoriaId}
            onChange={(e) => { setCategoriaId(e.target.value); setPage(0); }}
            className="px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-medium focus:outline-none"
          >
            <option value="">Todas las Categorías</option>
            {categorias.map(c => (
              <option key={c.id} value={c.id}>{c.nombre}</option>
            ))}
          </select>

          {/* Mes */}
          <select
            value={mes}
            onChange={(e) => { setMes(e.target.value); setPage(0); }}
            className="px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-medium focus:outline-none"
          >
            <option value="">Todos los Meses</option>
            {MONTHS.map(m => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>

          {/* Estado de Consolidación (Real vs Previsto) */}
          <select
            value={esConsolidadoFilter}
            onChange={(e) => { setEsConsolidadoFilter(e.target.value); setPage(0); }}
            className="px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold focus:outline-none"
          >
            <option value="">Todos los Estados</option>
            <option value="1">✓ Solo Consolidados (Reales)</option>
            <option value="0">⏳ Solo Sin Consolidar (Simulaciones)</option>
          </select>

          {/* Tipo / Transferencia */}
          <select
            value={esTransferencia}
            onChange={(e) => { setEsTransferencia(e.target.value); setPage(0); }}
            className="px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-medium focus:outline-none"
          >
            <option value="">Todos los Tipos</option>
            <option value="0">Flujo Externo (Ingresos/Gastos)</option>
            <option value="1">Traspasos Internos</option>
          </select>

          {/* Proyectos Especiales */}
          <select
            value={etiqueta}
            onChange={(e) => { setEtiqueta(e.target.value); setPage(0); }}
            className="px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-medium focus:outline-none col-span-2 sm:col-span-1"
          >
            <option value="">Todos los Proyectos</option>
            <option value="Obra Local">Obra Local / Riff</option>
            <option value="Viaje Londres">Viaje Londres</option>
            <option value="Furgoneta">Furgoneta</option>
          </select>

        </div>
      </div>

      {/* Tabla de Movimientos - ZERO HORIZONTAL SCROLLBAR */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden w-full">
        <div className="w-full overflow-x-hidden">
          <table className="w-full table-fixed text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/60 text-[10px] xl:text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200 dark:border-slate-800 select-none">
                <th 
                  onClick={() => handleSort('fecha')}
                  className="w-[8%] py-2.5 px-2 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors group"
                  title="Ordenar por Fecha"
                >
                  <div className="flex items-center space-x-0.5">
                    <span>Fecha</span>
                    {renderSortIcon('fecha')}
                  </div>
                </th>
                <th 
                  onClick={() => handleSort('estado')}
                  className="w-[8%] py-2.5 px-1 text-center cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors select-none group"
                  title="Ordenar por Estado (Real / Previsto)"
                >
                  <div className="flex items-center justify-center space-x-0.5">
                    <span>Estado</span>
                    {renderSortIcon('estado')}
                  </div>
                </th>
                <th 
                  onClick={() => handleSort('cuenta')}
                  className="w-[11%] py-2.5 px-1.5 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors group"
                  title="Ordenar por Cuenta"
                >
                  <div className="flex items-center space-x-0.5">
                    <span>Cuenta</span>
                    {renderSortIcon('cuenta')}
                  </div>
                </th>
                <th 
                  onClick={() => handleSort('concepto')}
                  className="w-[22%] py-2.5 px-2 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors group"
                  title="Ordenar por Concepto / Tienda"
                >
                  <div className="flex items-center space-x-0.5">
                    <span>Concepto / Tienda</span>
                    {renderSortIcon('concepto')}
                  </div>
                </th>
                <th 
                  onClick={() => handleSort('categoria')}
                  className="w-[12%] py-2.5 px-1.5 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors group"
                  title="Ordenar por Categoría"
                >
                  <div className="flex items-center space-x-0.5">
                    <span>Categoría</span>
                    {renderSortIcon('categoria')}
                  </div>
                </th>
                <th 
                  onClick={() => handleSort('proyecto')}
                  className="w-[8%] py-2.5 px-1 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors group"
                  title="Ordenar por Proyecto"
                >
                  <div className="flex items-center space-x-0.5">
                    <span>Proyecto</span>
                    {renderSortIcon('proyecto')}
                  </div>
                </th>
                <th 
                  onClick={() => handleSort('importe')}
                  className="w-[10%] py-2.5 px-1.5 text-right cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors group"
                  title="Ordenar por Importe"
                >
                  <div className="flex items-center justify-end space-x-0.5">
                    <span>Importe</span>
                    {renderSortIcon('importe')}
                  </div>
                </th>
                <th className="w-[10%] py-2.5 px-1.5 text-right" title="Saldo restante en esta cuenta tras el movimiento">Saldo Cta</th>
                <th className="w-[8%] py-2.5 px-1.5 text-right bg-indigo-50/50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300" title="Saldo global acumulado líquido">Saldo Global</th>
                <th className="w-[3%] py-2.5 px-1 text-center"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-[11px]">
              {loading ? (
                <tr>
                  <td colSpan="10" className="text-center py-10 text-slate-400">
                    <div className="animate-spin rounded-full h-8 w-8 border-2 border-brand-500 border-t-transparent mx-auto mb-2" />
                    Cargando movimientos...
                  </td>
                </tr>
              ) : sortedMovimientos.length === 0 ? (
                <tr>
                  <td colSpan="10" className="text-center py-12 text-slate-400">
                    No se encontraron movimientos con los filtros aplicados.
                  </td>
                </tr>
              ) : (
                sortedMovimientos.map(m => {
                  const isTransfer = m.es_transferencia_interna === 1;
                  const isIncome = m.importe > 0 && !isTransfer;
                  const isExpense = m.importe < 0 && !isTransfer;
                  const isConsolidado = m.es_consolidado === 1;

                  return (
                    <tr key={m.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                      {/* Fecha */}
                      <td className="py-2.5 px-2 whitespace-nowrap text-slate-600 dark:text-slate-300 font-mono text-[10px]">
                        {formatDate(m.fecha)}
                      </td>

                      {/* Estado: Consolidado vs Previsto */}
                      <td className="py-2.5 px-1 whitespace-nowrap text-center">
                        <button
                          onClick={(e) => handleToggleConsolidado(m, e)}
                          title={isConsolidado ? 'Movimiento Real/Consolidado. Clic para marcar como previsto' : 'Simulación / Previsto. Clic para consolidar'}
                          className={`inline-flex items-center space-x-1 px-1.5 py-0.5 rounded-full text-[9px] font-black border transition-all cursor-pointer ${
                            isConsolidado
                              ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/80 hover:bg-emerald-100'
                              : 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-700/80 border-dashed hover:bg-amber-100'
                          }`}
                        >
                          {isConsolidado ? (
                            <>
                              <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600 dark:text-emerald-400" />
                              <span>Real</span>
                            </>
                          ) : (
                            <>
                              <Clock className="w-2.5 h-2.5 text-amber-600 dark:text-amber-400" />
                              <span>Prev</span>
                            </>
                          )}
                        </button>
                      </td>

                      {/* Cuenta Origen / Destino */}
                      <td className="py-2.5 px-1.5 whitespace-nowrap truncate">
                        <div className="flex items-center space-x-1 truncate">
                          <span 
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ backgroundColor: m.cuenta_color || '#3b82f6' }}
                          />
                          <span className="font-semibold text-slate-900 dark:text-white truncate">
                            {m.cuenta_nombre}
                          </span>
                          {isTransfer && m.cuenta_destino_nombre && (
                            <span className="text-[10px] text-blue-600 dark:text-blue-400 font-bold truncate">
                              ➔ {m.cuenta_destino_nombre}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Concepto & Subcategoría/Tienda */}
                      <td className="py-2.5 px-2 truncate">
                        <div className="flex items-center space-x-1.5 flex-wrap gap-y-1">
                          <span className="font-bold text-slate-900 dark:text-white truncate" title={m.concepto}>
                            {m.concepto}
                          </span>
                          {(m.concepto?.toUpperCase().includes('GASTOS TARJETA') || m.subcategoria?.toUpperCase().includes('GASTOS TARJETA')) && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedCardMov(m);
                              }}
                              className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[9px] font-black bg-teal-50 hover:bg-teal-100 dark:bg-teal-950/60 dark:hover:bg-teal-900/80 text-teal-700 dark:text-teal-300 border border-teal-300 dark:border-teal-700 transition-all cursor-pointer shadow-2xs"
                              title="Ver tickets y compras desglosadas de esta liquidación de tarjeta"
                            >
                              <CreditCard className="w-2.5 h-2.5 text-teal-600 dark:text-teal-400" />
                              <span>Ver Tickets</span>
                            </button>
                          )}
                        </div>
                        {m.subcategoria && m.subcategoria !== m.concepto && (
                          <div className="text-[10px] text-slate-400 truncate" title={m.subcategoria}>
                            {m.subcategoria}
                          </div>
                        )}
                      </td>

                      {/* Categoría */}
                      <td className="py-2.5 px-1.5 whitespace-nowrap truncate">
                        <span 
                          className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-semibold truncate max-w-full"
                          style={{
                            backgroundColor: `${m.categoria_color || '#64748b'}15`,
                            color: m.categoria_color || '#64748b'
                          }}
                          title={m.categoria_nombre}
                        >
                          {m.categoria_nombre}
                        </span>
                      </td>

                      {/* Etiqueta Especial / Proyecto */}
                      <td className="py-2.5 px-1 whitespace-nowrap truncate">
                        {m.etiqueta_especial ? (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[9px] font-bold bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 truncate" title={m.etiqueta_especial}>
                            {m.etiqueta_especial}
                          </span>
                        ) : (
                          <span className="text-slate-300 dark:text-slate-600">-</span>
                        )}
                      </td>

                      {/* Importe */}
                      <td className="py-2.5 px-1.5 whitespace-nowrap text-right font-mono font-black text-[11px]">
                        {isTransfer ? (
                          <span className="text-blue-600 dark:text-blue-400 flex items-center justify-end">
                            <ArrowRightLeft className="w-3 h-3 mr-0.5 shrink-0" />
                            {formatCurrency(Math.abs(m.importe))}
                          </span>
                        ) : isIncome ? (
                          <span className="text-emerald-600 dark:text-emerald-400">
                            +{formatCurrency(m.importe)}
                          </span>
                        ) : (
                          <span className="text-rose-600 dark:text-rose-400">
                            {formatCurrency(m.importe)}
                          </span>
                        )}
                      </td>

                      {/* Saldo en Cuenta particular */}
                      <td className="py-2.5 px-1.5 whitespace-nowrap text-right font-mono font-bold text-slate-700 dark:text-slate-300 text-[10px]">
                        {m.saldo_cuenta !== undefined ? formatCurrency(m.saldo_cuenta) : '-'}
                      </td>

                      {/* Saldo Global acumulado */}
                      <td className="py-2.5 px-1.5 whitespace-nowrap text-right font-mono font-black text-indigo-700 dark:text-indigo-300 bg-indigo-50/40 dark:bg-indigo-950/20 text-[10px]">
                        {m.saldo_global !== undefined ? formatCurrency(m.saldo_global) : '-'}
                      </td>

                      {/* Acciones */}
                      <td className="py-2.5 px-1 whitespace-nowrap text-center">
                        <div className="flex items-center justify-center space-x-1">
                          <button
                            onClick={() => handleEdit(m)}
                            className="p-1 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition-colors cursor-pointer"
                            title="Editar movimiento"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(m.id)}
                            className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                            title="Eliminar movimiento"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Paginación */}
        <div className="flex items-center justify-between px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-500">
          <div>
            Mostrando <strong>{movimientos.length}</strong> de <strong>{totalCount}</strong> movimientos
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              Página {page + 1} de {totalPages || 1}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Modal de Edición de Movimiento */}
      <EditTransactionModal
        isOpen={isEditOpen}
        onClose={() => { setIsEditOpen(false); setEditingMovimiento(null); }}
        movimiento={editingMovimiento}
        onTransactionUpdated={() => loadTransactions()}
        onTransactionDeleted={() => loadTransactions()}
        cuentas={cuentas}
        categorias={categorias}
      />

      {/* Modal de Desglose de Tickets de Tarjeta */}
      <CardBreakdownModal
        isOpen={Boolean(selectedCardMov)}
        onClose={() => setSelectedCardMov(null)}
        movimiento={selectedCardMov}
        cuentas={cuentas}
        categorias={categorias}
      />

    </div>
  );
}
