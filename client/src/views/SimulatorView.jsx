import React, { useState, useEffect, useMemo } from 'react';
import { useToast } from '../context/ToastContext';
import { 
  Calculator, 
  Truck, 
  Landmark, 
  TrendingDown, 
  AlertTriangle, 
  CheckCircle2, 
  DollarSign, 
  Calendar, 
  Percent,
  Layers,
  Plus,
  Edit2,
  Trash2,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Scale,
  Receipt,
  FileCheck,
  Check,
  X,
  History,
  Clock,
  BellRing,
  RotateCw,
  Sliders,
  Loader2,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Database,
  Table,
  HeartHandshake,
  Car,
  Home,
  GraduationCap,
  Briefcase,
  Package,
  PlusCircle,
  Download,
  Activity,
  ArrowUpRight,
  Save,
  Wand2,
  Zap,
  Wallet
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  Legend,
  BarChart,
  Bar,
  ReferenceLine
} from 'recharts';
import { formatCurrency, formatPercent, formatDate, MONTHS } from '../utils/formatters';
import { api } from '../services/api';
import CuadroAmortizacionModal from '../components/CuadroAmortizacionModal';

// Índices de referencia oficiales y personalizables
export const INDICES_REFERENCIA = [
  { id: 'Euríbor 12M', label: 'Euríbor 12M (Oficial BdE / Anual)' },
  { id: 'Euríbor 6M', label: 'Euríbor 6 Meses (Semestral)' },
  { id: 'Euríbor 3M', label: 'Euríbor 3 Meses (Trimestral)' },
  { id: 'IRPH Entidades', label: 'IRPH Conjunto de Entidades (BdE)' },
  { id: 'Míbor', label: 'Míbor (Histórico)' },
  { id: 'personalizado', label: 'Personalizado / Otro...' }
];

// Presets para configuración rápida
const PRESETS_PASIVO = [
  { id: 'hipoteca', label: 'Hipoteca Vivienda', tipo: 'hipoteca', icon: Home, defaultCap: 180000, defaultPlazo: 25, defaultModalidad: 'variable', defaultInteres: 1.85, defaultDif: 0.75, defaultMesRev: 'Julio' },
  { id: 'familiar', label: 'Préstamo Familiar (0%)', tipo: 'familiar', icon: HeartHandshake, defaultCap: 15000, defaultPlazo: 5, defaultModalidad: 'cero', defaultInteres: 0, defaultDif: 0, defaultMesRev: 'Enero' },
  { id: 'vehiculo', label: 'Coche / Furgoneta', tipo: 'personal', icon: Car, defaultCap: 30000, defaultPlazo: 5, defaultModalidad: 'fijo', defaultInteres: 6.5, defaultDif: 0, defaultMesRev: 'Enero' },
  { id: 'reforma', label: 'Reforma Vivienda', tipo: 'personal', icon: Wand2, defaultCap: 25000, defaultPlazo: 6, defaultModalidad: 'fijo', defaultInteres: 5.5, defaultDif: 0, defaultMesRev: 'Enero' },
  { id: 'estudios', label: 'Estudios / Máster', tipo: 'personal', icon: GraduationCap, defaultCap: 12000, defaultPlazo: 4, defaultModalidad: 'fijo', defaultInteres: 4.5, defaultDif: 0, defaultMesRev: 'Enero' },
  { id: 'negocio', label: 'Proyecto / Negocio', tipo: 'personal', icon: Briefcase, defaultCap: 20000, defaultPlazo: 5, defaultModalidad: 'fijo', defaultInteres: 6.0, defaultDif: 0, defaultMesRev: 'Enero' },
  { id: 'personal', label: 'Préstamo Personal', tipo: 'personal', icon: Package, defaultCap: 10000, defaultPlazo: 3, defaultModalidad: 'fijo', defaultInteres: 7.0, defaultDif: 0, defaultMesRev: 'Enero' }
];

