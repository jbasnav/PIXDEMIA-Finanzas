import React, { useState } from 'react';
import { 
  Landmark, 
  TrendingUp, 
  TrendingDown, 
  ArrowRight, 
  Calendar, 
  Sparkles, 
  CheckCircle2, 
  Clock, 
  ChevronRight,
  Eye,
  Layers,
  Wallet
} from 'lucide-react';
import { formatCurrency } from '../utils/formatters';

export default function AnnualTreasuryMatrix({ matrizData, onSelectMonth, selectedMonth, year = 2026 }) {
  const [showBankDetails, setShowBankDetails] = useState(true);
  const [bankBalanceMode, setBankBalanceMode] = useState('inicio'); // 'inicio', 'fin', 'ambos'

  if (!matrizData || !matrizData.meses || matrizData.meses.length === 0) {
    return null;
  }

  const { resumenAno, meses } = matrizData;

  const cuentasLiquid = resumenAno.cuentasDetalle && resumenAno.cuentasDetalle.length > 0
    ? resumenAno.cuentasDetalle
    : [
        { id: 1, nombre: 'Santander', color_hex: '#ec0000', saldoInicial2026: 6070.02 },
        { id: 2, nombre: 'Kutxa', color_hex: '#008080', saldoInicial2026: 3232.92 },
        { id: 3, nombre: 'N26', color_hex: '#36a18b', saldoInicial2026: 15.31 }
      ];

  // Formato compacto para números en la matriz (evita decimales innecesarios en la tabla para ganar espacio horizontal y no desbordar)
  const fmt = (val) => {
    if (val === null || val === undefined || val === 0) return '-';
    return Math.round(val).toLocaleString('es-ES') + '€';
  };

  const getSaldoInicial = (cta, m) => {
    if (m.saldosInicialesBancos && m.saldosInicialesBancos[cta.id] !== undefined) {
      return m.saldosInicialesBancos[cta.id];
    }
    if (cta.id === 1) return m.saldoInicialSantander;
    if (cta.id === 2) return m.saldoInicialKutxa;
    if (cta.id === 3) return m.saldoInicialN26;
    return m.numMes === 1 ? cta.saldoInicial2026 : 0;
  };

  const getSaldoFinal = (cta, m) => {
    if (m.saldosFinalesBancos && m.saldosFinalesBancos[cta.id] !== undefined) {
      return m.saldosFinalesBancos[cta.id];
    }
    if (cta.id === 1) return m.saldoFinalSantander;
    if (cta.id === 2) return m.saldoFinalKutxa;
    if (cta.id === 3) return m.saldoFinalN26;
    return 0;
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-4 sm:p-5 shadow-sm space-y-4 animate-fadeIn w-full overflow-hidden">
      {/* Cabecera del Panel Principal */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 border-b border-slate-100 dark:border-slate-800">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 uppercase tracking-wider flex items-center space-x-1">
              <Sparkles className="w-3 h-3" />
              <span>Plan de Tesorería Anual 2026</span>
            </span>
            <span className="text-[11px] text-slate-400 font-semibold hidden md:inline">
              Matriz Principal con Recálculo Dinámico
            </span>
          </div>
          <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white mt-1">
            Evolución de Saldos y Previsiones
          </h2>
        </div>

        {/* Selector de modo y toggle para desglose por banco */}
        <div className="flex items-center space-x-1.5 shrink-0">
          <div className="flex bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl text-[10px] font-bold border border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={() => { setShowBankDetails(true); setBankBalanceMode('inicio'); }}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                showBankDetails && bankBalanceMode === 'inicio' 
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 shadow-xs font-black' 
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
              title="Ver saldos de cada banco al inicio de cada mes (incluyendo apertura 1 de Enero)"
            >
              💼 A Inicio (Apertura)
            </button>
            <button
              type="button"
              onClick={() => { setShowBankDetails(true); setBankBalanceMode('fin'); }}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                showBankDetails && bankBalanceMode === 'fin' 
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 shadow-xs font-black' 
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
              title="Ver saldos de cada banco al cierre de cada mes"
            >
              🏦 A Fin (Cierre)
            </button>
            <button
              type="button"
              onClick={() => { setShowBankDetails(true); setBankBalanceMode('ambos'); }}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                showBankDetails && bankBalanceMode === 'ambos' 
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 shadow-xs font-black' 
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
              title="Ver ambos saldos (Inicio y Cierre) por banco"
            >
              🔄 Ambos
            </button>
          </div>

          <button
            onClick={() => setShowBankDetails(!showBankDetails)}
            className="flex items-center space-x-1 px-2.5 py-1.5 rounded-xl text-[10px] font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors border border-slate-200 dark:border-slate-700 cursor-pointer"
          >
            <Layers className="w-3.5 h-3.5 text-indigo-500" />
            <span>{showBankDetails ? 'Ocultar' : 'Ver Bancos'}</span>
          </button>
        </div>
      </div>

      {/* Tarjetas de Resumen Apertura vs Cierre */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
        {/* Saldo Inicial */}
        <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80 flex flex-col justify-between shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400">
              Saldo Apertura (1 Ene {year})
            </span>
            <Wallet className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <p className="text-sm sm:text-base xl:text-base 2xl:text-lg font-black text-slate-900 dark:text-white mt-1 whitespace-nowrap">
            {formatCurrency(resumenAno.saldoInicialLiquido)}
          </p>
          <p className="text-[9px] text-slate-500 dark:text-slate-400 mt-1 truncate" title={cuentasLiquid.map(c => `${c.nombre}: ${fmt(c.saldoInicial2026)}`).join(' | ')}>
            {cuentasLiquid.map(c => `${c.nombre}: ${fmt(c.saldoInicial2026)}`).join(' | ')}
          </p>
        </div>

        {/* Ingresos Totales (Reales + Previstos) */}
        <div className="p-3 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40 flex flex-col justify-between shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase text-emerald-800 dark:text-emerald-300">
              Total Ingresos {year}
            </span>
            <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <p className="text-sm sm:text-base xl:text-base 2xl:text-lg font-black text-emerald-600 dark:text-emerald-400 mt-1 whitespace-nowrap">
            +{formatCurrency(resumenAno.totalIngresosAno)}
          </p>
          <div className="flex items-center justify-between text-[9px] text-emerald-700 dark:text-emerald-300 mt-1 truncate">
            <span>Reales: {Math.round(resumenAno.totalIngresosRealesAno || 0).toLocaleString()}€</span>
            <span>Prev: {Math.round(resumenAno.totalIngresosPrevistosAno || 0).toLocaleString()}€</span>
          </div>
        </div>

        {/* Gastos Totales (Reales + Previstos) */}
        <div className="p-3 rounded-2xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 flex flex-col justify-between shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase text-rose-800 dark:text-rose-300">
              Total Gastos Anuales
            </span>
            <TrendingDown className="w-3.5 h-3.5 text-rose-600" />
          </div>
          <p className="text-sm sm:text-base xl:text-base 2xl:text-lg font-black text-rose-600 dark:text-rose-400 mt-1 whitespace-nowrap">
            -{formatCurrency(resumenAno.totalGastosAno)}
          </p>
          <div className="flex items-center justify-between text-[9px] text-rose-700 dark:text-rose-300 mt-1 truncate">
            <span>Reales: {Math.round(resumenAno.totalGastosRealesAno || 0).toLocaleString()}€</span>
            <span>Prev: {Math.round(resumenAno.totalGastosPrevistosAno || 0).toLocaleString()}€</span>
          </div>
        </div>

        {/* Ahorro Neto Previsto */}
        <div className="p-3 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-900/40 flex flex-col justify-between shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase text-indigo-800 dark:text-indigo-300">
              Ahorro Neto Anual
            </span>
            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
          </div>
          <p className={`text-sm sm:text-base xl:text-base 2xl:text-lg font-black mt-1 whitespace-nowrap ${resumenAno.ahorroNetoProyectado >= 0 ? 'text-indigo-600 dark:text-indigo-400' : 'text-rose-600'}`}>
            {formatCurrency(resumenAno.ahorroNetoProyectado)}
          </p>
          <p className="text-[9px] text-indigo-700 dark:text-indigo-300 mt-1 truncate">
            + {Math.round(resumenAno.totalInvertidoAno || 0).toLocaleString()}€ en Fondos/EPSV
          </p>
        </div>

        {/* Saldo Cierre Proyectado */}
        <div className="p-3 rounded-2xl bg-gradient-to-br from-slate-900 to-indigo-950 text-white border border-slate-700 shadow-md col-span-2 sm:col-span-1 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase text-indigo-200">
              Saldo Cierre (31 Dic {year})
            </span>
            <Landmark className="w-3.5 h-3.5 text-indigo-300" />
          </div>
          <p className="text-sm sm:text-base xl:text-base 2xl:text-lg font-black text-emerald-400 mt-1 whitespace-nowrap">
            {formatCurrency(resumenAno.saldoFinalProyectadoLiquido)}
          </p>
          <p className="text-[9px] text-slate-300 mt-1 truncate">
            Recálculo con previsiones
          </p>
        </div>
      </div>

      {/* Tabla Matricial Ajustada al 100% del Ancho - SIN BARRAS DE SCROLL HORIZONTAL */}
      <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs w-full">
        <table className="w-full table-fixed text-left border-collapse">
          <thead>
            <tr className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-extrabold border-b border-slate-200 dark:border-slate-800 text-[10px] xl:text-[11px]">
              <th className="w-[16%] py-2.5 px-2 font-bold text-slate-900 dark:text-white">
                Partida / Concepto
              </th>
              {meses.map(m => {
                const isSelected = selectedMonth === m.numMes;
                const isPastClosed = m.numMes <= 8;
                return (
                  <th 
                    key={m.numMes}
                    onClick={() => onSelectMonth && onSelectMonth(m.numMes)}
                    className={`w-[6.4%] py-2 px-0.5 text-center cursor-pointer select-none transition-all ${
                      isSelected 
                        ? 'bg-indigo-600 text-white font-black' 
                        : 'hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                    title={`Ver detalle de ${m.mesNombre}`}
                  >
                    <div className="flex flex-col items-center justify-center leading-none">
                      <span className="uppercase text-[10px]">{m.mesCorto}</span>
                      <span className={`text-[8px] font-bold px-1 py-0.2 rounded mt-0.5 ${
                        isSelected 
                          ? 'bg-white/20 text-white' 
                          : isPastClosed 
                          ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                          : 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300'
                      }`}>
                        {isPastClosed ? 'Real' : 'Prev'}
                      </span>
                    </div>
                  </th>
                );
              })}
              <th className="w-[7.2%] py-2.5 px-1 text-center bg-slate-200/80 dark:bg-slate-800/90 text-slate-900 dark:text-white font-black text-[10px] xl:text-[11px]">
                TOTAL
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-[10px] xl:text-[11px] font-semibold">
            
            {/* Saldo Inicial */}
            <tr className="bg-slate-50/60 dark:bg-slate-800/30">
              <td className="py-2 px-2 font-bold text-slate-800 dark:text-slate-200 truncate" title="Saldo Inicial de Mes">
                💼 Saldo Inicial
              </td>
              {meses.map(m => (
                <td key={m.numMes} className="py-2 px-0.5 text-center font-mono font-bold text-slate-700 dark:text-slate-300" title={formatCurrency(m.saldoInicialGlobal)}>
                  {fmt(m.saldoInicialGlobal)}
                </td>
              ))}
              <td className="py-2 px-1 text-center font-mono font-black bg-slate-100 dark:bg-slate-800/60 text-slate-900 dark:text-white" title={formatCurrency(resumenAno.saldoInicialLiquido)}>
                {fmt(resumenAno.saldoInicialLiquido)}
              </td>
            </tr>

            {/* Ingresos Reales */}
            <tr className="hover:bg-emerald-50/30 dark:hover:bg-emerald-950/10">
              <td className="py-2 px-2 text-emerald-800 dark:text-emerald-300 font-bold truncate" title="(+) Ingresos Reales / Consolidados">
                🟢 (+) Ingresos Reales
              </td>
              {meses.map(m => (
                <td key={m.numMes} className="py-2 px-0.5 text-center font-mono font-bold text-emerald-600 dark:text-emerald-400" title={formatCurrency(m.ingresosReales)}>
                  {m.ingresosReales > 0 ? `+${fmt(m.ingresosReales)}` : '-'}
                </td>
              ))}
              <td className="py-2 px-1 text-center font-mono font-black bg-slate-100 dark:bg-slate-800/60 text-emerald-600 dark:text-emerald-400" title={formatCurrency(resumenAno.totalIngresosRealesAno)}>
                +{fmt(resumenAno.totalIngresosRealesAno)}
              </td>
            </tr>

            {/* Ingresos Previstos */}
            <tr className="hover:bg-amber-50/30 dark:hover:bg-amber-950/10">
              <td className="py-2 px-2 text-amber-800 dark:text-amber-300 font-bold truncate" title="(+) Ingresos Previstos / Simulaciones">
                ⏳ (+) Ingresos Previstos
              </td>
              {meses.map(m => (
                <td key={m.numMes} className="py-2 px-0.5 text-center font-mono font-semibold text-amber-600 dark:text-amber-400" title={formatCurrency(m.ingresosPrevistos)}>
                  {m.ingresosPrevistos > 0 ? `+${fmt(m.ingresosPrevistos)}` : '-'}
                </td>
              ))}
              <td className="py-2 px-1 text-center font-mono font-bold bg-slate-100 dark:bg-slate-800/60 text-amber-600 dark:text-amber-400" title={formatCurrency(resumenAno.totalIngresosPrevistosAno)}>
                +{fmt(resumenAno.totalIngresosPrevistosAno)}
              </td>
            </tr>

            {/* Total Ingresos Mes */}
            <tr className="bg-emerald-50/20 dark:bg-emerald-950/10 font-bold">
              <td className="py-1.5 px-2 text-emerald-900 dark:text-emerald-200 font-black truncate" title="Total Ingresos del Mes">
                📈 Total Ingresos
              </td>
              {meses.map(m => (
                <td key={m.numMes} className="py-1.5 px-0.5 text-center font-mono font-black text-emerald-700 dark:text-emerald-300" title={formatCurrency(m.ingresos)}>
                  {m.ingresos > 0 ? fmt(m.ingresos) : '-'}
                </td>
              ))}
              <td className="py-1.5 px-1 text-center font-mono font-black bg-slate-100 dark:bg-slate-800/60 text-emerald-700 dark:text-emerald-300" title={formatCurrency(resumenAno.totalIngresosAno)}>
                {fmt(resumenAno.totalIngresosAno)}
              </td>
            </tr>

            {/* Gastos Reales */}
            <tr className="hover:bg-rose-50/30 dark:hover:bg-rose-950/10">
              <td className="py-2 px-2 text-rose-800 dark:text-rose-300 font-bold truncate" title="(-) Gastos Reales / Consolidados">
                🟢 (-) Gastos Reales
              </td>
              {meses.map(m => (
                <td key={m.numMes} className="py-2 px-0.5 text-center font-mono text-rose-600 dark:text-rose-400" title={formatCurrency(m.gastosReales)}>
                  {m.gastosReales > 0 ? `-${fmt(m.gastosReales)}` : '-'}
                </td>
              ))}
              <td className="py-2 px-1 text-center font-mono font-bold bg-slate-100 dark:bg-slate-800/60 text-rose-600 dark:text-rose-400" title={formatCurrency(resumenAno.totalGastosRealesAno)}>
                -{fmt(resumenAno.totalGastosRealesAno)}
              </td>
            </tr>

            {/* Gastos Previstos */}
            <tr className="hover:bg-amber-50/30 dark:hover:bg-amber-950/10">
              <td className="py-2 px-2 text-amber-800 dark:text-amber-300 font-bold truncate" title="(-) Gastos Previstos / Simulaciones">
                ⏳ (-) Gastos Previstos
              </td>
              {meses.map(m => (
                <td key={m.numMes} className="py-2 px-0.5 text-center font-mono text-amber-600 dark:text-amber-400" title={formatCurrency(m.gastosPrevistos)}>
                  {m.gastosPrevistos > 0 ? `-${fmt(m.gastosPrevistos)}` : '-'}
                </td>
              ))}
              <td className="py-2 px-1 text-center font-mono font-bold bg-slate-100 dark:bg-slate-800/60 text-amber-600 dark:text-amber-400" title={formatCurrency(resumenAno.totalGastosPrevistosAno)}>
                -{fmt(resumenAno.totalGastosPrevistosAno)}
              </td>
            </tr>

            {/* Flujo Neto Mensual */}
            <tr className="bg-indigo-50/40 dark:bg-indigo-950/20 font-bold">
              <td className="py-2 px-2 text-indigo-900 dark:text-indigo-200 font-black truncate" title="(=) Flujo Neto Mensual">
                ⚡ (=) Flujo Neto
              </td>
              {meses.map(m => (
                <td 
                  key={m.numMes} 
                  className={`py-2 px-0.5 text-center font-mono font-black ${
                    m.flujoNeto >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600'
                  }`}
                  title={formatCurrency(m.flujoNeto)}
                >
                  {m.flujoNeto >= 0 ? `+${fmt(m.flujoNeto)}` : fmt(m.flujoNeto)}
                </td>
              ))}
              <td className="py-2 px-1 text-center font-mono font-black bg-slate-100 dark:bg-slate-800/60 text-indigo-600 dark:text-indigo-400" title={formatCurrency(resumenAno.ahorroNetoProyectado)}>
                {fmt(resumenAno.ahorroNetoProyectado)}
              </td>
            </tr>

            {/* Saldo Final Recalculado */}
            <tr className="bg-slate-100/80 dark:bg-slate-800/60 text-slate-900 dark:text-white font-black">
              <td className="py-2.5 px-2 text-slate-900 dark:text-white font-black truncate" title="(=) Saldo Final Recalculado">
                🏦 (=) Saldo Final
              </td>
              {meses.map(m => (
                <td key={m.numMes} className="py-2.5 px-0.5 text-center font-mono font-black text-slate-900 dark:text-white" title={formatCurrency(m.saldoFinalGlobal)}>
                  {fmt(m.saldoFinalGlobal)}
                </td>
              ))}
              <td className="py-2.5 px-1 text-center font-mono font-black bg-indigo-600 text-white" title={formatCurrency(resumenAno.saldoFinalProyectadoLiquido)}>
                {fmt(resumenAno.saldoFinalProyectadoLiquido)}
              </td>
            </tr>

            {/* Desglose por Entidad Bancaria */}
            {showBankDetails && (
              <>
                <tr className="bg-slate-50 dark:bg-slate-800/40 text-[9px] text-slate-400 uppercase font-bold tracking-wider">
                  <td colSpan={14} className="py-1.5 px-2">
                    <div className="flex flex-wrap items-center justify-between gap-1">
                      <span className="text-indigo-600 dark:text-indigo-400 font-black">
                        {bankBalanceMode === 'inicio' && '💼 Saldos al Inicio de Cada Mes (Incluye Saldo Inicial al 1 de Enero)'}
                        {bankBalanceMode === 'fin' && '🏦 Saldos al Cierre / Fin de Cada Mes'}
                        {bankBalanceMode === 'ambos' && '🔄 Saldos por Entidad Bancaria (Apertura y Cierre de Mes)'}
                      </span>
                      <span className="normal-case text-[9px] text-slate-500 dark:text-slate-400 font-semibold">
                        {bankBalanceMode === 'inicio' ? 'TOTAL = Saldo de Apertura 1 Ene' : 'TOTAL = Cierre Proyectado 31 Dic'}
                      </span>
                    </div>
                  </td>
                </tr>

                {cuentasLiquid.map(cta => {
                  const showInicio = bankBalanceMode === 'inicio' || bankBalanceMode === 'ambos';
                  const showFin = bankBalanceMode === 'fin' || bankBalanceMode === 'ambos';

                  return (
                    <React.Fragment key={cta.id}>
                      {showInicio && (
                        <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                          <td className="py-1.5 px-2 text-slate-700 dark:text-slate-300 truncate pl-3 flex items-center space-x-1.5" title={`Saldo Inicio de Mes para ${cta.nombre}`}>
                            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: cta.color_hex || '#4f46e5' }} />
                            <span className="font-bold text-slate-900 dark:text-white">{cta.nombre}</span>
                            <span className="text-[9px] text-indigo-600 dark:text-indigo-400 font-bold">(Inicio)</span>
                          </td>
                          {meses.map(m => {
                            const val = getSaldoInicial(cta, m);
                            return (
                              <td 
                                key={m.numMes} 
                                className={`py-1.5 px-0.5 text-center font-mono text-[10px] ${val < 0 ? 'text-rose-500 font-bold' : 'text-slate-700 dark:text-slate-300 font-semibold'}`} 
                                title={`${cta.nombre} al inicio de ${m.mesNombre}: ${formatCurrency(val)}`}
                              >
                                {fmt(val)}
                              </td>
                            );
                          })}
                          <td className="py-1.5 px-1 text-center font-black bg-slate-100 dark:bg-slate-800/60 font-mono text-[10px] text-indigo-600 dark:text-indigo-400" title={`Saldo Apertura al 1 Ene: ${formatCurrency(cta.saldoInicial2026)}`}>
                            {fmt(cta.saldoInicial2026)}
                          </td>
                        </tr>
                      )}

                      {showFin && (
                        <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                          <td className="py-1.5 px-2 text-slate-700 dark:text-slate-300 truncate pl-3 flex items-center space-x-1.5" title={`Saldo Cierre de Mes para ${cta.nombre}`}>
                            <span className="w-2 h-2 rounded-full shrink-0 opacity-70" style={{ backgroundColor: cta.color_hex || '#4f46e5' }} />
                            <span className="font-bold text-slate-900 dark:text-white">{cta.nombre}</span>
                            <span className="text-[9px] text-slate-400 font-semibold">(Fin)</span>
                          </td>
                          {meses.map(m => {
                            const val = getSaldoFinal(cta, m);
                            return (
                              <td 
                                key={m.numMes} 
                                className={`py-1.5 px-0.5 text-center font-mono text-[10px] ${val < 0 ? 'text-rose-500 font-bold' : 'text-slate-700 dark:text-slate-300'}`} 
                                title={`${cta.nombre} al cierre de ${m.mesNombre}: ${formatCurrency(val)}`}
                              >
                                {fmt(val)}
                              </td>
                            );
                          })}
                          <td className="py-1.5 px-1 text-center font-bold bg-slate-100 dark:bg-slate-800/60 font-mono text-[10px]" title={`Saldo Cierre Proyectado a 31 Dic: ${formatCurrency(getSaldoFinal(cta, meses[11]))}`}>
                            {fmt(getSaldoFinal(cta, meses[11]))}
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </>
            )}

          </tbody>
        </table>
      </div>
    </div>
  );
}
