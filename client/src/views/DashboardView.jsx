import React, { useState, useEffect } from 'react';
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  PiggyBank, 
  Landmark, 
  Layers, 
  Calendar,
  ShieldCheck,
  AlertCircle,
  Search,
  ArrowUpRight,
  ArrowDownLeft,
  Filter,
  CheckCircle2,
  MousePointerClick,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Tag,
  X,
  Edit2,
  Trash2,
  Clock,
  CreditCard
} from 'lucide-react';
import { 
  ComposedChart,
  BarChart, 
  Bar, 
  Line,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Legend, 
  PieChart, 
  Pie, 
  Cell 
} from 'recharts';
import KpiCard from '../components/KpiCard';
import BudgetAlerts from '../components/BudgetAlerts';
import EditTransactionModal from '../components/EditTransactionModal';
import CardBreakdownModal from '../components/CardBreakdownModal';
import AnnualTreasuryMatrix from '../components/AnnualTreasuryMatrix';
import { formatCurrency, formatPercent, MONTHS, getMonthName } from '../utils/formatters';
import { api } from '../services/api';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316', '#14b8a6', '#64748b'];

const MONTH_NAMES_FULL = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

export default function DashboardView({ onOpenQuickAdd, onOpenImport, onOpenAccountsManager }) {
  const [year, setYear] = useState(2026);
  const [month, setMonth] = useState(''); // '' = todo el año para los KPIs superiores
  const [data, setData] = useState(null);
  const [presupuestos, setPresupuestos] = useState([]);
  const [loading, setLoading] = useState(true);

  // Estados para Edición de Movimiento y Desglose de Tarjeta
  const [editingMovimiento, setEditingMovimiento] = useState(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedCardMov, setSelectedCardMov] = useState(null);

  // Estados para desglose mensual al hacer clic en el gráfico
  const [selectedMonthDetail, setSelectedMonthDetail] = useState(1); // 1 = Enero por defecto
  const [monthMovements, setMonthMovements] = useState([]);
  const [loadingMovements, setLoadingMovements] = useState(false);
  const [movementTypeFilter, setMovementTypeFilter] = useState('todos'); // 'todos', 'gastos', 'ingresos', 'inversion'
  const [bankFilter, setBankFilter] = useState(''); // '' = todos
  const [categoryFilter, setCategoryFilter] = useState(''); // '' = todas
  const [esConsolidadoMonthFilter, setEsConsolidadoMonthFilter] = useState(''); // '' = todos, '1' = real, '0' = previsto
  const [movementSearch, setMovementSearch] = useState('');
  const [sortField, setSortField] = useState('fecha'); // 'fecha', 'cuenta', 'concepto', 'categoria', 'importe'
  const [sortDirection, setSortDirection] = useState('desc'); // 'asc', 'desc'

  const handleCategoryClick = (categoryName) => {
    if (categoryFilter === categoryName) {
      setCategoryFilter('');
    } else {
      setCategoryFilter(categoryName);
      // Desplazar la vista a la tabla de detalle
      const el = document.getElementById('detalle-movimientos-section');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  const handleEdit = (mov) => {
    setEditingMovimiento(mov);
    setIsEditOpen(true);
  };

  const handleToggleConsolidado = async (mov, e) => {
    if (e) e.stopPropagation();
    try {
      await api.toggleConsolidado(mov.id);
      loadMonthMovements();
      loadDashboardData();
    } catch (err) {
      console.error('Error toggling consolidado:', err);
    }
  };

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection(field === 'fecha' || field === 'importe' ? 'desc' : 'asc');
    }
  };

  const renderSortIcon = (field) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-3 h-3 ml-1 opacity-25 group-hover:opacity-60 transition-opacity inline" />;
    }
    return sortDirection === 'asc' ? (
      <ArrowUp className="w-3 h-3 ml-1 text-indigo-600 dark:text-indigo-400 inline" />
    ) : (
      <ArrowDown className="w-3 h-3 ml-1 text-indigo-600 dark:text-indigo-400 inline" />
    );
  };

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [dashRes, presRes] = await Promise.all([
        api.getDashboard(year, month || null),
        api.getPresupuestos(year, month || null)
      ]);
      setData(dashRes);
      setPresupuestos(presRes);
    } catch (err) {
      console.error('Error cargando dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, [year, month]);

  // Cargar movimientos del mes seleccionado (o de todo el año si es null)
  const loadMonthMovements = async () => {
    try {
      setLoadingMovements(true);
      const res = await api.getMovimientos({
        ano: year,
        mes: selectedMonthDetail || null,
        limit: 1000
      });
      setMonthMovements(res.data || res.movimientos || []);
    } catch (err) {
      console.error('Error cargando movimientos:', err);
    } finally {
      setLoadingMovements(false);
    }
  };

  useEffect(() => {
    loadMonthMovements();
  }, [selectedMonthDetail, year]);

  const kpis = data?.kpis || {};
  const saldosCuentas = data?.saldosCuentas || [];
  const evolucionMensual = data?.evolucionMensual || [];
  const distribucionCategorias = data?.distribucionCategorias || [];
  const matrizAnualTesoreria = data?.matrizAnualTesoreria || null;

  // Datos del mes seleccionado actualmente (o suma anual si no hay mes seleccionado)
  const currentMonthData = selectedMonthDetail
    ? (evolucionMensual.find(m => m.numMes === selectedMonthDetail) || {
        mes: MONTH_NAMES_FULL[selectedMonthDetail - 1] || 'Ene',
        ingresos: 0,
        gastos: 0,
        inversion: 0,
        ahorro: 0
      })
    : {
        mes: `Todo el Año ${year}`,
        ingresos: evolucionMensual.reduce((acc, m) => acc + (m.ingresos || 0), 0),
        gastos: evolucionMensual.reduce((acc, m) => acc + (m.gastos || 0), 0),
        inversion: evolucionMensual.reduce((acc, m) => acc + (m.inversion || 0), 0),
        ahorro: evolucionMensual.reduce((acc, m) => acc + (m.ahorro || 0), 0)
      };

  // Obtener lista de bancos/cuentas disponibles (definido antes de cualquier return condicional)
  const availableBanks = React.useMemo(() => {
    const bankMap = new Map();
    if (saldosCuentas && saldosCuentas.length > 0) {
      saldosCuentas.forEach(c => {
        if (c.nombre) bankMap.set(c.nombre, { id: c.id, nombre: c.nombre, color: c.color_hex });
      });
    }
    monthMovements.forEach(m => {
      if (m.cuenta_nombre && !bankMap.has(m.cuenta_nombre)) {
        bankMap.set(m.cuenta_nombre, { id: m.cuenta_id, nombre: m.cuenta_nombre, color: m.cuenta_color });
      }
    });
    return Array.from(bankMap.values());
  }, [saldosCuentas, monthMovements]);

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-brand-500 border-t-transparent"></div>
      </div>
    );
  }

  // Filtrado de movimientos del mes para la tabla
  const filteredMonthMovements = monthMovements.filter(m => {
    // Excluir transferencias internas por defecto
    if (m.es_transferencia_interna === 1) return false;

    // Filtro por tipo
    if (movementTypeFilter === 'gastos') {
      if (m.tipo_categoria === 'ingreso' || m.tipo_categoria === 'inversion' || m.importe >= 0) return false;
    } else if (movementTypeFilter === 'ingresos') {
      if (m.tipo_categoria !== 'ingreso' && m.importe <= 0) return false;
    } else if (movementTypeFilter === 'inversion') {
      if (m.tipo_categoria !== 'inversion') return false;
    }

    // Filtro por banco / entidad
    if (bankFilter) {
      if (m.cuenta_nombre !== bankFilter && String(m.cuenta_id) !== String(bankFilter)) {
        return false;
      }
    }

    // Filtro por categoría seleccionada
    if (categoryFilter) {
      if (m.categoria_nombre !== categoryFilter && String(m.categoria_id) !== String(categoryFilter)) {
        return false;
      }
    }

    // Filtro por estado de consolidación
    if (esConsolidadoMonthFilter !== '') {
      if (Number(m.es_consolidado !== undefined ? m.es_consolidado : 1) !== Number(esConsolidadoMonthFilter)) {
        return false;
      }
    }

    // Filtro por búsqueda de texto
    if (movementSearch.trim()) {
      const q = movementSearch.toLowerCase();
      const concepto = (m.concepto || '').toLowerCase();
      const cat = (m.categoria_nombre || '').toLowerCase();
      const subcat = (m.subcategoria || '').toLowerCase();
      const cta = (m.cuenta_nombre || '').toLowerCase();
      return concepto.includes(q) || cat.includes(q) || subcat.includes(q) || cta.includes(q);
    }

    return true;
  });

  // Ordenación interactiva de movimientos
  const sortedMonthMovements = [...filteredMonthMovements].sort((a, b) => {
    let comparison = 0;
    if (sortField === 'fecha') {
      const dateA = new Date(a.fecha || 0).getTime();
      const dateB = new Date(b.fecha || 0).getTime();
      comparison = dateA - dateB;
    } else if (sortField === 'estado') {
      const stateA = a.es_consolidado !== undefined ? Number(a.es_consolidado) : 1;
      const stateB = b.es_consolidado !== undefined ? Number(b.es_consolidado) : 1;
      comparison = stateA - stateB;
    } else if (sortField === 'cuenta') {
      comparison = (a.cuenta_nombre || '').localeCompare(b.cuenta_nombre || '', 'es', { sensitivity: 'base' });
    } else if (sortField === 'concepto') {
      comparison = (a.concepto || '').localeCompare(b.concepto || '', 'es', { sensitivity: 'base' });
    } else if (sortField === 'categoria') {
      comparison = (a.categoria_nombre || '').localeCompare(b.categoria_nombre || '', 'es', { sensitivity: 'base' });
    } else if (sortField === 'importe') {
      comparison = (Number(a.importe) || 0) - (Number(b.importe) || 0);
    }

    return sortDirection === 'asc' ? comparison : -comparison;
  });

  return (
    <div className="space-y-6 pb-12">
      
      {/* Barra de Filtro Temporal y Bienvenida */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            Tesorería Familiar {year}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Control de liquidez, aislamiento estricto de traspasos y asignación patrimonial.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Selector de Año */}
          <div className="flex items-center space-x-1.5 bg-slate-100 dark:bg-slate-800 py-1 px-2 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs">
            <Calendar className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <select
              value={year}
              onChange={(e) => {
                const newYear = Number(e.target.value);
                setYear(newYear);
              }}
              className="bg-transparent text-xs sm:text-sm font-black text-slate-800 dark:text-slate-100 pr-1 focus:outline-none cursor-pointer"
              aria-label="Seleccionar Año"
            >
              <option value={2024} className="dark:bg-slate-900">Año 2024</option>
              <option value={2025} className="dark:bg-slate-900">Año 2025</option>
              <option value={2026} className="dark:bg-slate-900">Año 2026</option>
              <option value={2027} className="dark:bg-slate-900">Año 2027</option>
              <option value={2028} className="dark:bg-slate-900">Año 2028</option>
            </select>
          </div>

          {/* Selector de Mes */}
          <div className="flex items-center space-x-1 bg-slate-100 dark:bg-slate-800 py-1 px-2 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs">
            <select
              value={selectedMonthDetail || ''}
              onChange={(e) => {
                const val = e.target.value ? Number(e.target.value) : null;
                setSelectedMonthDetail(val);
                setMonth(e.target.value);
              }}
              className="bg-transparent text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 pr-1 focus:outline-none cursor-pointer"
              aria-label="Seleccionar Mes"
            >
              <option value="" className="dark:bg-slate-900">Todo el Año {year}</option>
              {MONTHS.map(m => (
                <option key={m.value} value={m.value} className="dark:bg-slate-900">{m.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* 1. KPIs Principales Superiores */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-2.5">
        <KpiCard
          title="Saldo Líquido Total"
          value={formatCurrency(kpis.saldoLiquido)}
          subtitle="Cuentas operativas + Ahorro"
          icon={Wallet}
          color="brand"
        />
        <KpiCard
          title="Total Invertido"
          value={formatCurrency(kpis.totalInvertido)}
          subtitle="Fondos indexados + EPSVs"
          icon={PiggyBank}
          color="indigo"
        />
        <KpiCard
          title="Deuda Hipotecaria"
          value={formatCurrency(kpis.totalDeudaPendiente)}
          subtitle="Capital pendiente amortizar"
          icon={Landmark}
          color="amber"
        />
        <KpiCard
          title="Patrimonio Neto"
          value={formatCurrency(kpis.patrimonioNeto)}
          subtitle="(Líquido + Inv) - Pasivos"
          icon={ShieldCheck}
          color="brand"
        />
        <KpiCard
          title="Ingresos 2026"
          value={formatCurrency(kpis.ingresosNetos)}
          subtitle="Nóminas y retornos"
          icon={TrendingUp}
          color="brand"
        />
        <KpiCard
          title="Gastos Totales"
          value={`-${formatCurrency(kpis.gastosReales)}`}
          subtitle="Fijos, variables y tarjetas"
          icon={TrendingDown}
          color="rose"
        />
      </div>

      {/* 2. Matriz Anual de Tesorería y Previsiones (Igual al Excel Principal) */}
      <AnnualTreasuryMatrix 
        matrizData={matrizAnualTesoreria} 
        year={year}
        onSelectMonth={(m) => {
          setSelectedMonthDetail(prev => prev === m ? null : m);
          const el = document.getElementById('detalle-movimientos-section');
          if (el) el.scrollIntoView({ behavior: 'smooth' });
        }}
        selectedMonth={selectedMonthDetail}
      />

      {/* Gráficos Principales: Evolución Mensual + Donut de Gastos */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Gráfico de Barras y Líneas Interactivo: Ingresos vs Gastos + Línea de Saldo */}
        <div className="lg:col-span-2 min-w-0 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center space-x-2">
                <span>Evolución Financiera y Saldo {year}</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 flex items-center space-x-1">
                  <MousePointerClick className="w-3 h-3" />
                  <span>Haz clic en una barra para inspeccionar o deseleccionar</span>
                </span>
              </h3>
              <p className="text-xs text-slate-500">
                Barras: Ingresos vs Gastos mensuales | Línea azul/morada: Evolución del saldo líquido (Real vs Simulado)
              </p>
            </div>
          </div>

          <div className="h-72 w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} debounce={50}>
              <ComposedChart 
                data={evolucionMensual} 
                margin={{ top: 12, right: 15, left: 15, bottom: 0 }}
                onClick={(e) => {
                  if (e && e.activePayload && e.activePayload.length > 0) {
                    const payload = e.activePayload[0].payload;
                    if (payload && payload.numMes) {
                      setSelectedMonthDetail(prev => prev === payload.numMes ? null : payload.numMes);
                    }
                  }
                }}
                className="cursor-pointer"
              >
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
                <YAxis width={75} tick={{ fontSize: 11 }} tickFormatter={(val) => `${Math.round(val).toLocaleString('es-ES')} €`} />
                <Tooltip 
                  formatter={(value, name) => [formatCurrency(value), name]}
                  contentStyle={{ 
                    backgroundColor: 'rgba(15, 23, 42, 0.9)', 
                    border: 'none', 
                    borderRadius: '12px',
                    color: '#fff',
                    fontSize: '12px'
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Bar dataKey="ingresos" name="Ingresos Netos" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={28} />
                <Bar dataKey="gastos" name="Gastos Consumo" fill="#f43f5e" radius={[4, 4, 0, 0]} maxBarSize={28} />
                <Bar dataKey="inversion" name="Asignación Inversión" fill="#6366f1" radius={[4, 4, 0, 0]} maxBarSize={28} />
                <Line 
                  type="monotone" 
                  dataKey="saldoReal" 
                  name="Saldo Real Líquido" 
                  stroke="#2563eb" 
                  strokeWidth={3} 
                  dot={{ r: 3.5, fill: '#2563eb', strokeWidth: 1.5, stroke: '#fff' }} 
                  activeDot={{ r: 5.5 }} 
                />
                <Line 
                  type="monotone" 
                  dataKey="saldoSimulado" 
                  name="Saldo Previsto / Simulación" 
                  stroke="#a855f7" 
                  strokeWidth={3} 
                  strokeDasharray="5 5" 
                  dot={{ r: 3.5, fill: '#a855f7', strokeWidth: 1.5, stroke: '#fff' }} 
                  activeDot={{ r: 5.5 }} 
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gráfico Donut: Distribución de Gastos */}
        <div className="min-w-0 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-base text-slate-900 dark:text-white">
              Distribución por Categorías
            </h3>
            <p className="text-xs text-slate-500">
              Desglose de consumo corriente del periodo seleccionado
            </p>
          </div>

          {distribucionCategorias.length > 0 ? (
            <div className="h-56 w-full min-w-0 my-2">
              <ResponsiveContainer width="100%" height="100%" minWidth={0} debounce={50}>
                <PieChart>
                  <Pie
                    data={distribucionCategorias}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="total"
                    nameKey="nombre"
                    className="cursor-pointer"
                    onClick={(entry) => {
                      if (entry && (entry.nombre || entry.name)) {
                        handleCategoryClick(entry.nombre || entry.name);
                      }
                    }}
                  >
                    {distribucionCategorias.map((entry, index) => {
                      const isCatSelected = categoryFilter === entry.nombre;
                      return (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={entry.color || COLORS[index % COLORS.length]} 
                          stroke={isCatSelected ? '#4f46e5' : '#fff'}
                          strokeWidth={isCatSelected ? 3 : 1}
                        />
                      );
                    })}
                  </Pie>
                  <Tooltip 
                    formatter={(val) => [formatCurrency(val), 'Gasto']}
                    contentStyle={{ 
                      backgroundColor: 'rgba(15, 23, 42, 0.9)', 
                      border: 'none', 
                      borderRadius: '12px',
                      color: '#fff',
                      fontSize: '12px'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-56 text-slate-400 text-xs">
              <AlertCircle className="w-8 h-8 mb-2 opacity-50" />
              <span>Sin gastos registrados para este periodo</span>
            </div>
          )}

          {/* Lista de Categorías con Clic para Filtrar */}
          <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
            {distribucionCategorias.map((cat, idx) => {
              const isCatSelected = categoryFilter === cat.nombre;
              return (
                <div 
                  key={cat.id} 
                  onClick={() => handleCategoryClick(cat.nombre)}
                  className={`flex items-center justify-between text-xs p-1.5 rounded-xl cursor-pointer transition-all ${
                    isCatSelected 
                      ? 'bg-indigo-100 dark:bg-indigo-950/80 ring-2 ring-indigo-500 font-bold shadow-xs' 
                      : 'hover:bg-slate-100 dark:hover:bg-slate-800/60'
                  }`}
                  title={`Haz clic para ver movimientos de ${cat.nombre}`}
                >
                  <div className="flex items-center space-x-2 truncate">
                    <div 
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0" 
                      style={{ backgroundColor: cat.color || COLORS[idx % COLORS.length] }} 
                    />
                    <span className={`truncate ${isCatSelected ? 'text-indigo-900 dark:text-indigo-200 font-black' : 'text-slate-700 dark:text-slate-300'}`}>
                      {cat.nombre}
                    </span>
                  </div>
                  <span className={`ml-2 whitespace-nowrap ${isCatSelected ? 'text-indigo-700 dark:text-indigo-300 font-black' : 'font-bold text-slate-900 dark:text-white'}`}>
                    {formatCurrency(cat.total)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECCIÓN DETALLE MENSUAL: TABLA DE GASTOS E INGRESOS DEL MES CLICADO */}
      {/* ========================================================================= */}
      <div id="detalle-movimientos-section" className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-5 animate-fadeIn">
        
        {/* Cabecera del Mes Seleccionado */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 uppercase tracking-wider">
                {selectedMonthDetail ? `Mes: ${MONTH_NAMES_FULL[selectedMonthDetail - 1]}` : `Todo el Año ${year}`}
              </span>
              <span className="text-xs text-slate-400 font-semibold">
                Año {year}
              </span>
              {selectedMonthDetail && (
                <button
                  onClick={() => {
                    setSelectedMonthDetail(null);
                    setMonth('');
                  }}
                  className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 hover:bg-rose-50 dark:bg-slate-800 dark:hover:bg-rose-950/60 text-slate-700 hover:text-rose-600 dark:text-slate-300 dark:hover:text-rose-300 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
                  title="Deseleccionar mes y ver todos los movimientos del año"
                >
                  <X className="w-3 h-3" />
                  <span>Deseleccionar Mes (Ver todo el año)</span>
                </button>
              )}
              {categoryFilter && (
                <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-indigo-600 text-white shadow-xs">
                  <span>Filtrado: {categoryFilter}</span>
                  <button 
                    onClick={() => setCategoryFilter('')} 
                    className="hover:text-rose-200 ml-1 cursor-pointer"
                    title="Quitar filtro de categoría"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-1">
              {selectedMonthDetail 
                ? `Detalle de Movimientos de ${MONTH_NAMES_FULL[selectedMonthDetail - 1]}` 
                : `Detalle de Movimientos de Todo el Año ${year}`}
            </h2>
            <p className="text-xs text-slate-500">
              {selectedMonthDetail 
                ? `Visualizando los movimientos de ${MONTH_NAMES_FULL[selectedMonthDetail - 1]}. Puedes hacer clic de nuevo en la barra o en "Deseleccionar Mes" para ver todo el año.` 
                : `Visualizando todos los movimientos registrados en el ejercicio fiscal ${year}.`}
            </p>
          </div>

          {/* Tarjetitas de Resumen del Mes Clicado */}
          <div className="flex flex-wrap gap-2.5">
            <div className="px-3.5 py-2 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60">
              <span className="text-[10px] font-bold text-emerald-800 dark:text-emerald-300 uppercase block">Ingresos</span>
              <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                +{formatCurrency(currentMonthData.ingresos)}
              </span>
            </div>

            <div className="px-3.5 py-2 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60">
              <span className="text-[10px] font-bold text-rose-800 dark:text-rose-300 uppercase block">Gastos</span>
              <span className="text-sm font-black text-rose-600 dark:text-rose-400">
                -{formatCurrency(currentMonthData.gastos)}
              </span>
            </div>

            <div className="px-3.5 py-2 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60">
              <span className="text-[10px] font-bold text-indigo-800 dark:text-indigo-300 uppercase block">Ahorro Neto</span>
              <span className={`text-sm font-black ${currentMonthData.ahorro >= 0 ? 'text-indigo-600 dark:text-indigo-400' : 'text-rose-600'}`}>
                {formatCurrency(currentMonthData.ahorro)}
              </span>
            </div>
          </div>
        </div>

        {/* Barra de Filtros y Buscador */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5">
          {/* Botones de Filtro por Tipo */}
          <div className="flex flex-wrap items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl">
            <button
              onClick={() => setMovementTypeFilter('todos')}
              className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                movementTypeFilter === 'todos'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-black'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Todos ({monthMovements.filter(m => !m.es_transferencia_interna).length})
            </button>

            <button
              onClick={() => setMovementTypeFilter('gastos')}
              className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                movementTypeFilter === 'gastos'
                  ? 'bg-rose-600 text-white shadow-xs font-black'
                  : 'text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40'
              }`}
            >
              Solo Gastos
            </button>

            <button
              onClick={() => setMovementTypeFilter('ingresos')}
              className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                movementTypeFilter === 'ingresos'
                  ? 'bg-emerald-600 text-white shadow-xs font-black'
                  : 'text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
              }`}
            >
              Solo Ingresos
            </button>

            <button
              onClick={() => setMovementTypeFilter('inversion')}
              className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                movementTypeFilter === 'inversion'
                  ? 'bg-indigo-600 text-white shadow-xs font-black'
                  : 'text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40'
              }`}
            >
              Solo Inversión
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Filtro por Estado de Consolidación */}
            <div className="flex items-center space-x-1.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 px-2.5 py-1.5 rounded-xl">
              <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <select
                value={esConsolidadoMonthFilter}
                onChange={(e) => setEsConsolidadoMonthFilter(e.target.value)}
                className="bg-transparent text-[11px] font-bold text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer pr-1"
                aria-label="Filtrar por Estado"
              >
                <option value="" className="dark:bg-slate-900">Todos los Estados</option>
                <option value="1" className="dark:bg-slate-900">✓ Solo Reales (Consolidados)</option>
                <option value="0" className="dark:bg-slate-900">⏳ Solo Previstos (Simulación)</option>
              </select>
            </div>

            {/* Filtro por Categoría */}
            <div className="flex items-center space-x-1.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 px-2.5 py-1.5 rounded-xl">
              <Tag className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="bg-transparent text-[11px] font-semibold text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer pr-1 max-w-[120px] truncate"
                aria-label="Filtrar por Categoría"
              >
                <option value="" className="dark:bg-slate-900">Todas las Categorías</option>
                {distribucionCategorias.map(c => (
                  <option key={c.id || c.nombre} value={c.nombre} className="dark:bg-slate-900">
                    {c.nombre}
                  </option>
                ))}
              </select>
            </div>

            {/* Filtro por Banco / Cuenta */}
            <div className="flex items-center space-x-1.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 px-2.5 py-1.5 rounded-xl">
              <Landmark className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <select
                value={bankFilter}
                onChange={(e) => setBankFilter(e.target.value)}
                className="bg-transparent text-[11px] font-semibold text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer pr-1"
                aria-label="Filtrar por Banco"
              >
                <option value="" className="dark:bg-slate-900">Todos los Bancos</option>
                {availableBanks.map(b => (
                  <option key={b.id || b.nombre} value={b.nombre} className="dark:bg-slate-900">
                    {b.nombre}
                  </option>
                ))}
              </select>
            </div>

            {/* Campo de Búsqueda Rápida */}
            <div className="relative w-full sm:w-44">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar..."
                value={movementSearch}
                onChange={(e) => setMovementSearch(e.target.value)}
                className="w-full pl-8 pr-2.5 py-1.5 text-[11px] rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>
        </div>

        {/* Tabla Detallada de Movimientos - ZERO HORIZONTAL SCROLLBAR */}
        <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs w-full">
          {loadingMovements ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-indigo-500 border-t-transparent mx-auto mb-2"></div>
              <span>Cargando movimientos de {MONTH_NAMES_FULL[selectedMonthDetail - 1]}...</span>
            </div>
          ) : sortedMonthMovements.length > 0 ? (
            <div className="max-h-96 overflow-y-auto overflow-x-hidden w-full">
              <table className="w-full table-fixed text-left text-[11px] border-collapse">
                <thead className="sticky top-0 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 uppercase font-bold border-b border-slate-200 dark:border-slate-800 z-10 text-[10px]">
                  <tr>
                    <th 
                      onClick={() => handleSort('fecha')}
                      className="w-[8%] py-2.5 px-2 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors select-none group"
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
                      className="w-[11%] py-2.5 px-1.5 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors select-none group"
                      title="Ordenar por Cuenta / Banco"
                    >
                      <div className="flex items-center space-x-0.5">
                        <span>Cuenta</span>
                        {renderSortIcon('cuenta')}
                      </div>
                    </th>
                    <th 
                      onClick={() => handleSort('concepto')}
                      className="w-[24%] py-2.5 px-2 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors select-none group"
                      title="Ordenar por Concepto / Detalle"
                    >
                      <div className="flex items-center space-x-0.5">
                        <span>Concepto / Detalle</span>
                        {renderSortIcon('concepto')}
                      </div>
                    </th>
                    <th 
                      onClick={() => handleSort('categoria')}
                      className="w-[13%] py-2.5 px-1.5 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors select-none group"
                      title="Ordenar por Categoría"
                    >
                      <div className="flex items-center space-x-0.5">
                        <span>Categoría</span>
                        {renderSortIcon('categoria')}
                      </div>
                    </th>
                    <th 
                      onClick={() => handleSort('importe')}
                      className="w-[11%] py-2.5 px-1.5 text-right cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors select-none group"
                      title="Ordenar por Importe"
                    >
                      <div className="flex items-center justify-end space-x-0.5">
                        <span>Importe</span>
                        {renderSortIcon('importe')}
                      </div>
                    </th>
                    <th className="w-[11%] py-2.5 px-1.5 text-right" title="Saldo restante en esta cuenta tras el movimiento">Saldo Cta</th>
                    <th className="w-[10%] py-2.5 px-1.5 text-right bg-indigo-50/50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300" title="Saldo global acumulado líquido">Saldo Global</th>
                    <th className="w-[4%] py-2.5 px-1 text-center"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 font-medium text-[11px]">
                  {sortedMonthMovements.map((mov) => {
                    const isIncome = mov.tipo_categoria === 'ingreso' || mov.importe > 0;
                    const isInvestment = mov.tipo_categoria === 'inversion';
                    const isConsolidado = mov.es_consolidado === 1;
                    const formattedDate = mov.fecha ? new Date(mov.fecha).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' }) : '-';

                    return (
                      <tr 
                        key={mov.id} 
                        className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                      >
                        <td className="py-2 px-2 font-mono text-slate-500 text-[10px] whitespace-nowrap">
                          {formattedDate}
                        </td>
                        <td className="py-2 px-1 whitespace-nowrap text-center">
                          <button
                            onClick={(e) => handleToggleConsolidado(mov, e)}
                            title={isConsolidado ? 'Movimiento Real. Clic para marcar como previsto' : 'Simulación / Previsto. Clic para consolidar'}
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
                        <td className="py-2 px-1.5 whitespace-nowrap truncate">
                          <span 
                            className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-bold text-white shadow-xs max-w-full truncate"
                            style={{ backgroundColor: mov.cuenta_color || '#64748b' }}
                          >
                            {mov.cuenta_nombre}
                          </span>
                        </td>
                        <td className="py-2 px-2 text-slate-900 dark:text-white font-bold truncate">
                          <div className="flex items-center space-x-1.5 flex-wrap gap-y-1">
                            <span title={mov.concepto}>{mov.concepto}</span>
                            {(mov.concepto?.toUpperCase().includes('GASTOS TARJETA') || mov.subcategoria?.toUpperCase().includes('GASTOS TARJETA')) && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedCardMov(mov);
                                }}
                                className="inline-flex items-center space-x-1 px-1.5 py-0.2 rounded-full text-[9px] font-black bg-teal-50 hover:bg-teal-100 dark:bg-teal-950/60 dark:hover:bg-teal-900/80 text-teal-700 dark:text-teal-300 border border-teal-300 dark:border-teal-700 transition-all cursor-pointer shadow-2xs"
                                title="Ver tickets y desglose de compras de esta tarjeta"
                              >
                                <CreditCard className="w-2.5 h-2.5 text-teal-600 dark:text-teal-400" />
                                <span>Ver Tickets</span>
                              </button>
                            )}
                            {mov.etiqueta_especial && (
                              <span className="ml-1 px-1 py-0.2 rounded text-[8px] font-extrabold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                                {mov.etiqueta_especial}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-2 px-1.5 whitespace-nowrap truncate">
                          <span className="text-slate-600 dark:text-slate-300 font-semibold text-[10px] truncate block" title={mov.categoria_nombre}>
                            {mov.categoria_nombre}
                          </span>
                        </td>
                        <td className="py-2 px-1.5 text-right whitespace-nowrap font-mono font-black text-[11px]">
                          {isIncome ? (
                            <span className="text-emerald-600 dark:text-emerald-400">
                              +{formatCurrency(mov.importe)}
                            </span>
                          ) : isInvestment ? (
                            <span className="text-indigo-600 dark:text-indigo-400">
                              {formatCurrency(mov.importe)}
                            </span>
                          ) : (
                            <span className="text-rose-600 dark:text-rose-400">
                              {formatCurrency(mov.importe)}
                            </span>
                          )}
                        </td>
                        {/* Saldo en Cuenta particular */}
                        <td className="py-2 px-1.5 text-right whitespace-nowrap font-mono font-bold text-slate-700 dark:text-slate-300 text-[10px]">
                          {mov.saldo_cuenta !== undefined ? formatCurrency(mov.saldo_cuenta) : '-'}
                        </td>
                        {/* Saldo Global acumulado */}
                        <td className="py-2 px-1.5 text-right whitespace-nowrap font-mono font-black text-indigo-700 dark:text-indigo-300 bg-indigo-50/40 dark:bg-indigo-950/20 text-[10px]">
                          {mov.saldo_global !== undefined ? formatCurrency(mov.saldo_global) : '-'}
                        </td>
                        <td className="py-2 px-1 whitespace-nowrap text-center">
                          <button
                            onClick={() => handleEdit(mov)}
                            className="p-1 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition-colors cursor-pointer"
                            title="Editar este movimiento"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-8 text-center text-slate-400 text-xs">
              No se han encontrado movimientos para el mes de {MONTH_NAMES_FULL[selectedMonthDetail - 1]} con los filtros seleccionados.
            </div>
          )}
        </div>
      </div>

      {/* Desglose de Cuentas y Saldos Actuales */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div>
            <h3 className="font-bold text-base text-slate-900 dark:text-white">
              Posición Global por Entidad Bancaria
            </h3>
            <p className="text-xs text-slate-500">
              Saldos en tiempo real conciliados con transferencias y recibos
            </p>
          </div>
          {onOpenAccountsManager && (
            <button
              onClick={onOpenAccountsManager}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 border border-indigo-200 dark:border-indigo-800 transition-colors w-fit"
            >
              <Landmark className="w-3.5 h-3.5" />
              <span>Gestionar Cuentas / Calibrar Saldos</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
          {saldosCuentas.map(cuenta => {
            const isNegative = cuenta.saldoActual < 0;
            return (
              <div 
                key={cuenta.id}
                className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 hover:scale-[1.02] transition-transform"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-slate-900 dark:text-white truncate">
                    {cuenta.nombre}
                  </span>
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cuenta.color_hex }} />
                </div>
                <p className="text-[11px] text-slate-500 uppercase tracking-wider mt-1 capitalize">
                  {cuenta.tipo.replace('_', ' ')}
                </p>
                <p className={`text-lg font-black tracking-tight mt-2 ${isNegative ? 'text-rose-600' : 'text-slate-900 dark:text-white'}`}>
                  {formatCurrency(cuenta.saldoActual)}
                </p>
                <p className="text-[10px] text-slate-400 mt-1">
                  Apertura: {formatCurrency(cuenta.saldo_inicial_2026)}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Widget de Control de Presupuestos */}
      <BudgetAlerts 
        presupuestos={presupuestos} 
        onBudgetUpdated={loadDashboardData}
        currentMonthName={month ? getMonthName(month) : 'Mensual Recurrente'}
      />

      {/* Modal de Edición de Movimiento */}
      <EditTransactionModal
        isOpen={isEditOpen}
        onClose={() => { setIsEditOpen(false); setEditingMovimiento(null); }}
        movimiento={editingMovimiento}
        onTransactionUpdated={() => {
          loadMonthMovements();
          loadDashboardData();
        }}
        onTransactionDeleted={() => {
          loadMonthMovements();
          loadDashboardData();
        }}
        cuentas={saldosCuentas}
        categorias={distribucionCategorias}
      />

      {/* Modal de Desglose de Tickets de Tarjeta */}
      <CardBreakdownModal
        isOpen={Boolean(selectedCardMov)}
        onClose={() => setSelectedCardMov(null)}
        movimiento={selectedCardMov}
        cuentas={saldosCuentas}
        categorias={distribucionCategorias}
      />

    </div>
  );
}