export default function SimulatorView() {
  const { toast, confirmDialog } = useToast();
  const [pasivos, setPasivos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [simulating, setSimulating] = useState(false);
  const [loadingEuribor, setLoadingEuribor] = useState(false);
  const [expandedHistories, setExpandedHistories] = useState({});

  // Modal para ver el cuadro de amortización completo de un pasivo existente
  const [selectedCuadroPasivo, setSelectedCuadroPasivo] = useState(null);

  // Pestaña activa
  const [activeTab, setActiveTab] = useState('diseñador_integral'); // 'diseñador_integral', 'pasivos', 'amortizacion'

  // ========================================================
  // ESTADO: PESTAÑA AMORTIZACIÓN EXTRAORDINARIA & HACIENDA
  // ========================================================
  const [selectedPasivoId, setSelectedPasivoId] = useState(null);
  const [amortizacionExtra, setAmortizacionExtra] = useState(5000);
  const [modalidadAmort, setModalidadAmort] = useState('reducir_plazo'); // 'reducir_plazo' | 'reducir_cuota'
  const [nuevoInteresAmort, setNuevoInteresAmort] = useState('');
  const [esViviendaHabitual, setEsViviendaHabitual] = useState(true);
  const [regimenFiscal, setRegimenFiscal] = useState('pais_vasco'); // 'pais_vasco' | 'general'
  const [numeroTitulares, setNumeroTitulares] = useState(1); // 1 | 2 titulares
  const [escenarioResult, setEscenarioResult] = useState(null);

  // Cuentas y Modal de Aplicación Real de Amortización Anticipada
  const [cuentas, setCuentas] = useState([]);
  const [isAmortModalOpen, setIsAmortModalOpen] = useState(false);
  const [amortForm, setAmortForm] = useState({
    cuentaId: '',
    fecha: new Date().toISOString().split('T')[0],
    notas: ''
  });

  // ========================================================
  // ESTADO UNIFICADO: DISEÑADOR & SIMULADOR INTEGRAL DE PASIVOS
  // ========================================================
  const [editingPasivoId, setEditingPasivoId] = useState(null);
  const [formUnified, setFormUnified] = useState({
    presetId: 'hipoteca',
    nombre: 'Hipoteca Santander',
    tipo: 'hipoteca',
    numero_titulares: 1,
    fecha_inicio: '2015-07-01',
    fecha_fin_prevista: '2030-06-30',
    fecha_actualizacion_saldo: new Date().toISOString().split('T')[0],
    capital_inicial: 180000,
    capital_pendiente: 84500,
    cuota_mensual: 625.50,
    plazoAnos: 15,
    tipo_interes_modalidad: 'variable', // 'cero' | 'variable' | 'fijo'
    interes_nominal_anual: 1.85,
    diferencial_euribor: 0.75,
    indice_referencia: 'Euríbor 12M',
    mes_revision: 'Julio',
    frecuencia_revision: 'Anual',
    proxima_revision_fecha: '2026-07-01',
    notas: '',
    historialIntereses: []
  });

  const [simulacionUnificada, setSimulacionUnificada] = useState(null);
  const [cuadroViewMode, setCuadroViewMode] = useState('anual'); // 'anual' | 'mensual'

  const loadPasivos = async () => {
    try {
      setLoading(true);
      const [res, cList] = await Promise.all([
        api.getPasivos(),
        api.getCuentas().catch(() => [])
      ]);
      setPasivos(res);
      setCuentas(cList || []);
      if (res.length > 0) {
        if (!selectedPasivoId || !res.some(p => p.id === Number(selectedPasivoId))) {
          setSelectedPasivoId(res[0].id);
          setNuevoInteresAmort(res[0].interes_nominal_anual);
        }
      }
    } catch (err) {
      console.error('Error cargando pasivos:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmAmortizacion = async () => {
    if (!currentSelectedPasivo || amortizacionExtra <= 0) return;
    try {
      setLoading(true);
      const res = await api.registrarAmortizacionAnticipada(currentSelectedPasivo.id, {
        cuentaId: amortForm.cuentaId || cuentas[0]?.id,
        importe: amortizacionExtra,
        fecha: amortForm.fecha,
        modalidad: modalidadAmort,
        nuevaCuota: modalidadAmort === 'reducir_cuota' ? (escenarioResult?.simulado?.cuotaMensual || null) : null,
        notas: amortForm.notas
      });
      setIsAmortModalOpen(false);
      setAmortizacionExtra(0);
      toast.success(res.message || 'Amortización registrada con éxito y descontada de la cuenta', 'Amortización Anticipada');
      await loadPasivos();
    } catch (err) {
      toast.error(err.message || 'Error registrando amortización', 'Error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPasivos();
  }, []);

  // Sincronizar titulares y régimen fiscal al cambiar de pasivo seleccionado
  useEffect(() => {
    if (selectedPasivoId && pasivos.length > 0) {
      const cur = pasivos.find(p => p.id === Number(selectedPasivoId));
      if (cur) {
        setNumeroTitulares(Number(cur.numero_titulares) || 1);
        if (cur.tipo === 'hipoteca') {
          setEsViviendaHabitual(true);
        }
      }
    }
  }, [selectedPasivoId, pasivos]);

  const toggleExpandHistory = (id) => {
    setExpandedHistories(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  // Recalcular escenario de amortización parcial
  useEffect(() => {
    if (!selectedPasivoId || pasivos.length === 0) return;
    const current = pasivos.find(p => p.id === Number(selectedPasivoId));
    if (!current) return;

    const runSimulation = async () => {
      try {
        setSimulating(true);
        const payload = {
          capitalPendiente: Number(current.capital_pendiente) || 0,
          interesAnual: Number(current.interes_nominal_anual) || 0,
          cuotaMensual: Number(current.cuota_mensual) || 0,
          mesesRestantes: current.mesesRestantes || 60,
          amortizacionExtra: Number(amortizacionExtra) || 0,
          modalidadAmortizacion: modalidadAmort,
          nuevoInteresAnual: nuevoInteresAmort !== '' ? Number(nuevoInteresAmort) : Number(current.interes_nominal_anual),
          esViviendaHabitual: current.tipo === 'hipoteca' ? esViviendaHabitual : false,
          regimenFiscal,
          numeroTitulares: Number(numeroTitulares) || 1
        };
        const res = await api.simularEscenarioPasivo(payload);
        setEscenarioResult(res);
      } catch (err) {
        console.error('Error simulando escenario:', err);
      } finally {
        setSimulating(false);
      }
    };

    runSimulation();
  }, [selectedPasivoId, amortizacionExtra, modalidadAmort, nuevoInteresAmort, esViviendaHabitual, regimenFiscal, numeroTitulares, pasivos]);

  // ========================================================
  // CÁLCULOS MATEMÁTICOS BIDIRECCIONALES & TRAYECTORIA HISTÓRICA
  // ========================================================
  const computeCuotaMensual = (capital, interesNominal, modalidad, plazoAnos, totalMeses = null) => {
    const cap = Number(capital) || 0;
    const meses = totalMeses ? Math.max(1, totalMeses) : Math.max(1, Math.round((Number(plazoAnos) || 1) * 12));
    if (cap <= 0) return 0;
    if (modalidad === 'cero' || Number(interesNominal) === 0) {
      return Number((cap / meses).toFixed(2));
    }
    const r = (Number(interesNominal) / 100) / 12;
    const factor = Math.pow(1 + r, meses);
    const cuota = (cap * r * factor) / (factor - 1);
    return Number(cuota.toFixed(2));
  };

  const computePlazoAnos = (capital, interesNominal, modalidad, cuotaMensual) => {
    const cap = Number(capital) || 0;
    const cuota = Number(cuotaMensual) || 0;
    if (cap <= 0 || cuota <= 0) return 5;
    if (modalidad === 'cero' || Number(interesNominal) === 0) {
      const meses = cap / cuota;
      return Math.max(1, Math.min(40, Math.round(meses / 12) || 1));
    }
    const r = (Number(interesNominal) / 100) / 12;
    const minCuotaIntereses = cap * r;
    if (cuota <= minCuotaIntereses) {
      return 30;
    }
    const nMeses = -Math.log(1 - (cap * r) / cuota) / Math.log(1 + r);
    if (isNaN(nMeses) || nMeses <= 0) return 5;
    return Math.max(1, Math.min(40, Math.round(nMeses / 12) || 1));
  };

  const computeHistoricalSchedule = (form, historyList) => {
    if (!historyList || historyList.length === 0) return [];
    
    const sorted = [...historyList].sort((a, b) => (Number(a.ano) || 0) - (Number(b.ano) || 0));
    const startYear = form.fecha_inicio ? (parseInt(form.fecha_inicio.split('-')[0]) || sorted[0]?.ano || 2015) : (sorted[0]?.ano || 2015);
    
    let totalMonths = 0;
    if (form.fecha_inicio && form.fecha_fin_prevista) {
      const p1 = String(form.fecha_inicio).split('-').map(Number);
      const p2 = String(form.fecha_fin_prevista).split('-').map(Number);
      if (p1[0] && p2[0]) {
        const diff = (p2[0] - p1[0]) * 12 + ((p2[1] || 1) - (p1[1] || 1));
        if (diff > 0) totalMonths = diff;
      }
    }
    if (!totalMonths) {
      totalMonths = Math.max(12, Math.round((Number(form.plazoAnos) || 25) * 12));
    }

    let runningCap = (Number(form.capital_inicial) > 0) 
      ? Number(form.capital_inicial) 
      : (Number(form.capital_pendiente) || 150000);

    return sorted.map((item, idx) => {
      const itemYear = Number(item.ano) || (startYear + idx);
      const elapsedMonths = Math.max(0, (itemYear - startYear) * 12);
      const remainingMonths = Math.max(1, totalMonths - elapsedMonths);

      const tin = (item.interes !== undefined && item.interes !== '' && !isNaN(Number(item.interes)))
        ? Number(item.interes)
        : Number((Number(item.euribor || item.indice || 0) + Number(item.diferencial || 0)).toFixed(2));

      const r = (tin / 100) / 12;
      let cuotaEstimada = 0;

      if (runningCap <= 0) {
        cuotaEstimada = 0;
      } else if (r === 0) {
        cuotaEstimada = runningCap / remainingMonths;
      } else {
        const factor = Math.pow(1 + r, remainingMonths);
        cuotaEstimada = (runningCap * r * factor) / (factor - 1);
      }

      cuotaEstimada = Number(cuotaEstimada.toFixed(2));
      
      const tieneCuotaManual = (item.cuota !== undefined && item.cuota !== '' && item.cuota !== null && !isNaN(Number(item.cuota)) && Number(item.cuota) > 0);
      const cuotaEfectiva = tieneCuotaManual ? Number(item.cuota) : cuotaEstimada;

      const capInicio = runningCap;

      // Amortizar 12 meses de este año (o los meses restantes)
      const monthsToAmortize = Math.min(12, remainingMonths);
      for (let m = 0; m < monthsToAmortize; m++) {
        if (runningCap <= 0) break;
        const interesMes = runningCap * r;
        const amortCapital = Math.min(runningCap, Math.max(0, cuotaEfectiva - interesMes));
        runningCap = Math.max(0, runningCap - amortCapital);
      }

      return {
        ...item,
        ano: itemYear,
        interes: tin,
        capitalInicio: Number(capInicio.toFixed(2)),
        capitalFin: Number(runningCap.toFixed(2)),
        mesesRestantes: remainingMonths,
        cuotaEstimada,
        cuotaEfectiva,
        tieneCuotaManual
      };
    });
  };

  const computeFechaFinStr = (fechaInicio, plazoAnos, baseCalculo = 'saldo_vivo') => {
    const pAnos = Number(plazoAnos) || 1;
    if (baseCalculo === 'saldo_vivo') {
      const now = new Date();
      let startYear = now.getFullYear();
      let startMonth = now.getMonth() + 1;
      let startDay = now.getDate();

      if (fechaInicio) {
        const parts = String(fechaInicio).split('-').map(Number);
        if (parts[0] && parts[0] > startYear) {
          startYear = parts[0];
          startMonth = parts[1] || 1;
          startDay = parts[2] || 1;
        }
      }

      const endYear = startYear + Math.floor(pAnos);
      const extraMonths = Math.round((pAnos - Math.floor(pAnos)) * 12);
      let endMonth = startMonth + extraMonths;
      let finalYear = endYear;
      if (endMonth > 12) {
        finalYear += Math.floor((endMonth - 1) / 12);
        endMonth = ((endMonth - 1) % 12) + 1;
      }
      return `${finalYear}-${String(endMonth).padStart(2, '0')}-${String(startDay).padStart(2, '0')}`;
    }

    if (!fechaInicio) return '';
    const parts = String(fechaInicio).split('-').map(Number);
    if (parts.length < 2 || !parts[0] || !parts[1]) return '';
    const newY = parts[0] + Math.floor(pAnos);
    const extraMonths = Math.round((pAnos - Math.floor(pAnos)) * 12);
    let m = (parts[1] || 1) + extraMonths;
    let finalY = newY;
    if (m > 12) {
      finalY += Math.floor((m - 1) / 12);
      m = ((m - 1) % 12) + 1;
    }
    const dStr = String(parts[2] || 1).padStart(2, '0');
    return `${finalY}-${String(m).padStart(2, '0')}-${dStr}`;
  };

  const handleFechaFinChange = (newFechaFin) => {
    if (!newFechaFin) {
      setFormUnified(prev => ({ ...prev, fecha_fin_prevista: '' }));
      return;
    }

    const endParts = String(newFechaFin).split('-').map(Number);
    if (endParts.length < 3 || !endParts[0] || !endParts[1]) {
      setFormUnified(prev => ({ ...prev, fecha_fin_prevista: newFechaFin }));
      return;
    }

    const endDate = new Date(endParts[0], endParts[1] - 1, endParts[2] || 1);
    
    // Determine reference start date
    let startDate;
    if (formUnified.baseCalculo === 'capital_inicial' && formUnified.fecha_inicio) {
      const startParts = String(formUnified.fecha_inicio).split('-').map(Number);
      startDate = new Date(startParts[0], (startParts[1] || 1) - 1, startParts[2] || 1);
    } else {
      const now = new Date();
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      if (formUnified.fecha_inicio) {
        const startParts = String(formUnified.fecha_inicio).split('-').map(Number);
        const fIni = new Date(startParts[0], (startParts[1] || 1) - 1, startParts[2] || 1);
        if (fIni > startDate) startDate = fIni;
      }
    }

    let diffMonths = (endDate.getFullYear() - startDate.getFullYear()) * 12 + (endDate.getMonth() - startDate.getMonth());
    if (diffMonths <= 0) diffMonths = 1;

    const plazoAnos = Math.max(1, Math.min(40, Math.round(diffMonths / 12 * 10) / 10));

    const baseCap = (formUnified.baseCalculo === 'capital_inicial')
      ? (Number(formUnified.capital_inicial) || 0)
      : (Number(formUnified.capital_pendiente) || Number(formUnified.capital_inicial) || 0);

    const intVal = formUnified.tipo_interes_modalidad === 'cero' ? 0 : (Number(formUnified.interes_nominal_anual) || 0);
    const nuevaCuota = computeCuotaMensual(baseCap, intVal, formUnified.tipo_interes_modalidad, plazoAnos, diffMonths);

    setFormUnified(prev => ({
      ...prev,
      fecha_fin_prevista: newFechaFin,
      plazoAnos: Math.max(1, Math.round(plazoAnos)),
      cuota_mensual: nuevaCuota
    }));
  };

  const handleFechaInicioChange = (newFechaInicio) => {
    const fFin = computeFechaFinStr(newFechaInicio, formUnified.plazoAnos, formUnified.baseCalculo);
    setFormUnified(prev => ({
      ...prev,
      fecha_inicio: newFechaInicio,
      fecha_fin_prevista: fFin || prev.fecha_fin_prevista
    }));
  };

  const handlePlazoChange = (newPlazo) => {
    const p = Math.max(1, Math.min(40, Number(newPlazo) || 1));
    const baseCap = (formUnified.baseCalculo === 'capital_inicial')
      ? (Number(formUnified.capital_inicial) || 0)
      : (Number(formUnified.capital_pendiente) || Number(formUnified.capital_inicial) || 0);
    
    const intVal = formUnified.tipo_interes_modalidad === 'cero' ? 0 : (Number(formUnified.interes_nominal_anual) || 0);
    const nuevaCuota = computeCuotaMensual(baseCap, intVal, formUnified.tipo_interes_modalidad, p);
    const newFechaFin = computeFechaFinStr(formUnified.fecha_inicio, p, formUnified.baseCalculo);

    setFormUnified(prev => ({
      ...prev,
      plazoAnos: p,
      cuota_mensual: nuevaCuota,
      fecha_fin_prevista: newFechaFin || prev.fecha_fin_prevista
    }));
  };

  const handleCuotaChange = (newCuota) => {
    const cuota = parseFloat(newCuota) || 0;
    const baseCap = (formUnified.baseCalculo === 'capital_inicial')
      ? (Number(formUnified.capital_inicial) || 0)
      : (Number(formUnified.capital_pendiente) || Number(formUnified.capital_inicial) || 0);

    const intVal = formUnified.tipo_interes_modalidad === 'cero' ? 0 : (Number(formUnified.interes_nominal_anual) || 0);
    const nuevoPlazo = computePlazoAnos(baseCap, intVal, formUnified.tipo_interes_modalidad, cuota);
    const newFechaFin = computeFechaFinStr(formUnified.fecha_inicio, nuevoPlazo, formUnified.baseCalculo);

    setFormUnified(prev => ({
      ...prev,
      cuota_mensual: cuota,
      plazoAnos: nuevoPlazo,
      fecha_fin_prevista: newFechaFin || prev.fecha_fin_prevista
    }));
  };

  const handleCapitalPendienteChange = (newCap) => {
    const cap = Number(newCap) || 0;
    const intVal = formUnified.tipo_interes_modalidad === 'cero' ? 0 : (Number(formUnified.interes_nominal_anual) || 0);
    const nuevaCuota = computeCuotaMensual(cap, intVal, formUnified.tipo_interes_modalidad, formUnified.plazoAnos);

    setFormUnified(prev => ({
      ...prev,
      capital_pendiente: cap,
      cuota_mensual: nuevaCuota
    }));
  };

  const handleCapitalInicialChange = (newCap) => {
    const cap = Number(newCap) || 0;
    const isNew = !editingPasivoId;
    const intVal = formUnified.tipo_interes_modalidad === 'cero' ? 0 : (Number(formUnified.interes_nominal_anual) || 0);
    const pend = isNew ? cap : formUnified.capital_pendiente;
    const baseCap = formUnified.baseCalculo === 'capital_inicial' ? cap : pend;
    const nuevaCuota = computeCuotaMensual(baseCap, intVal, formUnified.tipo_interes_modalidad, formUnified.plazoAnos);

    setFormUnified(prev => ({
      ...prev,
      capital_inicial: cap,
      capital_pendiente: pend,
      cuota_mensual: nuevaCuota
    }));
  };

  const handleBaseCalculoChange = (base) => {
    const baseCap = base === 'capital_inicial' 
      ? (Number(formUnified.capital_inicial) || 0)
      : (Number(formUnified.capital_pendiente) || 0);
    
    const intVal = formUnified.tipo_interes_modalidad === 'cero' ? 0 : (Number(formUnified.interes_nominal_anual) || 0);
    const nuevaCuota = computeCuotaMensual(baseCap, intVal, formUnified.tipo_interes_modalidad, formUnified.plazoAnos);

    setFormUnified(prev => ({
      ...prev,
      baseCalculo: base,
      cuota_mensual: nuevaCuota
    }));
  };

  const handleModalidadChange = (mod) => {
    let intVal = formUnified.interes_nominal_anual;
    let dif = formUnified.diferencial_euribor;
    if (mod === 'cero') {
      intVal = 0;
      dif = 0;
    } else if (mod === 'variable') {
      intVal = intVal || 1.85;
      dif = dif || 0.75;
    } else if (mod === 'fijo') {
      intVal = intVal || 4.5;
      dif = 0;
    }
    const baseCap = formUnified.baseCalculo === 'capital_inicial'
      ? (Number(formUnified.capital_inicial) || 0)
      : (Number(formUnified.capital_pendiente) || Number(formUnified.capital_inicial) || 0);

    const nuevaCuota = computeCuotaMensual(baseCap, intVal, mod, formUnified.plazoAnos);

    setFormUnified(prev => ({
      ...prev,
      tipo_interes_modalidad: mod,
      interes_nominal_anual: intVal,
      diferencial_euribor: dif,
      cuota_mensual: nuevaCuota
    }));
  };

  // Recalcular el simulador unificado en tiempo real
  useEffect(() => {
    const calculateUnified = async () => {
      try {
        const imp = Number(formUnified.capital_pendiente) || Number(formUnified.capital_inicial) || 30000;
        const intA = formUnified.tipo_interes_modalidad === 'cero' ? 0 : (Number(formUnified.interes_nominal_anual) || 0);
        const res = await api.simularNuevoCredito({
          nombre: formUnified.nombre || 'Pasivo Simulado',
          concepto: formUnified.tipo,
          importe: imp,
          interes: intA,
          plazo: formUnified.plazoAnos || 5,
          cuota: formUnified.cuota_mensual || null,
          fechaInicio: formUnified.fecha_inicio || '2026-01-01',
          modalidad: formUnified.tipo_interes_modalidad,
          editingId: editingPasivoId || null
        });
        setSimulacionUnificada(res);
      } catch (err) {
        console.error('Error en simulación unificada:', err);
      }
    };
    calculateUnified();
  }, [
    formUnified.nombre, 
    formUnified.tipo, 
    formUnified.capital_pendiente, 
    formUnified.capital_inicial, 
    formUnified.cuota_mensual,
    formUnified.fecha_inicio,
    formUnified.plazoAnos, 
    formUnified.tipo_interes_modalidad, 
    formUnified.interes_nominal_anual,
    editingPasivoId,
    pasivos
  ]);

  // Manejo de Selección de Preset
  const handleSelectPreset = (preset) => {
    const todayStr = new Date().toISOString().split('T')[0];
    const finYear = new Date().getFullYear() + preset.defaultPlazo;
    const initialCuota = computeCuotaMensual(preset.defaultCap, preset.defaultInteres, preset.defaultModalidad, preset.defaultPlazo);

    setEditingPasivoId(null);
    setFormUnified({
      presetId: preset.id,
      nombre: preset.label,
      tipo: preset.tipo,
      fecha_inicio: todayStr,
      fecha_fin_prevista: `${finYear}-12-31`,
      fecha_actualizacion_saldo: todayStr,
      capital_inicial: preset.defaultCap,
      capital_pendiente: preset.defaultCap,
      cuota_mensual: initialCuota,
      plazoAnos: preset.defaultPlazo,
      tipo_interes_modalidad: preset.defaultModalidad,
      interes_nominal_anual: preset.defaultInteres,
      diferencial_euribor: preset.defaultDif,
      indice_referencia: 'Euríbor 12M',
      mes_revision: preset.defaultMesRev,
      frecuencia_revision: 'Anual',
      proxima_revision_fecha: '',
      notas: '',
      historialIntereses: preset.defaultModalidad === 'variable' ? [
        { ano: 2024, euribor: 3.53, indice: 3.53, diferencial: preset.defaultDif, interes: 3.53 + preset.defaultDif, notas: 'Pico ciclo' },
        { ano: 2025, euribor: 2.05, indice: 2.05, diferencial: preset.defaultDif, interes: 2.05 + preset.defaultDif, notas: 'Bajadas' },
        { ano: 2026, euribor: 1.10, indice: 1.10, diferencial: preset.defaultDif, interes: 1.10 + preset.defaultDif, notas: 'Revisión actual' }
      ] : []
    });
  };

  // Cargar pasivo para edición completa en el Diseñador Unificado
  const handleLoadPasivoToDesigner = (p) => {
    setEditingPasivoId(p.id);

    let hist = (p.historialIntereses && p.historialIntereses.length > 0)
      ? p.historialIntereses.map(h => ({
          ano: h.ano || 2026,
          euribor: h.euribor !== undefined ? h.euribor : (h.indice !== undefined ? h.indice : Math.max(0, Number(((h.interes || p.interes_nominal_anual) - (p.diferencial_euribor || 0.75)).toFixed(2)))),
          diferencial: h.diferencial !== undefined ? h.diferencial : (p.diferencial_euribor || 0.75),
          interes: h.interes !== undefined ? h.interes : p.interes_nominal_anual,
          cuota: h.cuota !== undefined && h.cuota !== null ? Number(h.cuota) : undefined,
          notas: h.notas || ''
        }))
      : [{
          ano: 2026,
          euribor: Math.max(0, Number((p.interes_nominal_anual - (p.diferencial_euribor || 0.75)).toFixed(2))),
          indice: Math.max(0, Number((p.interes_nominal_anual - (p.diferencial_euribor || 0.75)).toFixed(2))),
          diferencial: p.diferencial_euribor || 0.75,
          interes: p.interes_nominal_anual,
          notas: 'Tipo actual'
        }];

    let mod = p.tipo_interes_modalidad || 'variable';
    if (p.interes_nominal_anual === 0 || p.tipo === 'familiar') {
      mod = p.tipo_interes_modalidad === 'variable' ? 'variable' : (p.interes_nominal_anual === 0 ? 'cero' : 'fijo');
    }

    let pAnos = 5;
    if (p.fecha_inicio && p.fecha_fin_prevista) {
      const y1 = parseInt(p.fecha_inicio.split('-')[0]);
      const y2 = parseInt(p.fecha_fin_prevista.split('-')[0]);
      if (y2 > y1) pAnos = y2 - y1;
    }

    setFormUnified({
      presetId: p.tipo,
      nombre: p.nombre,
      tipo: p.tipo || 'personal',
      numero_titulares: Number(p.numero_titulares) || 1,
      fecha_inicio: p.fecha_inicio || '',
      fecha_fin_prevista: p.fecha_fin_prevista || '',
      fecha_actualizacion_saldo: p.fecha_actualizacion_saldo || new Date().toISOString().split('T')[0],
      capital_inicial: p.capital_inicial,
      capital_pendiente: p.capital_pendiente,
      cuota_mensual: p.cuota_mensual,
      plazoAnos: pAnos,
      tipo_interes_modalidad: mod,
      interes_nominal_anual: p.interes_nominal_anual,
      diferencial_euribor: p.diferencial_euribor !== undefined ? p.diferencial_euribor : 0.75,
      indice_referencia: p.indice_referencia || 'Euríbor 12M',
      mes_revision: p.mes_revision || 'Julio',
      frecuencia_revision: p.frecuencia_revision || 'Anual',
      proxima_revision_fecha: p.proxima_revision_fecha || '',
      notas: p.notas || '',
      historialIntereses: hist
    });

    setActiveTab('diseñador_integral');
  };

  // Auto-cargar índice oficial (Euríbor, IRPH, etc.)
  const handleConsultarEuriborOficial = async () => {
    try {
      setLoadingEuribor(true);
      const startYear = formUnified.fecha_inicio ? parseInt(formUnified.fecha_inicio.split('-')[0]) || 2015 : 2015;
      const endYear = 2026;
      const mesRev = formUnified.mes_revision || 'Julio';
      const dif = Number(formUnified.diferencial_euribor) || 0.75;
      const tipoIndice = formUnified.indice_referencia || 'Euríbor 12M';

      const res = await api.consultarEuriborHistorico({
        tipoIndice,
        anoInicio: startYear,
        anoFin: endYear,
        mesRevision: mesRev,
        diferencial: dif
      });

      if (res && res.historial && res.historial.length > 0) {
        const last = res.historial[res.historial.length - 1];
        setFormUnified(prev => ({
          ...prev,
          interes_nominal_anual: last.interes,
          historialIntereses: res.historial
        }));
      }
    } catch (err) {
      toast.error('Error consultando el índice oficial: ' + err.message);
    } finally {
      setLoadingEuribor(false);
    }
  };

  const handleAddInterestYear = () => {
    const lastYear = formUnified.historialIntereses.length > 0
      ? Math.max(...formUnified.historialIntereses.map(h => Number(h.ano) || 2025))
      : 2025;
    
    const dif = Number(formUnified.diferencial_euribor) || 0.75;
    const defaultVal = 1.10;
    const totalTIN = Number((defaultVal + dif).toFixed(2));

    setFormUnified({
      ...formUnified,
      historialIntereses: [
        ...formUnified.historialIntereses,
        { 
          ano: lastYear + 1, 
          euribor: defaultVal,
          indice: defaultVal,
          diferencial: dif,
          interes: totalTIN, 
          notas: `Revisión ${lastYear + 1}` 
        }
      ]
    });
  };

  const handleRemoveInterestYear = (index) => {
    const updated = formUnified.historialIntereses.filter((_, idx) => idx !== index);
    setFormUnified({ ...formUnified, historialIntereses: updated });
  };

  const handleUpdateInterestItem = (index, field, value) => {
    const updated = [...formUnified.historialIntereses];
    const currentItem = { ...updated[index] };

    if (field === 'cuota') {
      if (value === '' || value === null || isNaN(parseFloat(value))) {
        delete currentItem.cuota;
      } else {
        currentItem.cuota = parseFloat(value);
      }
    } else {
      currentItem[field] = value;
    }

    if (field === 'euribor' || field === 'indice' || field === 'diferencial') {
      const eVal = (field === 'euribor' || field === 'indice') ? (parseFloat(value) || 0) : (parseFloat(currentItem.euribor || currentItem.indice) || 0);
      const dVal = field === 'diferencial' ? (parseFloat(value) || 0) : (parseFloat(currentItem.diferencial) || 0);
      currentItem.euribor = eVal;
      currentItem.indice = eVal;
      currentItem.interes = Number((eVal + dVal).toFixed(2));
    } else if (field === 'interes') {
      const iVal = parseFloat(value) || 0;
      const dVal = parseFloat(currentItem.diferencial) || 0;
      currentItem.euribor = Number(Math.max(0, iVal - dVal).toFixed(2));
      currentItem.indice = currentItem.euribor;
    }

    updated[index] = currentItem;
    
    const isLast = index === updated.length - 1;
    let newMainInteres = formUnified.interes_nominal_anual;
    if (isLast) {
      newMainInteres = currentItem.interes;
    }

    setFormUnified({
      ...formUnified,
      interes_nominal_anual: newMainInteres,
      historialIntereses: updated
    });
  };

  const handleResetCuotaItem = (index) => {
    const updated = [...formUnified.historialIntereses];
    const item = { ...updated[index] };
    delete item.cuota;
    updated[index] = item;
    setFormUnified({
      ...formUnified,
      historialIntereses: updated
    });
  };

  // Guardar Pasivo desde el Diseñador Unificado
  const handleSaveUnifiedPasivo = async (e) => {
    e.preventDefault();
    try {
      const isCero = formUnified.tipo_interes_modalidad === 'cero';

      const payload = {
        ...formUnified,
        capital_inicial: Number(formUnified.capital_inicial),
        capital_pendiente: Number(formUnified.capital_pendiente),
        cuota_mensual: Number(formUnified.cuota_mensual),
        interes_nominal_anual: isCero ? 0 : Number(formUnified.interes_nominal_anual),
        diferencial_euribor: isCero ? 0 : Number(formUnified.diferencial_euribor),
        indice_referencia: isCero ? '' : (formUnified.indice_referencia || 'Euríbor 12M'),
        numero_titulares: Number(formUnified.numero_titulares) || 1,
        historial_intereses_json: isCero ? '[]' : JSON.stringify(formUnified.historialIntereses)
      };

      if (editingPasivoId) {
        await api.updatePasivo(editingPasivoId, payload);
        toast.success(`¡${formUnified.nombre} actualizado con éxito en la cartera!`, 'Pasivo Actualizado');
      } else {
        await api.createPasivo(payload);
        toast.success(`¡${formUnified.nombre} guardado e incorporado con éxito a tus pasivos activos!`, 'Pasivo Creado');
      }
      setEditingPasivoId(null);
      await loadPasivos();
      setActiveTab('pasivos');
    } catch (err) {
      toast.error('Error guardando pasivo: ' + err.message);
    }
  };

  const handleDeletePasivo = async (id) => {
    const ok = await confirmDialog({
      title: 'Eliminar Préstamo / Pasivo',
      message: '¿Estás seguro de que deseas eliminar permanentemente este pasivo de tu cartera?',
      confirmText: 'Sí, Eliminar',
      type: 'danger'
    });
    if (!ok) return;

    try {
      await api.deletePasivo(id);
      if (selectedPasivoId === id) setSelectedPasivoId(null);
      await loadPasivos();
      toast.success('Préstamo/pasivo eliminado de tu cartera.', 'Eliminado');
    } catch (err) {
      toast.error('Error eliminando pasivo: ' + err.message);
    }
  };

  const handleExportUnifiedCSV = () => {
    if (!simulacionUnificada || !simulacionUnificada.schedule) return;
    const schedule = simulacionUnificada.schedule;

    const headers = ['Mes', 'Cuota (€)', 'Amortización Capital (€)', 'Intereses (€)', 'Saldo Restante (€)'];
    const rows = schedule.map(s => [
      s.mes,
      s.cuotaTotal,
      s.amortizacionCapital,
      s.pagoIntereses,
      s.saldoRestante
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `cuadro_amortizacion_${(formUnified.nombre || 'pasivo').toLowerCase().replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const currentSelectedPasivo = pasivos.find(p => p.id === Number(selectedPasivoId));

  const currentAmortizado = currentSelectedPasivo
    ? (currentSelectedPasivo.totalAmortizado !== undefined 
        ? currentSelectedPasivo.totalAmortizado 
        : Math.max(0, (Number(currentSelectedPasivo.capital_inicial) || 0) - (Number(currentSelectedPasivo.capital_pendiente) || 0)))
    : 0;

  const currentProgresoPct = (currentSelectedPasivo && Number(currentSelectedPasivo.capital_inicial) > 0)
    ? Number(((currentAmortizado / currentSelectedPasivo.capital_inicial) * 100).toFixed(1))
    : (currentSelectedPasivo?.progresoAmortizadoPct || 0);

  // Cuotas anuales base y cálculo óptimo para deducción en IRPF (País Vasco y Estatal)
  const cuotasAnualesBase = Math.round((Number(currentSelectedPasivo?.cuota_mensual) || 0) * 12);
  const baseLimitePV = 8500 * (Number(numeroTitulares) || 1);
  const baseLimiteEstatal = 9040 * (Number(numeroTitulares) || 1);
  const topeOptimoPV = Math.max(0, baseLimitePV - cuotasAnualesBase);
  const topeOptimoEstatal = Math.max(0, baseLimiteEstatal - cuotasAnualesBase);

  const chartDataAmort = [];
  if (escenarioResult && escenarioResult.original && escenarioResult.simulado) {
    const schedOrig = escenarioResult.original.schedule || [];
    const schedSim = escenarioResult.simulado.schedule || [];
    const maxLen = Math.max(schedOrig.length, schedSim.length);

    const step = maxLen > 60 ? 3 : (maxLen > 24 ? 2 : 1);
    for (let i = 0; i < maxLen; i += step) {
      const origItem = schedOrig[i] || { saldoRestante: 0 };
      const simItem = schedSim[i] || { saldoRestante: 0 };
      const year = 2026 + Math.floor(i / 12);
      const mesName = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'][i % 12];

      chartDataAmort.push({
        label: `${mesName} ${year}`,
        mes: i + 1,
        saldoOriginal: Math.round(origItem.saldoRestante || 0),
        saldoSimulado: Math.round(simItem.saldoRestante || 0)
      });
    }
  }

  const resUnificado = simulacionUnificada?.resultados || {};

  // Trayectoria histórica anual y cuotas resultantes para la hipoteca
  const historicalSchedule = useMemo(() => {
    return computeHistoricalSchedule(formUnified, formUnified.historialIntereses);
  }, [
    formUnified.historialIntereses, 
    formUnified.capital_inicial, 
    formUnified.capital_pendiente, 
    formUnified.fecha_inicio, 
    formUnified.fecha_fin_prevista, 
    formUnified.plazoAnos
  ]);

  return (
    <div className="space-y-6 pb-12">
      
      {/* Cabecera & Selector de Pestañas Unificado */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center space-x-2">
            <Calculator className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            <span>Simulador & Diseñador Integral de Pasivos</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Gestión y simulación unificada: hipotecas, préstamos 0% familiares, Euríbor histórico, cuadros de vida y carga global de deudas.
          </p>
        </div>

        {/* Pestañas Principales */}
        <div className="flex items-center space-x-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
          
          <button
            onClick={() => setActiveTab('diseñador_integral')}
            className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
              activeTab === 'diseñador_integral'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <PlusCircle className="w-4 h-4" />
            <span>{editingPasivoId ? '✏️ Editando Pasivo' : '✨ Diseñar / Simular Pasivo'}</span>
          </button>

          <button
            onClick={() => setActiveTab('pasivos')}
            className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
              activeTab === 'pasivos'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Landmark className="w-4 h-4" />
            <span>Mis Pasivos & Cuadros ({pasivos.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('amortizacion')}
            className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
              activeTab === 'amortizacion'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>Amortización & Hacienda</span>
          </button>

        </div>
      </div>

      {/* ======================================================== */}
      {/* 1. PESTAÑA UNIFICADA: DISEÑADOR & SIMULADOR INTEGRAL */}
      {/* ======================================================== */}
      {activeTab === 'diseñador_integral' && (
        <form onSubmit={handleSaveUnifiedPasivo} className="space-y-6 animate-fadeIn">
          
          {/* Cabecera del Diseñador */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div>
                <div className="flex items-center space-x-2">
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                    {editingPasivoId ? `Editando: ${formUnified.nombre}` : 'Diseñador & Simulador de Pasivos / Préstamos'}
                  </h2>
                  {editingPasivoId && (
                    <button
                      type="button"
                      onClick={() => handleSelectPreset(PRESETS_PASIVO[0])}
                      className="text-xs text-indigo-600 dark:text-indigo-400 underline font-semibold"
                    >
                      (Crear nuevo en vez de editar)
                    </button>
                  )}
                </div>
                <p className="text-xs text-slate-500">
                  Configura tipo, saldo vivo a día de hoy, revisiones, histórico del Euríbor, cuadro de amortización e impacto en tu tesorería.
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  type="submit"
                  className="flex items-center space-x-1.5 px-5 py-2.5 rounded-xl text-sm font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/25 transition-all"
                >
                  <Save className="w-4 h-4" />
                  <span>{editingPasivoId ? 'Guardar Cambios del Pasivo' : '💾 Guardar en Cartera de Pasivos'}</span>
                </button>
              </div>
            </div>

            {/* Presets de Selección Rápida */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
                Plantillas Rápidas de Configuración:
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
                {PRESETS_PASIVO.map(preset => {
                  const Icon = preset.icon;
                  const isSelected = formUnified.presetId === preset.id;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => handleSelectPreset(preset)}
                      className={`p-2.5 rounded-xl flex items-center space-x-2 border transition-all text-left ${
                        isSelected
                          ? 'bg-indigo-50 dark:bg-indigo-950/50 border-indigo-500 text-indigo-900 dark:text-indigo-100 ring-2 ring-indigo-500/20 shadow-sm'
                          : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100'
                      }`}
                    >
                      <Icon className={`w-4 h-4 shrink-0 ${isSelected ? 'text-indigo-600' : 'text-slate-400'}`} />
                      <span className="text-xs font-bold truncate">{preset.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* MODALIDAD DE INTERÉS: 0% FAMILIAR / VARIABLE / FIJO */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 block">
                ¿Tiene Intereses o Índice este Préstamo?
              </label>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => handleModalidadChange('cero')}
                  className={`p-3 rounded-xl text-left border transition-all ${
                    formUnified.tipo_interes_modalidad === 'cero'
                      ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-500 text-emerald-900 dark:text-emerald-100 ring-2 ring-emerald-500/20 shadow-sm'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  <div className="flex items-center space-x-1.5 font-bold text-xs">
                    <HeartHandshake className="w-4 h-4 text-emerald-600" />
                    <span>0% Sin Interés (Familiar)</span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">Familiar / Amigos (Sin coste financiero ni índice)</p>
                </button>

                <button
                  type="button"
                  onClick={() => handleModalidadChange('variable')}
                  className={`p-3 rounded-xl text-left border transition-all ${
                    formUnified.tipo_interes_modalidad === 'variable'
                      ? 'bg-indigo-50 dark:bg-indigo-950/50 border-indigo-500 text-indigo-900 dark:text-indigo-100 ring-2 ring-indigo-500/20 shadow-sm'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  <div className="flex items-center space-x-1.5 font-bold text-xs">
                    <RotateCw className="w-4 h-4 text-indigo-600" />
                    <span>Tipo Variable (Euríbor)</span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">Euríbor oficial + Diferencial bancario</p>
                </button>

                <button
                  type="button"
                  onClick={() => handleModalidadChange('fijo')}
                  className={`p-3 rounded-xl text-left border transition-all ${
                    formUnified.tipo_interes_modalidad === 'fijo'
                      ? 'bg-indigo-50 dark:bg-indigo-950/50 border-indigo-500 text-indigo-900 dark:text-indigo-100 ring-2 ring-indigo-500/20 shadow-sm'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  <div className="flex items-center space-x-1.5 font-bold text-xs">
                    <Percent className="w-4 h-4 text-indigo-600" />
                    <span>Tipo Fijo (% TIN)</span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">% TIN constante durante toda la vida</p>
                </button>
              </div>

              {formUnified.tipo_interes_modalidad === 'cero' && (
                <div className="p-3 bg-emerald-50/70 dark:bg-emerald-950/30 rounded-xl border border-emerald-200 dark:border-emerald-800/60 text-xs text-emerald-800 dark:text-emerald-300 flex items-start space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                  <span>
                    <strong>Préstamo sin interés:</strong> El 100% de cada cuota amortiza directamente el capital sin intereses bancarios ni comisiones.
                  </span>
                </div>
              )}
            </div>

            {/* SECCIÓN 1: DATOS CLAVE, FECHAS Y SALDO VIVO */}
            <div className="p-4 rounded-xl bg-indigo-50/40 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-300">
                  1. Datos Principales, Fechas y Saldos
                </h3>

                {/* SELECTOR DE BASE DE CÁLCULO */}
                <div className="flex items-center space-x-1 bg-indigo-50 dark:bg-slate-900 p-1 rounded-xl border border-indigo-200 dark:border-indigo-800 text-xs">
                  <button
                    type="button"
                    onClick={() => handleBaseCalculoChange('saldo_vivo')}
                    className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                      formUnified.baseCalculo !== 'capital_inicial'
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'text-slate-600 dark:text-slate-300 hover:text-indigo-600'
                    }`}
                  >
                    🎯 Ajustar s/ Saldo Vivo ({formatCurrency(formUnified.capital_pendiente)})
                  </button>
                  <button
                    type="button"
                    onClick={() => handleBaseCalculoChange('capital_inicial')}
                    className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                      formUnified.baseCalculo === 'capital_inicial'
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'text-slate-600 dark:text-slate-300 hover:text-indigo-600'
                    }`}
                  >
                    🏛️ Capital Inicial ({formatCurrency(formUnified.capital_inicial)})
                  </button>
                </div>
              </div>

              {/* BARRA DE PROGRESO Y AMORTIZACIÓN HISTÓRICA */}
              {Number(formUnified.capital_inicial) > 0 && (
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                  <div className="flex flex-wrap items-center justify-between text-xs gap-2 mb-1.5 font-semibold">
                    <span className="text-slate-600 dark:text-slate-300">
                      Constitución: <strong className="text-slate-900 dark:text-white">{formatCurrency(formUnified.capital_inicial)}</strong> {formUnified.fecha_inicio && `(${formUnified.fecha_inicio})`}
                    </span>
                    <span className="text-emerald-600 dark:text-emerald-400">
                      Amortizado hasta hoy: <strong>+{formatCurrency(Math.max(0, Number(formUnified.capital_inicial) - Number(formUnified.capital_pendiente)))}</strong> ({((Math.max(0, Number(formUnified.capital_inicial) - Number(formUnified.capital_pendiente)) / Number(formUnified.capital_inicial)) * 100).toFixed(1)}%)
                    </span>
                    <span className="text-indigo-600 dark:text-indigo-400 font-bold">
                      Saldo Vivo Pendiente: <strong>{formatCurrency(formUnified.capital_pendiente)}</strong>
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-700 h-2.5 rounded-full overflow-hidden flex">
                    <div 
                      className="bg-emerald-500 h-full transition-all duration-300"
                      style={{ width: `${Math.min(100, Math.max(0, ((Number(formUnified.capital_inicial) - Number(formUnified.capital_pendiente)) / Number(formUnified.capital_inicial)) * 100))}%` }}
                    />
                    <div 
                      className="bg-indigo-600 h-full flex-1"
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Nombre del Préstamo</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: Hipoteca Santander, Préstamo Juancar, Coche..."
                    value={formUnified.nombre}
                    onChange={(e) => setFormUnified({ ...formUnified, nombre: e.target.value })}
                    className="w-full px-3.5 py-2 text-sm rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Tipo de Pasivo</label>
                  <select
                    value={formUnified.tipo}
                    onChange={(e) => setFormUnified({ ...formUnified, tipo: e.target.value })}
                    className="w-full px-3.5 py-2 text-sm rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-medium"
                  >
                    <option value="hipoteca">Hipoteca Vivienda</option>
                    <option value="familiar">Préstamo Familiar / Amigos</option>
                    <option value="personal">Préstamo Personal / Vehículo</option>
                    <option value="simulacion">Simulación</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Titulares (IRPF)</label>
                  <select
                    value={formUnified.numero_titulares || 1}
                    onChange={(e) => setFormUnified({ ...formUnified, numero_titulares: Number(e.target.value) || 1 })}
                    className="w-full px-3.5 py-2 text-sm rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-medium"
                  >
                    <option value={1}>1 Titular (8.500 €)</option>
                    <option value={2}>2 Cotitulares (17.000 €)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    Fecha de Inicio (¿Cuándo se empezó?)
                  </label>
                  <input
                    type="date"
                    required
                    value={formUnified.fecha_inicio}
                    onChange={(e) => handleFechaInicioChange(e.target.value)}
                    className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    Fecha Fin Prevista (Vencimiento)
                  </label>
                  <input
                    type="date"
                    value={formUnified.fecha_fin_prevista}
                    onChange={(e) => handleFechaFinChange(e.target.value)}
                    className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 pt-1">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    Capital Inicial Constituido (€)
                  </label>
                  <input
                    type="number"
                    step="100"
                    required
                    value={formUnified.capital_inicial}
                    onChange={(e) => handleCapitalInicialChange(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-indigo-700 dark:text-indigo-300 mb-1">
                    Saldo Vivo a Día de Hoy (€)
                  </label>
                  <input
                    type="number"
                    step="100"
                    required
                    value={formUnified.capital_pendiente}
                    onChange={(e) => handleCapitalPendienteChange(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-black rounded-lg bg-white dark:bg-slate-900 border-2 border-indigo-500 text-indigo-600 dark:text-indigo-400"
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      {formUnified.baseCalculo === 'capital_inicial' ? 'Plazo Total (Años)' : 'Plazo Restante (Años)'}
                    </label>
                    <div className="flex items-center space-x-1">
                      <input
                        type="number"
                        min="1"
                        max="40"
                        value={formUnified.plazoAnos}
                        onChange={(e) => handlePlazoChange(e.target.value)}
                        className="w-12 px-1 py-0.5 text-xs font-bold text-right text-indigo-600 dark:text-indigo-400 bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-800 rounded"
                      />
                      <span className="text-xs font-bold text-slate-400">años</span>
                    </div>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="35"
                    value={formUnified.plazoAnos}
                    onChange={(e) => handlePlazoChange(e.target.value)}
                    className="w-full accent-indigo-600 cursor-pointer"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-indigo-700 dark:text-indigo-300 mb-1">
                    Cuota Mensual (€/mes)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formUnified.cuota_mensual}
                    onChange={(e) => handleCuotaChange(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-extrabold rounded-lg bg-white dark:bg-slate-900 border border-indigo-300 dark:border-indigo-700 text-indigo-600 dark:text-indigo-400 shadow-sm"
                  />
                </div>
              </div>
            </div>

            {/* SECCIÓN 2: REVISIÓN DE LA HIPOTECA, ÍNDICE DE REFERENCIA Y HISTORIAL DE CUOTAS */}
            {formUnified.tipo_interes_modalidad === 'variable' && (
              <div className="p-4 sm:p-5 rounded-2xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/60 space-y-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <RotateCw className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300">
                      2. Revisión de Hipoteca, Índice & Diferencial Bancario
                    </h3>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300">
                    {formUnified.indice_referencia || 'Euríbor 12M'}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
                  {/* Selector de Índice de Referencia */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Índice de Referencia
                    </label>
                    <select
                      value={
                        ['Euríbor 12M', 'Euríbor 6M', 'Euríbor 3M', 'IRPH Entidades', 'Míbor'].includes(formUnified.indice_referencia)
                          ? formUnified.indice_referencia
                          : 'personalizado'
                      }
                      onChange={(e) => {
                        const val = e.target.value;
                        setFormUnified(prev => ({
                          ...prev,
                          indice_referencia: val === 'personalizado' ? (prev.indice_referencia || 'Personalizado') : val
                        }));
                      }}
                      className="w-full px-3 py-2 text-xs sm:text-sm font-bold rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                    >
                      {INDICES_REFERENCIA.map(ind => (
                        <option key={ind.id} value={ind.id}>{ind.label}</option>
                      ))}
                    </select>
                    {!['Euríbor 12M', 'Euríbor 6M', 'Euríbor 3M', 'IRPH Entidades', 'Míbor'].includes(formUnified.indice_referencia) && (
                      <input
                        type="text"
                        placeholder="Nombre índice (ej: IRS 5A)..."
                        value={formUnified.indice_referencia}
                        onChange={(e) => setFormUnified(prev => ({ ...prev, indice_referencia: e.target.value }))}
                        className="w-full mt-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200"
                      />
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Mes de Revisión
                    </label>
                    <select
                      value={formUnified.mes_revision}
                      onChange={(e) => setFormUnified({ ...formUnified, mes_revision: e.target.value })}
                      className="w-full px-3 py-2 text-xs sm:text-sm font-bold rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                    >
                      {MONTHS.map(m => (
                        <option key={m.value} value={m.label}>{m.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Frecuencia
                    </label>
                    <select
                      value={formUnified.frecuencia_revision}
                      onChange={(e) => setFormUnified({ ...formUnified, frecuencia_revision: e.target.value })}
                      className="w-full px-3 py-2 text-xs sm:text-sm font-semibold rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                    >
                      <option value="Anual">Anual (12 m)</option>
                      <option value="Semestral">Semestral (6 m)</option>
                      <option value="Trimestral">Trimestral (3 m)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Diferencial Base (%)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0.75"
                      value={formUnified.diferencial_euribor}
                      onChange={(e) => setFormUnified({ ...formUnified, diferencial_euribor: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 text-xs sm:text-sm font-black rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-blue-600 dark:text-blue-400"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Próxima Fecha
                    </label>
                    <input
                      type="date"
                      value={formUnified.proxima_revision_fecha}
                      onChange={(e) => setFormUnified({ ...formUnified, proxima_revision_fecha: e.target.value })}
                      className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-medium"
                    />
                  </div>
                </div>

                {/* HISTORIAL ANUAL DEL ÍNDICE CON CUOTA ESTIMADA Y REAL */}
                <div className="pt-3 border-t border-amber-200/60 dark:border-amber-800/60 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center space-x-1.5">
                        <Database className="w-4 h-4 text-indigo-500" />
                        <span>Historial de {formUnified.indice_referencia || 'Euríbor'} y Cuotas Resultantes (Editable)</span>
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        Serie anual con la cuota mensual calculada según el índice, o la cuota real de tus recibos bancarios.
                      </p>
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        type="button"
                        onClick={handleConsultarEuriborOficial}
                        disabled={loadingEuribor}
                        className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-sm transition-colors disabled:opacity-50"
                      >
                        {loadingEuribor ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                        <span>Auto-Cargar {formUnified.indice_referencia?.split(' ')[0] || 'Índice'} Oficial</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleAddInterestYear}
                        className="flex items-center space-x-1 px-3 py-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-white dark:bg-slate-900 hover:bg-indigo-50 rounded-xl border border-indigo-200 dark:border-indigo-800 transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Añadir Año</span>
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                    {historicalSchedule.map((item, idx) => (
                      <div key={idx} className="flex flex-col lg:flex-row items-start lg:items-center space-y-2 lg:space-y-0 lg:space-x-2 bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors">
                        
                        {/* Año */}
                        <div className="w-full lg:w-20">
                          <label className="text-[10px] text-slate-400 block font-semibold">Año</label>
                          <input
                            type="number"
                            value={item.ano}
                            onChange={(e) => handleUpdateInterestItem(idx, 'ano', parseInt(e.target.value) || 2026)}
                            className="w-full px-2 py-1 text-xs font-bold rounded bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                          />
                        </div>

                        {/* Valor del Índice */}
                        <div className="w-full lg:w-24">
                          <label className="text-[10px] text-slate-400 block font-semibold truncate" title={formUnified.indice_referencia || 'Índice (%)'}>
                            {formUnified.indice_referencia?.slice(0, 8) || 'Índice'} (%)
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            value={item.euribor !== undefined ? item.euribor : (item.indice !== undefined ? item.indice : '')}
                            onChange={(e) => handleUpdateInterestItem(idx, 'euribor', e.target.value)}
                            className="w-full px-2 py-1 text-xs font-bold rounded bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                          />
                        </div>

                        {/* Diferencial */}
                        <div className="w-full lg:w-20">
                          <label className="text-[10px] text-slate-400 block font-semibold">Dif. (%)</label>
                          <input
                            type="number"
                            step="0.01"
                            value={item.diferencial !== undefined ? item.diferencial : ''}
                            onChange={(e) => handleUpdateInterestItem(idx, 'diferencial', e.target.value)}
                            className="w-full px-2 py-1 text-xs font-bold rounded bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-blue-600 dark:text-blue-400"
                          />
                        </div>

                        {/* TIN Total */}
                        <div className="w-full lg:w-24">
                          <label className="text-[10px] text-slate-400 block font-semibold">TIN Total (%)</label>
                          <input
                            type="number"
                            step="0.01"
                            value={item.interes}
                            onChange={(e) => handleUpdateInterestItem(idx, 'interes', parseFloat(e.target.value) || 0)}
                            className="w-full px-2 py-1 text-xs font-extrabold rounded bg-indigo-50/50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400"
                          />
                        </div>

                        {/* CUOTA ESTIMADA / REAL (€/mes) */}
                        <div className="w-full lg:w-36">
                          <div className="flex items-center justify-between">
                            <label className="text-[10px] text-slate-400 block font-semibold">
                              Cuota (€/mes)
                            </label>
                            {item.tieneCuotaManual && (
                              <button
                                type="button"
                                onClick={() => handleResetCuotaItem(idx)}
                                className="text-[9px] text-amber-600 hover:text-amber-700 dark:text-amber-400 font-bold flex items-center"
                                title="Restablecer a cuota estimada teórica"
                              >
                                ↺ Teórica
                              </button>
                            )}
                          </div>
                          <div className="relative">
                            <input
                              type="number"
                              step="0.01"
                              placeholder={`${item.cuotaEstimada} €`}
                              value={item.cuota !== undefined && item.cuota !== null ? item.cuota : ''}
                              onChange={(e) => handleUpdateInterestItem(idx, 'cuota', e.target.value)}
                              className={`w-full px-2 py-1 text-xs font-black rounded border ${
                                item.tieneCuotaManual 
                                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300'
                                  : 'bg-indigo-50/30 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400'
                              }`}
                            />
                            {!item.tieneCuotaManual && (
                              <span className="absolute right-2 top-1 text-[10px] font-black text-indigo-500 pointer-events-none">
                                {formatCurrency(item.cuotaEstimada)}
                              </span>
                            )}
                          </div>
                          <span className={`text-[9px] block mt-0.5 font-medium ${item.tieneCuotaManual ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`}>
                            {item.tieneCuotaManual ? '✓ Cuota real manual' : `Est: ${formatCurrency(item.cuotaEstimada)}`}
                          </span>
                        </div>

                        {/* Saldo Restante Tras Amortizar */}
                        <div className="w-full lg:w-28 hidden xl:block">
                          <label className="text-[10px] text-slate-400 block font-semibold">Saldo Fin Año</label>
                          <div className="px-2 py-1 text-xs font-bold rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 truncate">
                            {formatCurrency(item.capitalFin)}
                          </div>
                        </div>

                        {/* Notas */}
                        <div className="w-full lg:flex-1">
                          <label className="text-[10px] text-slate-400 block font-semibold">Notas</label>
                          <input
                            type="text"
                            placeholder="Ej: Bonificación, revisión..."
                            value={item.notas || ''}
                            onChange={(e) => handleUpdateInterestItem(idx, 'notas', e.target.value)}
                            className="w-full px-2 py-1 text-xs rounded bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                          />
                        </div>

                        {/* Eliminar Fila */}
                        <button
                          type="button"
                          onClick={() => handleRemoveInterestYear(idx)}
                          className="p-1 text-slate-400 hover:text-rose-500 rounded lg:mt-3.5 self-end lg:self-auto"
                          title="Eliminar este año del historial"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* SECCIÓN 2B: TIPO FIJO */}
            {formUnified.tipo_interes_modalidad === 'fijo' && (
              <div className="p-4 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-800/60 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Tipo de Interés Fijo TIN (%)
                    </label>
                    <input
                      type="number"
                      step="0.05"
                      value={formUnified.interes_nominal_anual}
                      onChange={(e) => setFormUnified({ ...formUnified, interes_nominal_anual: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 text-sm font-bold rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                    />
                  </div>
                </div>
              </div>
            )}

          </div>

          {/* ======================================================== */}
          {/* FOTO GLOBAL DE IMPACTO FINANCIERO & ENDEUDAMIENTO (DTI) */}
          {/* ======================================================== */}
          {simulacionUnificada && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-fadeIn">
              
              <div className="p-5 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800/50">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-indigo-700 dark:text-indigo-300">Cuota de este Préstamo</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-200 dark:bg-indigo-900/60 text-indigo-900 dark:text-indigo-200 uppercase">
                    {formUnified.plazoAnos * 12} meses
                  </span>
                </div>
                <p className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-1">
                  {formatCurrency(resUnificado.cuotaMensual)}/mes
                </p>
                <p className="text-[11px] text-slate-500 mt-1">
                  Coste total intereses: {formatCurrency(resUnificado.totalIntereses)} (Total: {formatCurrency(resUnificado.totalCoste)})
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <span className="text-xs font-semibold text-slate-500">Carga Mensual Total Familiar</span>
                <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                  {formatCurrency(resUnificado.cuotaTotalFutura)}/mes
                </p>
                <p className="text-[11px] text-slate-500 mt-1">
                  Actual: {formatCurrency(resUnificado.cuotasActuales)}/mes ➔ <strong className="text-indigo-600 dark:text-indigo-400">+{formatCurrency(resUnificado.cuotaMensual)}/mes</strong>
                </p>
              </div>

              <div className={`p-5 rounded-2xl border ${
                resUnificado.esViableBancos 
                  ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/50' 
                  : 'bg-rose-50/70 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800/50'
              }`}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Ratio de Endeudamiento (DTI)</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                    resUnificado.esViableBancos 
                      ? 'bg-emerald-200 dark:bg-emerald-900/60 text-emerald-900 dark:text-emerald-200' 
                      : 'bg-rose-200 dark:bg-rose-900/60 text-rose-900 dark:text-rose-200'
                  }`}>
                    {resUnificado.nivelRiesgo}
                  </span>
                </div>
                <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                  {resUnificado.ratioEndeudamientoFuturo}%
                </p>
                <p className="text-[11px] text-slate-500 mt-1">
                  Actual: {resUnificado.ratioEndeudamientoActual}% (Límite bancario aconsejado: 35%)
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50">
                <span className="text-xs font-semibold text-amber-800 dark:text-amber-300">Margen Libre tras Deudas</span>
                <p className="text-2xl font-black text-amber-700 dark:text-amber-400 mt-1">
                  {formatCurrency(resUnificado.margenDisponibleFuturo)}/mes
                </p>
                <p className="text-[11px] text-slate-500 mt-1">
                  Ingreso base: {formatCurrency(resUnificado.ingresoMensualFamiliar)}/mes
                </p>
              </div>

            </div>
          )}

          {/* ======================================================== */}
          {/* GRÁFICA DE EVOLUCIÓN TEMPORAL APILADA (TIMELINE 5 AÑOS) */}
          {/* ======================================================== */}
          {simulacionUnificada && simulacionUnificada.timelineAgregado && (
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center space-x-2">
                    <Activity className="w-5 h-5 text-indigo-600" />
                    <span>Proyección de Carga Mensual Agregada (Lo que hay + Lo que habrá)</span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    Evolución mes a mes del pago de cuotas a lo largo de los próximos 5 años
                  </p>
                </div>

                <div className="flex items-center space-x-2 text-xs">
                  <span className="flex items-center space-x-1 text-slate-500">
                    <span className="w-3 h-3 rounded-full bg-slate-400 inline-block" />
                    <span>Deudas Actuales</span>
                  </span>
                  <span className="flex items-center space-x-1 text-indigo-600 font-bold">
                    <span className="w-3 h-3 rounded-full bg-indigo-600 inline-block" />
                    <span>{formUnified.nombre}</span>
                  </span>
                </div>
              </div>

              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart 
                    data={simulacionUnificada.timelineAgregado.filter((_, idx) => idx % 3 === 0)} 
                    margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${v}€`} />
                    <Tooltip 
                      formatter={(val) => [formatCurrency(val), '']}
                      contentStyle={{ 
                        backgroundColor: 'rgba(15, 23, 42, 0.9)', 
                        border: 'none', 
                        borderRadius: '12px', 
                        color: '#fff', 
                        fontSize: '12px' 
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }} />
                    <Bar dataKey="cuotasExistentes" name="Cuotas Existentes" stackId="a" fill="#94a3b8" radius={[0, 0, 0, 0]} />
                    <Bar dataKey="cuotaNuevoCredito" name={formUnified.nombre || 'Este Pasivo'} stackId="a" fill="#6366f1" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* CUADRO DE AMORTIZACIÓN DEL PRÉSTAMO CONFIGURADO */}
          {/* ======================================================== */}
          {simulacionUnificada && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center space-x-2">
                    <Table className="w-5 h-5 text-indigo-600" />
                    <span>Cuadro de Amortización & Desglose de Intereses</span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    Desglose de amortización de capital, intereses devengados y saldo vivo
                  </p>
                </div>

                <div className="flex items-center space-x-2">
                  <div className="flex items-center space-x-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setCuadroViewMode('anual')}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                        cuadroViewMode === 'anual'
                          ? 'bg-white dark:bg-slate-900 text-indigo-600 shadow-sm'
                          : 'text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      Resumen Anual
                    </button>
                    <button
                      type="button"
                      onClick={() => setCuadroViewMode('mensual')}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                        cuadroViewMode === 'mensual'
                          ? 'bg-white dark:bg-slate-900 text-indigo-600 shadow-sm'
                          : 'text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      Detalle Mensual ({simulacionUnificada.schedule?.length || 0} meses)
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={handleExportUnifiedCSV}
                    className="flex items-center space-x-1 px-3 py-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 rounded-xl border border-emerald-200 dark:border-emerald-800 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Descargar CSV</span>
                  </button>
                </div>
              </div>

              {/* TABLA ANUAL */}
              {cuadroViewMode === 'anual' && (
                <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 uppercase font-bold border-b border-slate-200 dark:border-slate-800">
                      <tr>
                        <th className="px-4 py-3">Año</th>
                        <th className="px-4 py-3 text-right">Cuotas Totales (€)</th>
                        <th className="px-4 py-3 text-right">Capital Amortizado (€)</th>
                        <th className="px-4 py-3 text-right">Intereses Pagados (€)</th>
                        <th className="px-4 py-3 text-right">Saldo a Fin de Año (€)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                      {simulacionUnificada.resumenAnual?.map((y, idx) => (
                        <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                          <td className="px-4 py-3 font-bold text-slate-900 dark:text-white flex items-center space-x-1.5">
                            <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                            <span>{y.ano}</span>
                          </td>
                          <td className="px-4 py-3 text-right font-bold text-slate-900 dark:text-white">
                            {formatCurrency(y.cuotasPagadas)}
                          </td>
                          <td className="px-4 py-3 text-right font-bold text-emerald-600 dark:text-emerald-400">
                            +{formatCurrency(y.capitalAmortizado)}
                          </td>
                          <td className="px-4 py-3 text-right font-bold text-rose-600 dark:text-rose-400">
                            {formatCurrency(y.interesesPagados)}
                          </td>
                          <td className="px-4 py-3 text-right font-extrabold text-indigo-600 dark:text-indigo-400">
                            {formatCurrency(y.saldoFinAno)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-slate-100/70 dark:bg-slate-800/80 font-black text-slate-900 dark:text-white border-t border-slate-200 dark:border-slate-800">
                      <tr>
                        <td className="px-4 py-3 uppercase">Total Préstamo</td>
                        <td className="px-4 py-3 text-right">{formatCurrency(resUnificado.totalCoste)}</td>
                        <td className="px-4 py-3 text-right text-emerald-600 dark:text-emerald-400">{formatCurrency(formUnified.capital_pendiente)}</td>
                        <td className="px-4 py-3 text-right text-rose-600 dark:text-rose-400">{formatCurrency(resUnificado.totalIntereses)}</td>
                        <td className="px-4 py-3 text-right text-indigo-600 dark:text-indigo-400">0,00 €</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}

              {/* TABLA MENSUAL */}
              {cuadroViewMode === 'mensual' && (
                <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 max-h-80 overflow-y-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="sticky top-0 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 uppercase font-bold border-b border-slate-200 dark:border-slate-800 z-10">
                      <tr>
                        <th className="px-3 py-2.5">Mes</th>
                        <th className="px-3 py-2.5 text-right">Cuota (€)</th>
                        <th className="px-3 py-2.5 text-right">Amortización Capital (€)</th>
                        <th className="px-3 py-2.5 text-right">Intereses (€)</th>
                        <th className="px-3 py-2.5 text-right">Saldo Restante (€)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                      {simulacionUnificada.schedule?.map((m, idx) => (
                        <tr key={idx} className="hover:bg-indigo-50/30 transition-colors">
                          <td className="px-3 py-2 font-semibold text-slate-600 dark:text-slate-300 flex items-center space-x-1.5">
                            <span>Mes #{m.mes}</span>
                            {m.fecha && (
                              <span className="text-[10px] text-slate-400 font-mono">
                                ({m.fecha.substring(0, 7)})
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-right font-bold text-slate-900 dark:text-white">
                            {formatCurrency(m.cuotaTotal)}
                          </td>
                          <td className="px-3 py-2 text-right font-semibold text-emerald-600 dark:text-emerald-400">
                            +{formatCurrency(m.amortizacionCapital)}
                          </td>
                          <td className="px-3 py-2 text-right font-semibold text-rose-600 dark:text-rose-400">
                            {formatCurrency(m.pagoIntereses)}
                          </td>
                          <td className="px-3 py-2 text-right font-extrabold text-indigo-600 dark:text-indigo-400">
                            {formatCurrency(m.saldoRestante)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

            </div>
          )}

        </form>
      )}

      {/* ======================================================== */}
      {/* 2. PESTAÑA: CARTERA DE PASIVOS & CUADROS DE AMORTIZACIÓN */}
      {/* ======================================================== */}
      {activeTab === 'pasivos' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                <Database className="w-5 h-5 text-indigo-600" />
                <span>Cartera de Pasivos & Cuadros de Amortización</span>
              </h2>
              <p className="text-xs text-slate-500">
                Consulta tus préstamos vivos, abre sus cuadros de amortización integrales o edítalos en el diseñador unificado.
              </p>
            </div>
            <button
              onClick={() => {
                handleSelectPreset(PRESETS_PASIVO[0]);
                setActiveTab('diseñador_integral');
              }}
              className="flex items-center space-x-1.5 px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-md shadow-indigo-600/20 transition-all self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" />
              <span>Diseñar / Añadir Pasivo</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {pasivos.map(p => {
              const amortizado = p.totalAmortizado !== undefined ? p.totalAmortizado : Math.max(0, (Number(p.capital_inicial) || 0) - (Number(p.capital_pendiente) || 0));
              const pct = Number(p.capital_inicial) > 0 ? Number(((amortizado / p.capital_inicial) * 100).toFixed(1)) : 0;
              const isExpanded = !!expandedHistories[p.id];
              const historyList = p.historialIntereses || [];
              const startYear = p.fecha_inicio ? p.fecha_inicio.split('-')[0] : '2015';
              const esSinInteres = p.tipo_interes_modalidad === 'cero' || p.interes_nominal_anual === 0;

              return (
                <div 
                  key={p.id}
                  className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4"
                >
                  {/* Cabecera Tarjeta */}
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-bold text-lg text-slate-900 dark:text-white">{p.nombre}</h3>
                      <div className="flex flex-wrap items-center gap-1.5 mt-1">
                        <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 capitalize">
                          {p.tipo}
                        </span>
                        
                        {esSinInteres ? (
                          <span className="text-xs font-bold px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 flex items-center">
                            <HeartHandshake className="w-3 h-3 mr-1" />
                            0% Sin Interés (Familiar)
                          </span>
                        ) : (
                          <span className="text-xs font-bold px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300">
                            {p.interes_nominal_anual}% TIN ({p.tipo_interes_modalidad || 'variable'})
                          </span>
                        )}

                        {!esSinInteres && p.diferencial_euribor > 0 && (
                          <span className="text-xs font-bold px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300">
                            Dif: +{p.diferencial_euribor}%
                          </span>
                        )}

                        {!esSinInteres && p.mes_revision && (
                          <span className="text-xs font-bold px-2 py-0.5 rounded bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 flex items-center">
                            <RotateCw className="w-3 h-3 mr-1" />
                            Revisión: {p.mes_revision} ({p.frecuencia_revision || 'Anual'})
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() => setSelectedCuadroPasivo({ id: p.id, nombre: p.nombre })}
                        className="p-2 rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition-colors"
                        title="Ver Cuadro Completo de Amortizaciones e Intereses"
                      >
                        <Table className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleLoadPasivoToDesigner(p)}
                        className="p-2 rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition-colors"
                        title="Editar en el Diseñador Unificado"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeletePasivo(p.id)}
                        className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                        title="Eliminar pasivo"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Barra de Progreso de Amortización */}
                  <div className="space-y-1.5 pt-1">
                    <div className="flex justify-between text-xs">
                      <span className="font-semibold text-slate-500">Progreso Amortizado</span>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400">
                        {pct}% pagado
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-indigo-500 to-emerald-500 rounded-full transition-all duration-500" 
                        style={{ width: `${Math.min(pct, 100)}%` }} 
                      />
                    </div>
                  </div>

                  {/* Datos Clave: Cuándo empezó, Saldo Vivo a día de hoy, Cuota */}
                  <div className="grid grid-cols-2 gap-3 p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl text-xs">
                    <div>
                      <span className="text-slate-400 block">Saldo Vivo a Día de Hoy:</span>
                      <strong className="text-base font-black text-slate-900 dark:text-white">
                        {formatCurrency(p.capital_pendiente)}
                      </strong>
                      <span className="text-[10px] text-slate-400 block mt-0.5">
                        Amortizados: {formatCurrency(amortizado)}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-400 block">Cuota Mensual Actual:</span>
                      <strong className="text-base font-black text-indigo-600 dark:text-indigo-400">
                        {formatCurrency(p.cuota_mensual)}
                      </strong>
                      <span className="text-[10px] text-slate-400 block mt-0.5">
                        Restan {p.mesesRestantes || 0} meses {p.mesesRestantes > 0 && `(${Math.floor(p.mesesRestantes / 12)}a ${p.mesesRestantes % 12}m)`}
                      </span>
                    </div>

                    <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
                      <span className="text-slate-400 block flex items-center space-x-1">
                        <Clock className="w-3 h-3" />
                        <span>Empezó:</span>
                      </span>
                      <strong className="text-slate-700 dark:text-slate-300">
                        {formatDate(p.fecha_inicio) || 'No definida'}
                      </strong>
                      <span className="text-[10px] text-slate-400 block">
                        Capital inicial: {formatCurrency(p.capital_inicial)}
                      </span>
                    </div>

                    <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
                      <span className="text-slate-400 block flex items-center space-x-1">
                        <Calendar className="w-3 h-3" />
                        <span>Fin Previsto:</span>
                      </span>
                      <strong className="text-slate-700 dark:text-slate-300">
                        {formatDate(p.fecha_fin_prevista) || 'No definida'}
                      </strong>
                      {!esSinInteres && p.proxima_revision_fecha && (
                        <span className="text-[10px] text-amber-600 dark:text-amber-400 block font-semibold">
                          Próx. revisión: {formatDate(p.proxima_revision_fecha)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Botón de acceso directo al Cuadro de Amortización */}
                  <div className="pt-1">
                    <button
                      onClick={() => setSelectedCuadroPasivo({ id: p.id, nombre: p.nombre })}
                      className="w-full flex items-center justify-center space-x-2 py-2 px-3 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 text-xs font-bold border border-indigo-200/60 dark:border-indigo-800/60 transition-colors"
                    >
                      <Table className="w-3.5 h-3.5" />
                      <span>Ver Cuadro de Amortización + Intereses</span>
                    </button>
                  </div>

                  {/* SERIE HISTÓRICA DEL ÍNDICE DESDE EL INICIO (SOLO SI TIENE INTERÉS VARIABLE) */}
                  {!esSinInteres && historyList.length > 0 && (
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-1.5 text-xs font-bold text-slate-700 dark:text-slate-200">
                          <History className="w-3.5 h-3.5 text-indigo-500" />
                          <span>Evolución {p.indice_referencia || 'Euríbor'} ({startYear} - 2026):</span>
                        </div>
                        
                        <button
                          onClick={() => toggleExpandHistory(p.id)}
                          className="flex items-center space-x-1 text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                        >
                          <span>{isExpanded ? 'Ver menos' : `Ver los ${historyList.length} años`}</span>
                          {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                        </button>
                      </div>

                      {/* Lista resumida o expandida */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {(isExpanded ? historyList : historyList.slice(-4)).map((h, hIdx) => {
                          const valIndice = h.euribor !== undefined ? h.euribor : (h.indice !== undefined ? h.indice : '—');
                          return (
                            <div 
                              key={hIdx}
                              className="p-2 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40 text-xs space-y-0.5"
                            >
                              <div className="flex justify-between items-center">
                                <span className="font-bold text-indigo-950 dark:text-indigo-200">{h.ano}</span>
                                <div className="text-right">
                                  <span className="font-black text-indigo-600 dark:text-indigo-400 text-sm block">{h.interes}% TIN</span>
                                  {h.cuota && (
                                    <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400">
                                      {formatCurrency(h.cuota)}/mes
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="text-[10px] text-slate-500 flex justify-between">
                                <span>{p.indice_referencia?.slice(0, 7) || 'Índice'}: {valIndice !== '—' ? `${valIndice}%` : '—'}</span>
                                <span className="font-semibold text-slate-700 dark:text-slate-300">Dif: +{h.diferencial !== undefined ? h.diferencial : (p.diferencial_euribor || 0.75)}%</span>
                              </div>
                              {h.notas && <p className="text-[10px] text-slate-400 italic pt-0.5">{h.notas}</p>}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {p.notas && (
                    <p className="text-xs text-slate-500 bg-slate-50 dark:bg-slate-800/40 p-2 rounded-lg italic">
                      {p.notas}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 3. PESTAÑA: AMORTIZACIÓN EXTRAORDINARIA & HACIENDA */}
      {/* ======================================================== */}
      {activeTab === 'amortizacion' && (
        <div className="space-y-6">
          
          {/* Panel de Controles del Escenario */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                  <Scale className="w-5 h-5 text-indigo-600" />
                  <span>Configurar Escenario de Amortización Anticipada</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Selecciona el pasivo que deseas simular y ajusta amortizaciones extraordinarias o variaciones de tipo
                </p>
              </div>

              {/* Selector de Pasivo y Botón Ver Cuadro */}
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={selectedPasivoId || ''}
                  onChange={(e) => {
                    const id = Number(e.target.value);
                    setSelectedPasivoId(id);
                    const sel = pasivos.find(p => p.id === id);
                    if (sel) setNuevoInteresAmort(sel.interes_nominal_anual);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                >
                  {pasivos.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.nombre} ({formatCurrency(p.capital_pendiente)} a día de hoy)
                    </option>
                  ))}
                </select>

                {currentSelectedPasivo && (
                  <button
                    onClick={() => setSelectedCuadroPasivo({ id: currentSelectedPasivo.id, nombre: currentSelectedPasivo.nombre })}
                    className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 border border-indigo-200 dark:border-indigo-800 transition-colors"
                  >
                    <Table className="w-3.5 h-3.5" />
                    <span>Ver Cuadro Vida</span>
                  </button>
                )}
              </div>
            </div>

            {currentSelectedPasivo && (
              <>
                {/* Resumen de Situación a Día de Hoy del Pasivo Seleccionado */}
                <div className="p-4 rounded-xl bg-indigo-50/40 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40 grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <span className="text-slate-400 block">Fecha Inicio:</span>
                    <strong className="text-slate-800 dark:text-slate-200 text-sm">
                      {formatDate(currentSelectedPasivo.fecha_inicio)}
                    </strong>
                    {currentSelectedPasivo.mes_revision && currentSelectedPasivo.interes_nominal_anual > 0 && (
                      <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 block mt-0.5 flex items-center">
                        <RotateCw className="w-3 h-3 mr-1" />
                        Revisión: {currentSelectedPasivo.mes_revision} ({currentSelectedPasivo.frecuencia_revision || 'Anual'})
                      </span>
                    )}
                    {currentSelectedPasivo.interes_nominal_anual === 0 && (
                      <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 block mt-0.5 flex items-center">
                        <HeartHandshake className="w-3 h-3 mr-1" />
                        Préstamo Sin Intereses (0%)
                      </span>
                    )}
                  </div>
                  <div>
                    <span className="text-slate-400 block">Capital Inicial:</span>
                    <strong className="text-slate-800 dark:text-slate-200 text-sm">
                      {formatCurrency(currentSelectedPasivo.capital_inicial)}
                    </strong>
                    {currentSelectedPasivo.diferencial_euribor > 0 && (
                      <span className="text-[10px] text-slate-400 block mt-0.5">
                        Diferencial: +{currentSelectedPasivo.diferencial_euribor}%
                      </span>
                    )}
                  </div>
                  <div>
                    <span className="text-slate-400 block">Saldo Vivo a Día de Hoy:</span>
                    <strong className="text-indigo-600 dark:text-indigo-400 text-sm font-black">
                      {formatCurrency(currentSelectedPasivo.capital_pendiente)}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Progreso Amortizado:</span>
                    <strong className="text-emerald-600 dark:text-emerald-400 text-sm font-bold">
                      {currentProgresoPct}% ({formatCurrency(currentAmortizado)})
                    </strong>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  
                  {/* 1. Amortización Extraordinaria */}
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-2">
                    <label className="text-xs font-bold uppercase text-slate-500 block">
                      Amortización Anticipada (€)
                    </label>
                    <input
                      type="number"
                      step="500"
                      min="0"
                      max={currentSelectedPasivo.capital_pendiente}
                      value={amortizacionExtra}
                      onChange={(e) => setAmortizacionExtra(Math.max(0, parseFloat(e.target.value) || 0))}
                      className="w-full px-3 py-2 text-sm font-bold rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                    />
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {[1000, 3000, 5000].map(amt => (
                        <button
                          key={amt}
                          type="button"
                          onClick={() => setAmortizacionExtra(amt)}
                          className="px-2 py-0.5 text-[11px] font-semibold rounded-lg bg-slate-200 dark:bg-slate-700 hover:bg-indigo-100 hover:text-indigo-600 transition-colors"
                        >
                          {amt.toLocaleString('es-ES')} €
                        </button>
                      ))}

                      {topeOptimoPV > 0 && (
                        <button
                          type="button"
                          onClick={() => setAmortizacionExtra(topeOptimoPV)}
                          className="px-2.5 py-0.5 text-[11px] font-bold rounded-lg bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200 hover:bg-amber-200 border border-amber-300 dark:border-amber-700 transition-colors"
                          title={`Tope PV: ${baseLimitePV.toLocaleString('es-ES')} € (${numeroTitulares} titular${numeroTitulares > 1 ? 'es' : ''}) menos ${cuotasAnualesBase.toLocaleString('es-ES')} € cuotas anuales = ${topeOptimoPV.toLocaleString('es-ES')} €`}
                        >
                          🎯 Tope PV ({topeOptimoPV.toLocaleString('es-ES')} €)
                        </button>
                      )}

                      {topeOptimoEstatal > 0 && (
                        <button
                          type="button"
                          onClick={() => setAmortizacionExtra(topeOptimoEstatal)}
                          className="px-2.5 py-0.5 text-[11px] font-bold rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 hover:bg-slate-300 transition-colors"
                          title={`Tope Estatal: ${baseLimiteEstatal.toLocaleString('es-ES')} € (${numeroTitulares} titular${numeroTitulares > 1 ? 'es' : ''}) menos ${cuotasAnualesBase.toLocaleString('es-ES')} € cuotas anuales = ${topeOptimoEstatal.toLocaleString('es-ES')} €`}
                        >
                          🎯 Tope Estatal ({topeOptimoEstatal.toLocaleString('es-ES')} €)
                        </button>
                      )}
                    </div>
                    {cuotasAnualesBase > 0 && (
                      <p className="text-[10px] text-slate-400">
                        * Los botones de Tope IRPF ya descuentan tus {formatCurrency(cuotasAnualesBase)} de cuotas anuales ({numeroTitulares} titular{numeroTitulares > 1 ? 'es' : ''} = {formatCurrency(regimenFiscal === 'pais_vasco' ? baseLimitePV : baseLimiteEstatal)} de base máxima).
                      </p>
                    )}
                  </div>

                  {/* 2. Modalidad: Reducir Plazo vs Cuota */}
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-2">
                    <label className="text-xs font-bold uppercase text-slate-500 block">
                      Modalidad de Impacto
                    </label>
                    <div className="grid grid-cols-2 gap-1.5 pt-1">
                      <button
                        type="button"
                        onClick={() => setModalidadAmort('reducir_plazo')}
                        className={`py-2 px-2 rounded-lg text-xs font-bold text-center transition-all ${
                          modalidadAmort === 'reducir_plazo'
                            ? 'bg-indigo-600 text-white shadow-sm'
                            : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        Reducir Plazo
                      </button>
                      <button
                        type="button"
                        onClick={() => setModalidadAmort('reducir_cuota')}
                        className={`py-2 px-2 rounded-lg text-xs font-bold text-center transition-all ${
                          modalidadAmort === 'reducir_cuota'
                            ? 'bg-indigo-600 text-white shadow-sm'
                            : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        Reducir Cuota
                      </button>
                    </div>
                    <p className="text-[10px] text-slate-400">
                      {modalidadAmort === 'reducir_plazo' 
                        ? 'Ahorra intereses y cancela antes el préstamo.' 
                        : 'Reduce la cuota mensual liberando dinero cada mes.'}
                    </p>
                  </div>

                  {/* 3. Simular Variación de Tipos de Interés */}
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-bold uppercase text-slate-500">Nuevo Tipo Interés (TIN)</label>
                      <span className="text-xs font-bold text-slate-400">Actual: {currentSelectedPasivo.interes_nominal_anual}%</span>
                    </div>
                    <input
                      type="number"
                      step="0.05"
                      min="0"
                      max="15"
                      value={nuevoInteresAmort}
                      onChange={(e) => setNuevoInteresAmort(e.target.value)}
                      placeholder={`${currentSelectedPasivo.interes_nominal_anual}%`}
                      className="w-full px-3 py-2 text-sm font-bold rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                    />
                    <p className="text-[10px] text-slate-400">
                      Modifica el % para proyectar revisiones de tipos.
                    </p>
                  </div>

                  {/* 4. Módulo Fiscal Hacienda / IRPF */}
                  <div className="p-4 rounded-xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/60 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold uppercase text-amber-800 dark:text-amber-300 flex items-center space-x-1">
                        <Receipt className="w-3.5 h-3.5" />
                        <span>Desgravación IRPF</span>
                      </label>
                      <input
                        type="checkbox"
                        checked={esViviendaHabitual}
                        onChange={(e) => setEsViviendaHabitual(e.target.checked)}
                        className="rounded accent-amber-600 w-4 h-4 cursor-pointer"
                      />
                    </div>

                    <div className="space-y-1">
                      <select
                        disabled={!esViviendaHabitual}
                        value={regimenFiscal}
                        onChange={(e) => setRegimenFiscal(e.target.value)}
                        className="w-full px-2 py-1.5 text-xs font-semibold rounded-lg bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-800 text-slate-900 dark:text-white disabled:opacity-50"
                      >
                        <option value="pais_vasco">País Vasco / Bizkaia (18% deducción)</option>
                        <option value="general">Régimen Estatal AEAT (15% deducción)</option>
                      </select>
                    </div>

                    {/* Selector de Titulares */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase text-slate-500">Titulares Hipoteca</span>
                        <span className="text-[10px] font-black text-amber-800 dark:text-amber-300">
                          {regimenFiscal === 'pais_vasco' ? `${(8500 * numeroTitulares).toLocaleString('es-ES')} € max` : `${(9040 * numeroTitulares).toLocaleString('es-ES')} € max`}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-1">
                        <button
                          type="button"
                          disabled={!esViviendaHabitual}
                          onClick={() => setNumeroTitulares(1)}
                          className={`py-1 px-1.5 rounded-lg text-[11px] font-bold text-center transition-all ${
                            numeroTitulares === 1
                              ? 'bg-amber-600 text-white shadow-sm'
                              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-amber-200 dark:border-amber-800/60'
                          } disabled:opacity-50`}
                        >
                          1 Titular
                        </button>
                        <button
                          type="button"
                          disabled={!esViviendaHabitual}
                          onClick={() => setNumeroTitulares(2)}
                          className={`py-1 px-1.5 rounded-lg text-[11px] font-bold text-center transition-all ${
                            numeroTitulares === 2
                              ? 'bg-amber-600 text-white shadow-sm'
                              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-amber-200 dark:border-amber-800/60'
                          } disabled:opacity-50`}
                        >
                          2 Cotitulares (2x)
                        </button>
                      </div>
                    </div>

                    <p className="text-[10px] text-amber-700/80 dark:text-amber-400">
                      {esViviendaHabitual 
                        ? (numeroTitulares === 2 
                            ? 'Al tener 2 cotitulares el límite fiscal conjunto se duplica (hasta 17.000 €/año).' 
                            : 'Límite anual computado para 1 titular individual.')
                        : 'Desactivado para este préstamo.'}
                    </p>
                  </div>

                </div>
              </>
            )}
          </div>

          {/* Resultados del Escenario Simulado */}
          {escenarioResult && (
            <div className="space-y-4 animate-fadeIn">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                
                {/* Ahorro de Intereses */}
                <div className="p-5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50">
                  <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">Ahorro Total en Intereses</span>
                  <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                    +{formatCurrency(escenarioResult.simulado.ahorroIntereses)}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Total intereses nuevos: {formatCurrency(escenarioResult.simulado.totalIntereses)} (antes {formatCurrency(escenarioResult.original.totalIntereses)})
                  </p>
                </div>

                {/* Impacto en Tiempo o Cuota */}
                <div className="p-5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800/50">
                  <span className="text-xs font-semibold text-indigo-700 dark:text-indigo-300">
                    {modalidadAmort === 'reducir_plazo' ? 'Tiempo Adelantado' : 'Nueva Cuota Mensual'}
                  </span>
                  <p className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-1">
                    {modalidadAmort === 'reducir_plazo' 
                      ? `-${escenarioResult.simulado.mesesAhorrados} meses (${escenarioResult.simulado.anosAhorrados} años)` 
                      : formatCurrency(escenarioResult.simulado.cuotaMensual)}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    {modalidadAmort === 'reducir_plazo' 
                      ? `Finaliza en ${escenarioResult.simulado.mesesRestantes} meses en vez de ${escenarioResult.original.mesesRestantes}` 
                      : `Ahorro mensual de +${formatCurrency(escenarioResult.simulado.ahorroCuotaMensual)}/mes`}
                  </p>
                </div>

                {/* Devolución Hacienda IRPF */}
                <div className="p-5 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-amber-700 dark:text-amber-300">Retorno Fiscal IRPF (Hacienda)</span>
                    {esViviendaHabitual && (
                      <span className="px-1.5 py-0.5 text-[9px] font-black rounded-full bg-amber-200 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200">
                        {numeroTitulares} {numeroTitulares > 1 ? 'Titulares (2x)' : 'Titular'}
                      </span>
                    )}
                  </div>
                  <p className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">
                    {esViviendaHabitual ? `+${formatCurrency(escenarioResult.desgravacionHacienda?.ahorroFiscalAnual || 0)}` : '0,00 €'}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    {esViviendaHabitual 
                      ? `Deducción del ${escenarioResult.desgravacionHacienda?.tipoDeduccionPct || 18}% sobre ${formatCurrency(escenarioResult.desgravacionHacienda?.baseComputable || 0)} aportados (máx. ${formatCurrency(escenarioResult.desgravacionHacienda?.baseMaximaDeducible || 8500)})` 
                      : 'Préstamo no deducible en IRPF'}
                  </p>
                </div>

                {/* Saldo Restante tras Aportación */}
                <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                  <span className="text-xs font-semibold text-slate-500">Nuevo Saldo Vivo Pendiente</span>
                  <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                    {formatCurrency(escenarioResult.simulado.capitalPendiente)}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Tras amortizar {formatCurrency(amortizacionExtra)}
                  </p>
                </div>

              </div>

              {/* BANNER CTA: REGISTRAR Y CARGAR AMORTIZACIÓN EN CUENTA */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 text-white shadow-xl">
                <div>
                  <div className="flex items-center space-x-2">
                    <Sparkles className="w-5 h-5 text-amber-400 shrink-0" />
                    <h4 className="text-sm sm:text-base font-black">
                      ¿Deseas aplicar esta amortización de {formatCurrency(amortizacionExtra)} en tu banco?
                    </h4>
                  </div>
                  <p className="text-xs text-indigo-200 mt-1">
                    Se descontará el dinero de tu cuenta bancaria seleccionada, reducirá el saldo vivo de {currentSelectedPasivo?.nombre} y quedará registrado el apunte contable.
                  </p>
                </div>

                <button
                  type="button"
                  disabled={amortizacionExtra <= 0 || !currentSelectedPasivo || amortizacionExtra > currentSelectedPasivo.capital_pendiente}
                  onClick={() => {
                    setAmortForm({
                      cuentaId: cuentas[0]?.id || '',
                      fecha: new Date().toISOString().split('T')[0],
                      notas: `Amortización extraordinaria de ${formatCurrency(amortizacionExtra)} en ${currentSelectedPasivo?.nombre}`
                    });
                    setIsAmortModalOpen(true);
                  }}
                  className="flex items-center justify-center space-x-2 px-5 py-3 rounded-xl text-xs sm:text-sm font-black bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-lg shadow-emerald-500/30 transition-all shrink-0 disabled:opacity-50"
                >
                  <Zap className="w-4 h-4" />
                  <span>⚡ Registrar Amortización en Cuenta</span>
                </button>
              </div>
            </div>
          )}

          {/* Gráfica Comparativa de Extinción */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base text-slate-900 dark:text-white">
                  Comparativa de Curvas de Amortización
                </h3>
                <p className="text-xs text-slate-500">
                  Plan Original (gris) vs Plan Simulado con amortización y tipos (morado)
                </p>
              </div>
              {simulating && (
                <div className="flex items-center space-x-1 text-xs text-indigo-600 dark:text-indigo-400">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Calculando...</span>
                </div>
              )}
            </div>

            {chartDataAmort.length > 0 ? (
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartDataAmort} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="origGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#94a3b8" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#94a3b8" stopOpacity={0.0}/>
                      </linearGradient>
                      <linearGradient id="simGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.5}/>
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v/1000).toFixed(0)}k€`} />
                    <Tooltip 
                      formatter={(val) => [formatCurrency(val), '']}
                      contentStyle={{ 
                        backgroundColor: 'rgba(15, 23, 42, 0.9)', 
                        border: 'none', 
                        borderRadius: '12px', 
                        color: '#fff', 
                        fontSize: '12px' 
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }} />
                    <Area type="monotone" dataKey="saldoOriginal" name="Saldo Plan Original" stroke="#94a3b8" strokeWidth={2} fillOpacity={1} fill="url(#origGrad)" />
                    <Area type="monotone" dataKey="saldoSimulado" name="Saldo Plan Simulado" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#simGrad)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-64 flex flex-col items-center justify-center text-center p-6 bg-slate-50 dark:bg-slate-800/30 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
                <Scale className="w-8 h-8 text-slate-400 mb-2" />
                <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">Generando curva de amortización...</p>
                <p className="text-xs text-slate-400 mt-1">Selecciona un pasivo arriba para visualizar la comparativa de extinción</p>
              </div>
            )}
          </div>

        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL DEL CUADRO DE AMORTIZACIÓN COMPLETO */}
      {/* ======================================================== */}
      {selectedCuadroPasivo && (
        <CuadroAmortizacionModal
          pasivoId={selectedCuadroPasivo.id}
          pasivoNombre={selectedCuadroPasivo.nombre}
          onClose={() => setSelectedCuadroPasivo(null)}
        />
      )}

      {/* ======================================================== */}
      {/* MODAL DE CONFIRMACIÓN Y CARGO DE AMORTIZACIÓN EN CUENTA */}
      {/* ======================================================== */}
      {isAmortModalOpen && currentSelectedPasivo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl max-w-lg w-full p-6 space-y-5 animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl">
                  <Zap className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Aplicar Amortización Extraordinaria
                  </h3>
                  <p className="text-xs text-slate-500">
                    {currentSelectedPasivo.nombre}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsAmortModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Resumen del Cargo */}
            <div className="grid grid-cols-2 gap-3 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60">
              <div>
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Importe a Descontar</span>
                <p className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
                  {formatCurrency(amortizacionExtra)}
                </p>
              </div>
              <div>
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Modalidad</span>
                <p className="text-sm font-bold text-slate-800 dark:text-slate-200 mt-1">
                  {modalidadAmort === 'reducir_plazo' ? 'Reducción de Plazo' : 'Reducción de Cuota'}
                </p>
              </div>
              <div>
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Nuevo Saldo Deuda</span>
                <p className="text-sm font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                  {formatCurrency(Math.max(0, currentSelectedPasivo.capital_pendiente - amortizacionExtra))}
                </p>
              </div>
              <div>
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  {modalidadAmort === 'reducir_plazo' ? 'Ahorro Tiempo' : 'Nueva Cuota'}
                </span>
                <p className="text-sm font-bold text-indigo-600 dark:text-indigo-400 mt-0.5">
                  {modalidadAmort === 'reducir_plazo'
                    ? `-${escenarioResult?.simulado?.mesesAhorrados || 0} meses`
                    : formatCurrency(escenarioResult?.simulado?.cuotaMensual || 0)}
                </p>
              </div>
            </div>

            {/* Selector de Cuenta Bancaria */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Cuenta Bancaria de Origen
              </label>
              <select
                value={amortForm.cuentaId}
                onChange={(e) => setAmortForm(prev => ({ ...prev, cuentaId: e.target.value }))}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none"
              >
                {cuentas.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.nombre} ({formatCurrency(c.saldo_actual || 0)})
                  </option>
                ))}
              </select>
            </div>

            {/* Fecha del movimiento */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Fecha de la Operación
              </label>
              <input
                type="date"
                value={amortForm.fecha}
                onChange={(e) => setAmortForm(prev => ({ ...prev, fecha: e.target.value }))}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>

            {/* Concepto / Notas */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Concepto / Notas del Movimiento
              </label>
              <input
                type="text"
                value={amortForm.notas}
                onChange={(e) => setAmortForm(prev => ({ ...prev, notas: e.target.value }))}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                placeholder="Ej. Amortización extraordinaria..."
              />
            </div>

            {/* Acciones */}
            <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsAmortModalOpen(false)}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={handleConfirmAmortizacion}
                className="flex items-center space-x-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-lg shadow-emerald-500/25 transition-all disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                <span>Confirmar y Descontar</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
