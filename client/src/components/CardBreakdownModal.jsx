import React, { useState, useEffect } from 'react';
import { 
  X, CreditCard, Calendar, Store, Tag, Landmark, 
  DollarSign, CheckCircle2, Search, ArrowDownRight, Layers 
} from 'lucide-react';
import { formatCurrency } from '../utils/formatters';
import { api } from '../services/api';

export default function CardBreakdownModal({ 
  isOpen, 
  onClose, 
  movimiento, 
  cuentas = [], 
  categorias = [] 
}) {
  const [loading, setLoading] = useState(false);
  const [tickets, setTickets] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [bankFilter, setBankFilter] = useState('');

  useEffect(() => {
    if (isOpen && movimiento) {
      loadCardTickets();
    }
  }, [isOpen, movimiento]);

  const loadCardTickets = async () => {
    try {
      setLoading(true);
      const dateStr = movimiento.fecha ? movimiento.fecha.substring(0, 7) : ''; // 'YYYY-MM'
      const year = dateStr.substring(0, 4) || '2026';
      const month = dateStr.substring(5, 7) || '';

      // Buscar cuenta de Tarjeta Kutxa
      const tarjetaCuenta = cuentas.find(c => c.tipo === 'tarjeta' || c.nombre.toLowerCase().includes('tarjeta'));
      const tarjetaId = tarjetaCuenta ? tarjetaCuenta.id : '';

      // Obtener movimientos de tarjeta
      const params = {
        year,
        ...(month ? { month: parseInt(month, 10) } : {}),
        ...(tarjetaId ? { cuenta_id: tarjetaId } : {})
      };

      const res = await api.getMovimientos(params);
      setTickets(res || []);
    } catch (err) {
      console.error('Error cargando tickets de tarjeta:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !movimiento) return null;

  const filteredTickets = tickets.filter(t => {
    // Si buscamos por texto
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const concepto = (t.concepto || '').toLowerCase();
      const subcat = (t.subcategoria || '').toLowerCase();
      const cat = (t.categoria_nombre || '').toLowerCase();
      if (!concepto.includes(q) && !subcat.includes(q) && !cat.includes(q)) return false;
    }

    // Si filtramos por banco imputado
    if (bankFilter) {
      const impId = t.cuenta_imputada_id || t.cuenta_id;
      if (String(impId) !== String(bankFilter)) return false;
    }

    return true;
  });

  const totalTickets = tickets.reduce((sum, t) => sum + Math.abs(t.importe || 0), 0);
  const cargoImporte = Math.abs(movimiento.importe || 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div 
        className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] animate-scaleUp"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera Modal */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-600 flex items-center justify-center text-white shadow-md shadow-teal-600/20">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-teal-600 dark:text-teal-400 flex items-center space-x-1">
                <span>Liquidación & Tickets de Tarjeta</span>
              </span>
              <h3 className="text-lg font-black text-slate-900 dark:text-white">
                Desglose: {movimiento.concepto || 'GASTOS TARJETA'}
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

        {/* Tarjetas de Resumen de la Liquidación */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 bg-teal-50/30 dark:bg-teal-950/10 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3 rounded-2xl bg-white dark:bg-slate-800/80 border border-teal-200 dark:border-teal-900/50 shadow-xs">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Cargo en Cuenta</span>
            <p className="text-lg font-black text-rose-600 dark:text-rose-400">
              {formatCurrency(-cargoImporte)}
            </p>
            <p className="text-[10px] text-slate-500 mt-0.5">
              Fecha: {movimiento.fecha ? movimiento.fecha.substring(0, 10) : '-'}
            </p>
          </div>

          <div className="p-3 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 shadow-xs">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Total Desglosado</span>
            <p className="text-lg font-black text-slate-900 dark:text-white">
              {formatCurrency(totalTickets)}
            </p>
            <p className="text-[10px] text-teal-600 dark:text-teal-400 font-bold mt-0.5">
              {tickets.length} compras / tickets registrados
            </p>
          </div>

          <div className="p-3 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 shadow-xs">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Entidad Pagadora</span>
            <p className="text-sm font-black text-slate-800 dark:text-slate-200 mt-1">
              {movimiento.cuenta_nombre || 'Kutxa'}
            </p>
            <p className="text-[10px] text-slate-400 mt-0.5">
              Tarjeta Kutxa Visa
            </p>
          </div>
        </div>

        {/* Barra de Filtros y Búsqueda */}
        <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-2.5">
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar comercio o ticket..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 border-none text-xs font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:outline-none"
            />
          </div>

          <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
            <select
              value={bankFilter}
              onChange={(e) => setBankFilter(e.target.value)}
              className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 border-none text-xs font-bold text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-teal-500 focus:outline-none cursor-pointer"
            >
              <option value="">Todos los bancos imputados</option>
              {cuentas.filter(c => c.tipo !== 'tarjeta').map(c => (
                <option key={c.id} value={c.id}>
                  Imputado a {c.nombre}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Listado de Compras / Tickets */}
        <div className="flex-1 overflow-y-auto p-5">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-3 border-teal-500 border-t-transparent"></div>
            </div>
          ) : filteredTickets.length > 0 ? (
            <div className="space-y-2">
              {filteredTickets.map(ticket => {
                const cuentaImputada = cuentas.find(c => c.id === ticket.cuenta_imputada_id);
                return (
                  <div 
                    key={ticket.id}
                    className="p-3 rounded-2xl border border-slate-100 dark:border-slate-800 hover:border-teal-200 dark:hover:border-teal-900/60 bg-white dark:bg-slate-900/60 transition-all flex items-center justify-between gap-3 shadow-2xs"
                  >
                    <div className="flex items-center space-x-3 min-w-0">
                      <div className="w-8 h-8 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 flex items-center justify-center shrink-0">
                        <Store className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center space-x-1.5">
                          <span className="font-bold text-xs text-slate-900 dark:text-white truncate">
                            {ticket.subcategoria || ticket.concepto}
                          </span>
                          {ticket.concepto && ticket.concepto !== ticket.subcategoria && (
                            <span className="text-[10px] text-slate-400 truncate">
                              • {ticket.concepto}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center space-x-2 text-[10px] text-slate-400 mt-0.5">
                          <span>{ticket.fecha ? ticket.fecha.substring(0, 10) : ''}</span>
                          <span>•</span>
                          <span className="text-slate-500 font-semibold">{ticket.categoria_nombre || 'Gasto'}</span>
                          {cuentaImputada && (
                            <>
                              <span>•</span>
                              <span className="px-1.5 py-0.2 rounded bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-bold">
                                Asignado a {cuentaImputada.nombre}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="font-black text-sm text-rose-600 dark:text-rose-400 font-mono">
                        {formatCurrency(ticket.importe)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12 text-slate-400 text-xs">
              <CreditCard className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p>No se han encontrado tickets individuales para este periodo.</p>
            </div>
          )}
        </div>

        {/* Pie de Modal */}
        <div className="px-6 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex items-center justify-between">
          <span className="text-xs text-slate-500 font-semibold">
            {filteredTickets.length} de {tickets.length} tickets visibles
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
