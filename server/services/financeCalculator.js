const db = require('../db');

/**
 * Obtiene el resumen general y KPIs para el dashboard
 * Aplica la regla contable de CERO DOBLE CONTABILIZACIÓN de transferencias internas.
 */
function getDashboardMetrics(year = 2026, month = null, usuarioId = 1) {
  const finalUserId = Number(usuarioId) || 1;

  // 1. Saldos actuales por cuenta
  const cuentas = db.prepare(`
    SELECT id, nombre, tipo, saldo_inicial_2026, color_hex
    FROM cuentas
    WHERE activo = 1 AND usuario_id = ?
  `).all(finalUserId);

  const saldosCuentas = cuentas.map(c => {
    const movDirectos = db.prepare(`
      SELECT COALESCE(SUM(importe), 0) as total
      FROM movimientos
      WHERE cuenta_id = ? AND es_transferencia_interna = 0 AND usuario_id = ?
    `).get(c.id, finalUserId)?.total || 0;

    const transfersSalida = db.prepare(`
      SELECT COALESCE(SUM(ABS(importe)), 0) as total
      FROM movimientos
      WHERE cuenta_id = ? AND es_transferencia_interna = 1 AND usuario_id = ?
    `).get(c.id, finalUserId)?.total || 0;

    const transfersEntrada = db.prepare(`
      SELECT COALESCE(SUM(ABS(importe)), 0) as total
      FROM movimientos
      WHERE cuenta_destino_id = ? AND es_transferencia_interna = 1 AND usuario_id = ?
    `).get(c.id, finalUserId)?.total || 0;

    const saldoActual = c.saldo_inicial_2026 + movDirectos - transfersSalida + transfersEntrada;

    return {
      ...c,
      saldoActual: Number(saldoActual.toFixed(2))
    };
  });

  const saldoLiquido = saldosCuentas
    .filter(c => c.tipo === 'corriente' || c.tipo === 'ahorro_emergencia')
    .reduce((acc, c) => acc + c.saldoActual, 0);

  const totalInvertido = saldosCuentas
    .filter(c => c.tipo === 'inversion' || c.tipo === 'epsv')
    .reduce((acc, c) => acc + c.saldoActual, 0);

  const totalDeudaPendiente = db.prepare(`
    SELECT COALESCE(SUM(capital_pendiente), 0) as total
    FROM prestamos_y_pasivos
    WHERE usuario_id = ?
  `).get(finalUserId)?.total || 0;

  const patrimonioNeto = (saldoLiquido + totalInvertido) - totalDeudaPendiente;

  let dateFilter = `m.usuario_id = ? AND strftime('%Y', m.fecha) = ?`;
  let queryParams = [finalUserId, String(year)];

  if (month) {
    const formattedMonth = String(month).padStart(2, '0');
    dateFilter += ` AND strftime('%m', m.fecha) = ?`;
    queryParams.push(formattedMonth);
  }

  const ingresosPeriodo = db.prepare(`
    SELECT COALESCE(SUM(m.importe), 0) as total
    FROM movimientos m
    JOIN categorias cat ON m.categoria_id = cat.id
    WHERE ${dateFilter}
      AND m.es_transferencia_interna = 0
      AND (cat.tipo = 'ingreso' OR m.importe > 0)
  `).get(...queryParams)?.total || 0;

  const gastosPeriodo = db.prepare(`
    SELECT COALESCE(SUM(ABS(m.importe)), 0) as total
    FROM movimientos m
    JOIN categorias cat ON m.categoria_id = cat.id
    WHERE ${dateFilter}
      AND m.es_transferencia_interna = 0
      AND cat.tipo IN ('gasto_fijo', 'gasto_variable')
      AND m.importe < 0
  `).get(...queryParams)?.total || 0;

  const inversionPatrimonioPeriodo = db.prepare(`
    SELECT COALESCE(SUM(ABS(m.importe)), 0) as total
    FROM movimientos m
    JOIN categorias cat ON m.categoria_id = cat.id
    WHERE ${dateFilter}
      AND m.es_transferencia_interna = 0
      AND cat.tipo = 'inversion'
  `).get(...queryParams)?.total || 0;

  const ahorroNeto = ingresosPeriodo - gastosPeriodo;
  const tasaAhorro = ingresosPeriodo > 0 ? (ahorroNeto / ingresosPeriodo) * 100 : 0;

  const meses = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];
  const nombresMeses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

  // 5. Matriz Anual de Tesorería y Previsiones (Igual que la página principal del Excel)
  const liquidAccounts = cuentas.filter(c => c.tipo === 'corriente' || c.tipo === 'ahorro_emergencia');
  const initialLiquidTotal = liquidAccounts.reduce((sum, c) => sum + (c.saldo_inicial_2026 || 0), 0);

  const monthNamesFull = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  const currentBankBalances = {};
  cuentas.forEach(c => {
    currentBankBalances[c.id] = c.saldo_inicial_2026 || 0;
  });

  let currentGlobalLiquid = initialLiquidTotal;
  const matrizMeses = [];

  for (let idx = 0; idx < 12; idx++) {
    const mStr = meses[idx];
    const monthNum = idx + 1;

    const initialGlobalThisMonth = currentGlobalLiquid;
    const initialBanksThisMonth = { ...currentBankBalances };

    const movsMes = db.prepare(`
      SELECT m.*, cat.tipo as cat_tipo
      FROM movimientos m
      JOIN categorias cat ON m.categoria_id = cat.id
      WHERE m.usuario_id = ? AND strftime('%Y', m.fecha) = ? AND strftime('%m', m.fecha) = ?
      ORDER BY m.fecha ASC, m.id ASC
    `).all(finalUserId, String(year), mStr);

    let ingRealesMes = 0;
    let ingPrevistosMes = 0;
    let gasRealesMes = 0;
    let gasPrevistosMes = 0;
    let invMes = 0;

    for (const m of movsMes) {
      const isTransfer = m.es_transferencia_interna === 1;
      const isIncome = m.cat_tipo === 'ingreso' || m.importe > 0;
      const isInvestment = m.cat_tipo === 'inversion';
      const isConsolidado = m.es_consolidado === 1;

      if (isTransfer) {
        const amt = Math.abs(m.importe);
        currentBankBalances[m.cuenta_id] = (currentBankBalances[m.cuenta_id] || 0) - amt;
        if (m.cuenta_destino_id) {
          currentBankBalances[m.cuenta_destino_id] = (currentBankBalances[m.cuenta_destino_id] || 0) + amt;
        }
      } else {
        currentBankBalances[m.cuenta_id] = (currentBankBalances[m.cuenta_id] || 0) + m.importe;
        if (isIncome) {
          if (isConsolidado) {
            ingRealesMes += m.importe;
          } else {
            ingPrevistosMes += m.importe;
          }
          currentGlobalLiquid += m.importe;
        } else if (isInvestment) {
          invMes += Math.abs(m.importe);
          currentGlobalLiquid += m.importe;
        } else {
          const gastoAmt = Math.abs(m.importe);
          if (isConsolidado) {
            gasRealesMes += gastoAmt;
          } else {
            gasPrevistosMes += gastoAmt;
          }
          currentGlobalLiquid += m.importe;
        }
      }
    }

    const ingTotalMes = ingRealesMes + ingPrevistosMes;
    const gasTotalMes = gasRealesMes + gasPrevistosMes;
    const flujoNetoMes = ingTotalMes - gasTotalMes - invMes;

    matrizMeses.push({
      numMes: monthNum,
      mesNombre: monthNamesFull[idx],
      mesCorto: nombresMeses[idx],
      saldoInicialGlobal: Number(initialGlobalThisMonth.toFixed(2)),
      saldoInicialSantander: Number((initialBanksThisMonth[1] || 0).toFixed(2)),
      saldoInicialKutxa: Number((initialBanksThisMonth[2] || 0).toFixed(2)),
      saldoInicialN26: Number((initialBanksThisMonth[3] || 0).toFixed(2)),
      saldosInicialesBancos: { ...initialBanksThisMonth },
      ingresos: Number(ingTotalMes.toFixed(2)),
      ingresosReales: Number(ingRealesMes.toFixed(2)),
      ingresosPrevistos: Number(ingPrevistosMes.toFixed(2)),
      gastosReales: Number(gasRealesMes.toFixed(2)),
      gastosPrevistos: Number(gasPrevistosMes.toFixed(2)),
      gastosTotal: Number(gasTotalMes.toFixed(2)),
      inversion: Number(invMes.toFixed(2)),
      flujoNeto: Number(flujoNetoMes.toFixed(2)),
      saldoFinalGlobal: Number(currentGlobalLiquid.toFixed(2)),
      saldoFinalSantander: Number((currentBankBalances[1] || 0).toFixed(2)),
      saldoFinalKutxa: Number((currentBankBalances[2] || 0).toFixed(2)),
      saldoFinalN26: Number((currentBankBalances[3] || 0).toFixed(2)),
      saldosFinalesBancos: { ...currentBankBalances },
      totalMovimientos: movsMes.length
    });
  }

  const matrizAnualTesoreria = {
    resumenAno: {
      saldoInicialLiquido: Number(initialLiquidTotal.toFixed(2)),
      saldoFinalProyectadoLiquido: Number(currentGlobalLiquid.toFixed(2)),
      ahorroNetoProyectado: Number((matrizMeses.reduce((acc, m) => acc + m.ingresos - m.gastosTotal, 0)).toFixed(2)),
      totalIngresosRealesAno: Number((matrizMeses.reduce((acc, m) => acc + m.ingresosReales, 0)).toFixed(2)),
      totalIngresosPrevistosAno: Number((matrizMeses.reduce((acc, m) => acc + m.ingresosPrevistos, 0)).toFixed(2)),
      totalIngresosAno: Number((matrizMeses.reduce((acc, m) => acc + m.ingresos, 0)).toFixed(2)),
      totalGastosRealesAno: Number((matrizMeses.reduce((acc, m) => acc + m.gastosReales, 0)).toFixed(2)),
      totalGastosPrevistosAno: Number((matrizMeses.reduce((acc, m) => acc + m.gastosPrevistos, 0)).toFixed(2)),
      totalGastosAno: Number((matrizMeses.reduce((acc, m) => acc + m.gastosTotal, 0)).toFixed(2)),
      totalInvertidoAno: Number((matrizMeses.reduce((acc, m) => acc + m.inversion, 0)).toFixed(2)),
      cuentasDetalle: liquidAccounts.map(c => ({
        id: c.id,
        nombre: c.nombre,
        tipo: c.tipo,
        color_hex: c.color_hex,
        saldoInicial2026: c.saldo_inicial_2026 || 0
      }))
    },
    meses: matrizMeses
  };

  const evolucionMensual = matrizMeses.map((m) => {
    return {
      mes: m.mesCorto,
      numMes: m.numMes,
      ingresos: m.ingresos,
      gastos: m.gastosTotal,
      inversion: m.inversion,
      ahorro: m.flujoNeto,
      saldoReal: m.numMes <= 8 ? m.saldoFinalGlobal : null,
      saldoSimulado: m.numMes >= 8 ? m.saldoFinalGlobal : null,
      saldoGlobal: m.saldoFinalGlobal
    };
  });

  const distribucionCategorias = db.prepare(`
    SELECT cat.id, cat.nombre, cat.color, cat.tipo,
           COALESCE(SUM(ABS(m.importe)), 0) as total
    FROM categorias cat
    JOIN movimientos m ON m.categoria_id = cat.id
    WHERE ${dateFilter}
      AND m.es_transferencia_interna = 0
      AND cat.tipo IN ('gasto_fijo', 'gasto_variable')
      AND m.importe < 0
    GROUP BY cat.id, cat.nombre, cat.color, cat.tipo
    ORDER BY total DESC
  `).all(...queryParams);

  return {
    kpis: {
      ingresosNetos: Number(ingresosPeriodo.toFixed(2)),
      gastosReales: Number(gastosPeriodo.toFixed(2)),
      ahorroNeto: Number(ahorroNeto.toFixed(2)),
      tasaAhorroPct: Number(tasaAhorro.toFixed(1)),
      saldoLiquido: Number(saldoLiquido.toFixed(2)),
      totalInvertido: Number(totalInvertido.toFixed(2)),
      totalDeudaPendiente: Number(totalDeudaPendiente.toFixed(2)),
      patrimonioNeto: Number(patrimonioNeto.toFixed(2)),
      inversionPatrimonial: Number(inversionPatrimonioPeriodo.toFixed(2))
    },
    saldosCuentas,
    evolucionMensual,
    distribucionCategorias,
    matrizAnualTesoreria
  };
}

/**
 * Calcula la tabla de amortización mensual
 */
function calcularAmortizacion(capital, interesAnual, mesesRestantes, cuotaMensual) {
  const schedule = [];
  let saldo = capital;
  const tasaMensual = (interesAnual / 100) / 12;

  for (let i = 1; i <= mesesRestantes && saldo > 0.01; i++) {
    let interes = saldo * tasaMensual;
    let amortizacion = cuotaMensual - interes;

    if (tasaMensual === 0) {
      interes = 0;
      amortizacion = Math.min(saldo, cuotaMensual);
    } else if (amortizacion > saldo) {
      amortizacion = saldo;
      interes = Math.max(0, saldo * tasaMensual);
    }

    saldo -= amortizacion;
    schedule.push({
      mes: i,
      saldoRestante: Math.max(0, Number(saldo.toFixed(2))),
      amortizacionCapital: Number(amortizacion.toFixed(2)),
      pagoIntereses: Number(interes.toFixed(2)),
      cuotaTotal: Number((amortizacion + interes).toFixed(2))
    });
  }

  return schedule;
}

/**
 * Simulador Avanzado de Escenarios para Cualquier Pasivo:
 * - Amortizaciones Parciales Anticipadas (Reducir Cuota vs Reducir Plazo)
 * - Modificación de Tipo de Interés
 * - Deducción y Desgravación Fiscal IRPF (Hacienda)
 */
function simularEscenarioPasivo({
  capitalPendiente,
  interesAnual,
  cuotaMensual,
  mesesRestantes,
  amortizacionExtra = 0,
  modalidadAmortizacion = 'reducir_plazo', // 'reducir_plazo' o 'reducir_cuota'
  nuevoInteresAnual = null,
  esViviendaHabitual = false,
  regimenFiscal = 'general', // 'general' (15% hasta 9040€/titular) o 'pais_vasco' (18% hasta 8500€/titular)
  numeroTitulares = 1 // 1 o 2 titulares
}) {
  const cap = Math.max(0, Number(capitalPendiente));
  const intOriginal = Number(interesAnual);
  const intSimulado = nuevoInteresAnual !== null && nuevoInteresAnual !== undefined ? Number(nuevoInteresAnual) : intOriginal;
  const cuotaOrig = Number(cuotaMensual);
  const mesesOrig = Number(mesesRestantes);
  const extra = Math.max(0, Number(amortizacionExtra));
  const titulares = Math.max(1, parseInt(numeroTitulares) || 1);

  // 1. Escenario Original
  const scheduleOriginal = calcularAmortizacion(cap, intOriginal, mesesOrig, cuotaOrig);
  const totalInteresesOriginal = scheduleOriginal.reduce((acc, s) => acc + s.pagoIntereses, 0);
  const totalPagadoOriginal = scheduleOriginal.reduce((acc, s) => acc + s.cuotaTotal, 0);

  // 2. Escenario Simulado
  const capTrasExtra = Math.max(0, cap - extra);
  let cuotaSimulada = cuotaOrig;
  let mesesSimulados = mesesOrig;

  const tasaMensualSim = (intSimulado / 100) / 12;

  if (modalidadAmortizacion === 'reducir_cuota') {
    // Mantener plazo restante y recalcular cuota menor
    if (tasaMensualSim === 0) {
      cuotaSimulada = capTrasExtra / mesesOrig;
    } else {
      cuotaSimulada = (capTrasExtra * tasaMensualSim * Math.pow(1 + tasaMensualSim, mesesOrig)) / (Math.pow(1 + tasaMensualSim, mesesOrig) - 1);
    }
    mesesSimulados = mesesOrig;
  } else {
    // Reducir plazo (mantener cuota mensual)
    if (tasaMensualSim === 0) {
      mesesSimulados = Math.ceil(capTrasExtra / cuotaOrig);
    } else {
      // n = - ln(1 - (P * i / A)) / ln(1 + i)
      const numerador = 1 - (capTrasExtra * tasaMensualSim / cuotaOrig);
      if (numerador > 0) {
        mesesSimulados = Math.ceil(-Math.log(numerador) / Math.log(1 + tasaMensualSim));
      } else {
        mesesSimulados = 1;
      }
    }
  }

  const scheduleSimulado = calcularAmortizacion(capTrasExtra, intSimulado, mesesSimulados, cuotaSimulada);
  const totalInteresesSimulado = scheduleSimulado.reduce((acc, s) => acc + s.pagoIntereses, 0);
  const totalPagadoSimulado = scheduleSimulado.reduce((acc, s) => acc + s.cuotaTotal, 0) + extra;

  const ahorroIntereses = Math.max(0, totalInteresesOriginal - totalInteresesSimulado);
  const mesesAhorrados = Math.max(0, mesesOrig - scheduleSimulado.length);
  const ahorroCuotaMensual = Math.max(0, cuotaOrig - cuotaSimulada);

  // 3. Cálculo de Desgravación Fiscal Hacienda (IRPF)
  const baseLimiteIndividual = regimenFiscal === 'pais_vasco' ? 8500 : 9040;
  const baseMaximaDeducible = baseLimiteIndividual * titulares;
  const tipoDeduccionPct = regimenFiscal === 'pais_vasco' ? 18.0 : 15.0;

  let desgravacion = {
    aplica: esViviendaHabitual,
    numeroTitulares: titulares,
    baseIndividual: baseLimiteIndividual,
    baseAnualAportada: 0,
    baseMaximaDeducible,
    tipoDeduccionPct,
    ahorroFiscalAnual: 0,
    maximoAhorroFiscalPosible: baseMaximaDeducible * (tipoDeduccionPct / 100)
  };

  if (esViviendaHabitual) {
    const aportacionAnualTotal = (cuotaOrig * 12) + extra;
    const baseComputable = Math.min(aportacionAnualTotal, baseMaximaDeducible);
    const ahorroIRPF = baseComputable * (tipoDeduccionPct / 100);

    desgravacion.baseAnualAportada = Number(aportacionAnualTotal.toFixed(2));
    desgravacion.baseComputable = Number(baseComputable.toFixed(2));
    desgravacion.ahorroFiscalAnual = Number(ahorroIRPF.toFixed(2));
  }

  return {
    original: {
      capitalPendiente: cap,
      interesAnual: intOriginal,
      cuotaMensual: Number(cuotaOrig.toFixed(2)),
      mesesRestantes: mesesOrig,
      totalIntereses: Number(totalInteresesOriginal.toFixed(2)),
      totalPagado: Number(totalPagadoOriginal.toFixed(2)),
      schedule: scheduleOriginal
    },
    simulado: {
      capitalPendiente: capTrasExtra,
      interesAnual: intSimulado,
      cuotaMensual: Number(cuotaSimulada.toFixed(2)),
      mesesRestantes: scheduleSimulado.length,
      amortizacionExtraordinaria: extra,
      modalidad: modalidadAmortizacion,
      totalIntereses: Number(totalInteresesSimulado.toFixed(2)),
      totalPagado: Number(totalPagadoSimulado.toFixed(2)),
      ahorroIntereses: Number(ahorroIntereses.toFixed(2)),
      mesesAhorrados,
      anosAhorrados: Number((mesesAhorrados / 12).toFixed(1)),
      ahorroCuotaMensual: Number(ahorroCuotaMensual.toFixed(2)),
      schedule: scheduleSimulado
    },
    desgravacionHacienda: desgravacion
  };
}

/**
 * Simulador Universal de Nuevos Créditos (Coche, Furgoneta, Reforma, Estudios, etc.)
 * e Impacto en la Carga Mensual y Endeudamiento Global Familiar (Lo que hay + Lo que habrá)
 */
function simularNuevoCreditoEImpactoGlobal({
  nombre = 'Nuevo Crédito',
  concepto = 'Vehículo',
  importe = 30000,
  interesAnual = 0,
  plazoAnos = 5,
  cuotaMensualManual = null,
  fechaInicio = '2026-01-01',
  modalidadInteres = 'variable',
  ingresosMensualesManual = null,
  editingPasivoId = null
}) {
  const imp = Math.max(100, Number(importe) || 30000);
  const esSinInteres = modalidadInteres === 'cero' || Number(interesAnual) === 0;
  const intAnual = esSinInteres ? 0 : Math.max(0, Number(interesAnual));
  let plazo = Math.max(1, Number(plazoAnos) || 5);
  let meses = plazo * 12;
  const tasaMensual = esSinInteres ? 0 : (intAnual / 100) / 12;

  let cuotaMensual = 0;
  if (cuotaMensualManual && Number(cuotaMensualManual) > 0) {
    cuotaMensual = Number(cuotaMensualManual);
    if (tasaMensual === 0) {
      meses = Math.max(1, Math.ceil(imp / cuotaMensual));
      plazo = Math.max(1, Math.round(meses / 12) || 1);
    } else {
      const minI = imp * tasaMensual;
      if (cuotaMensual > minI) {
        meses = Math.max(1, Math.ceil(-Math.log(1 - minI / cuotaMensual) / Math.log(1 + tasaMensual)));
        plazo = Math.max(1, Math.round(meses / 12) || 1);
      }
    }
  } else if (tasaMensual === 0) {
    cuotaMensual = imp / meses;
  } else {
    cuotaMensual = (imp * tasaMensual * Math.pow(1 + tasaMensual, meses)) / (Math.pow(1 + tasaMensual, meses) - 1);
  }
  cuotaMensual = Number(cuotaMensual.toFixed(2));

  const totalIntereses = esSinInteres ? 0 : Math.max(0, (cuotaMensual * meses) - imp);
  const totalCoste = imp + totalIntereses;

  // Extraer año y mes de inicio de forma robusta
  const fechaStr = fechaInicio && String(fechaInicio).includes('-') ? String(fechaInicio) : '2026-01-01';
  const parts = fechaStr.split('-').map(Number);
  const startYear = (parts[0] && parts[0] >= 2000 && parts[0] <= 2100) ? parts[0] : 2026;
  const startMonth = (parts[1] && parts[1] >= 1 && parts[1] <= 12) ? parts[1] : 1;

  // Cuadro de Amortización con fechas reales
  const schedule = [];
  let saldo = imp;
  for (let i = 1; i <= meses && saldo > 0.01; i++) {
    const totalMesOffset = (startMonth - 1) + (i - 1);
    const calYear = startYear + Math.floor(totalMesOffset / 12);
    const calMonth = (totalMesOffset % 12) + 1;
    const mesStr = String(calMonth).padStart(2, '0');

    let interes = (tasaMensual === 0 || esSinInteres) ? 0 : (saldo * tasaMensual);
    let amortizacion = cuotaMensual - interes;

    if (tasaMensual === 0 || esSinInteres) {
      interes = 0;
      amortizacion = Math.min(saldo, cuotaMensual);
    } else if (amortizacion > saldo) {
      amortizacion = saldo;
      interes = Math.max(0, saldo * tasaMensual);
    }

    saldo -= amortizacion;
    schedule.push({
      mes: i,
      fecha: `${calYear}-${mesStr}-01`,
      ano: calYear,
      mesCal: calMonth,
      saldoRestante: Math.max(0, Number(saldo.toFixed(2))),
      amortizacionCapital: Number(amortizacion.toFixed(2)),
      pagoIntereses: Number(interes.toFixed(2)),
      cuotaTotal: Number((amortizacion + interes).toFixed(2))
    });
  }

  // Resumen anual con fechas reales desde el año de inicio
  const resumenAnualMap = {};
  schedule.forEach((s) => {
    const y = s.ano;
    if (!resumenAnualMap[y]) {
      resumenAnualMap[y] = {
        ano: y,
        cuotasPagadas: 0,
        capitalAmortizado: 0,
        interesesPagados: 0,
        saldoFinAno: s.saldoRestante
      };
    }
    resumenAnualMap[y].cuotasPagadas += s.cuotaTotal;
    resumenAnualMap[y].capitalAmortizado += s.amortizacionCapital;
    resumenAnualMap[y].interesesPagados += s.pagoIntereses;
    resumenAnualMap[y].saldoFinAno = s.saldoRestante;
  });

  const resumenAnual = Object.values(resumenAnualMap).map(r => ({
    ...r,
    cuotasPagadas: Number(r.cuotasPagadas.toFixed(2)),
    capitalAmortizado: Number(r.capitalAmortizado.toFixed(2)),
    interesesPagados: Number(r.interesesPagados.toFixed(2)),
    saldoFinAno: Number(r.saldoFinAno.toFixed(2))
  }));

  // Obtener pasivos existentes excluyendo el pasivo que se está editando para no duplicar KPIs
  const pasivosExistentes = db.prepare(`
    SELECT id, nombre, tipo, capital_pendiente, cuota_mensual, interes_nominal_anual,
           fecha_inicio, fecha_fin_prevista
    FROM prestamos_y_pasivos
    WHERE tipo != 'simulacion' AND capital_pendiente > 0 ${editingPasivoId ? `AND id != ${Number(editingPasivoId)}` : ''}
    ORDER BY id ASC
  `).all();

  const pasivosDetalle = pasivosExistentes.map(p => {
    let mesesRest = 60;
    if (p.cuota_mensual > 0) {
      mesesRest = Math.ceil(p.capital_pendiente / p.cuota_mensual);
    }
    const sched = calcularAmortizacion(p.capital_pendiente, p.interes_nominal_anual, mesesRest, p.cuota_mensual);
    return {
      id: p.id,
      nombre: p.nombre,
      tipo: p.tipo,
      capitalPendiente: p.capital_pendiente,
      cuotaMensual: p.cuota_mensual,
      mesesRestantes: mesesRest,
      schedule: sched
    };
  });

  const cuotasActuales = pasivosExistentes.reduce((acc, p) => acc + (Number(p.cuota_mensual) || 0), 0);
  const totalDeudaActual = pasivosExistentes.reduce((acc, p) => acc + (Number(p.capital_pendiente) || 0), 0);

  // Estimación de ingresos familiares mensuales
  let ingresoMensualEstimado = 5200.00;
  if (ingresosMensualesManual && Number(ingresosMensualesManual) > 0) {
    ingresoMensualEstimado = Number(ingresosMensualesManual);
  } else {
    const ingresosCount = db.prepare(`
      SELECT COUNT(DISTINCT strftime('%m', fecha)) as mesesConIngreso,
             COALESCE(SUM(importe), 0) as total
      FROM movimientos m
      JOIN categorias cat ON m.categoria_id = cat.id
      WHERE strftime('%Y', m.fecha) = '2026'
        AND m.es_transferencia_interna = 0
        AND (cat.tipo = 'ingreso' OR m.importe > 0)
    `).get();

    const mesesConIngreso = ingresosCount?.mesesConIngreso || 0;
    const totalIngresos = ingresosCount?.total || 0;
    if (mesesConIngreso > 0 && totalIngresos > 0) {
      ingresoMensualEstimado = totalIngresos / mesesConIngreso;
    }
  }

  const cuotaTotalFutura = cuotasActuales + cuotaMensual;
  const totalDeudaFutura = totalDeudaActual + imp;

  const ratioEndeudamientoActual = (cuotasActuales / ingresoMensualEstimado) * 100;
  const ratioEndeudamientoFuturo = (cuotaTotalFutura / ingresoMensualEstimado) * 100;

  const margenDisponibleActual = ingresoMensualEstimado - cuotasActuales;
  const margenDisponibleFuturo = ingresoMensualEstimado - cuotaTotalFutura;

  // Proyección Temporal Agregada Mes a Mes
  const currentYear = 2026;
  const mesesProyeccion = Math.max(60, meses);
  const mesesNombres = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  const timelineAgregado = [];

  for (let m = 0; m < mesesProyeccion; m++) {
    const y = currentYear + Math.floor(m / 12);
    const mIdx = m % 12;
    const label = `${mesesNombres[mIdx]} ${y}`;

    let totalCuotasMes = 0;
    const desglosePorPasivo = {};

    // Cuotas de pasivos existentes
    pasivosDetalle.forEach(p => {
      const cuotaEsteMes = (p.schedule[m] && p.schedule[m].saldoRestante >= 0) ? p.cuotaMensual : 0;
      desglosePorPasivo[p.nombre] = cuotaEsteMes;
      totalCuotasMes += cuotaEsteMes;
    });

    // Cuota del préstamo simulado
    const cuotaNuevo = (m < meses) ? Number(cuotaMensual.toFixed(2)) : 0;
    desglosePorPasivo[nombre] = cuotaNuevo;
    totalCuotasMes += cuotaNuevo;

    timelineAgregado.push({
      mesNumero: m + 1,
      label,
      ano: y,
      totalCuotas: Number(totalCuotasMes.toFixed(2)),
      cuotaNuevoCredito: cuotaNuevo,
      cuotasExistentes: Number((totalCuotasMes - cuotaNuevo).toFixed(2)),
      disponibleRestante: Number((ingresoMensualEstimado - totalCuotasMes).toFixed(2)),
      ...desglosePorPasivo
    });
  }

  return {
    parametros: {
      nombre,
      concepto,
      importe: imp,
      interesAnual: intAnual,
      plazoAnos: plazo,
      meses,
      fechaInicio: fechaStr,
      modalidadInteres
    },
    resultados: {
      cuotaMensual: Number(cuotaMensual.toFixed(2)),
      totalIntereses: Number(totalIntereses.toFixed(2)),
      totalCoste: Number(totalCoste.toFixed(2)),
      ingresoMensualFamiliar: Number(ingresoMensualEstimado.toFixed(2)),
      cuotasActuales: Number(cuotasActuales.toFixed(2)),
      cuotaTotalFutura: Number(cuotaTotalFutura.toFixed(2)),
      totalDeudaActual: Number(totalDeudaActual.toFixed(2)),
      totalDeudaFutura: Number(totalDeudaFutura.toFixed(2)),
      margenDisponibleActual: Number(margenDisponibleActual.toFixed(2)),
      margenDisponibleFuturo: Number(margenDisponibleFuturo.toFixed(2)),
      ratioEndeudamientoActual: Number(ratioEndeudamientoActual.toFixed(1)),
      ratioEndeudamientoFuturo: Number(ratioEndeudamientoFuturo.toFixed(1)),
      esViableBancos: ratioEndeudamientoFuturo <= 35.0,
      nivelRiesgo: ratioEndeudamientoFuturo <= 20 ? 'Excelente' : (ratioEndeudamientoFuturo <= 35 ? 'Saludable' : 'Elevado')
    },
    pasivosExistentes: pasivosDetalle,
    schedule,
    resumenAnual,
    timelineAgregado
  };
}

function simularPrestamoFurgoneta(params) {
  return simularNuevoCreditoEImpactoGlobal(params);
}

/**
 * Genera el cuadro de amortización completo a lo largo de toda la vida del préstamo
 */
function calcularCuadroVidaCompleta(pasivo) {
  const capInicial = Number(pasivo.capital_inicial) || 0;
  const capPendiente = Number(pasivo.capital_pendiente) || 0;
  const cuotaMensual = Number(pasivo.cuota_mensual) || 0;
  const tipoInteresActual = Number(pasivo.interes_nominal_anual) || 0;
  const sinInteres = pasivo.tipo_interes_modalidad === 'cero' || tipoInteresActual === 0;

  const fechaInicioStr = pasivo.fecha_inicio || '2015-07-01';
  const fechaFinStr = pasivo.fecha_fin_prevista || '2030-06-30';

  const [iniY, iniM] = fechaInicioStr.split('-').map(Number);
  const [finY, finM] = fechaFinStr.split('-').map(Number);

  let totalMeses = ((finY - iniY) * 12) + (finM - iniM);
  if (totalMeses <= 0) totalMeses = Math.max(12, Math.ceil(capInicial / Math.max(1, cuotaMensual)));

  let historial = [];
  try {
    historial = typeof pasivo.historial_intereses_json === 'string'
      ? JSON.parse(pasivo.historial_intereses_json || '[]')
      : (pasivo.historialIntereses || []);
  } catch (e) {
    historial = [];
  }

  // Mapa de tipos de interés por año
  const mapaInteresPorAno = {};
  historial.forEach(h => {
    if (h.ano && h.interes !== undefined) {
      mapaInteresPorAno[h.ano] = Number(h.interes);
    }
  });

  const mesActualIndex = 2026 * 12 + 1; // Fecha de referencia de hoy
  const scheduleMensual = [];
  let saldo = capInicial;

  let totalInteresesVida = 0;
  let totalAmortizadoVida = 0;
  let interesesPagadosHastaHoy = 0;

  const mesesNombres = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

  for (let m = 0; m < totalMeses && saldo > 0.01; m++) {
    const currentYear = iniY + Math.floor((iniM - 1 + m) / 12);
    const currentMonthIdx = (iniM - 1 + m) % 12;
    const currentMonthName = mesesNombres[currentMonthIdx];
    const fechaLabel = `${currentMonthName} ${currentYear}`;

    const intAnual = sinInteres 
      ? 0 
      : (mapaInteresPorAno[currentYear] !== undefined ? mapaInteresPorAno[currentYear] : tipoInteresActual);

    const tasaMensual = (intAnual / 100) / 12;
    let pagoInteres = saldo * tasaMensual;
    let amortizacion = cuotaMensual - pagoInteres;

    if (tasaMensual === 0 || sinInteres) {
      pagoInteres = 0;
      amortizacion = Math.min(saldo, cuotaMensual);
    } else if (amortizacion > saldo) {
      amortizacion = saldo;
      pagoInteres = Math.max(0, saldo * tasaMensual);
    } else if (amortizacion < 0) {
      amortizacion = 0;
    }

    saldo = Math.max(0, saldo - amortizacion);

    totalInteresesVida += pagoInteres;
    totalAmortizadoVida += amortizacion;

    const esPasado = (currentYear * 12 + currentMonthIdx + 1) < mesActualIndex;
    if (esPasado) {
      interesesPagadosHastaHoy += pagoInteres;
    }

    scheduleMensual.push({
      numeroMes: m + 1,
      ano: currentYear,
      mesNombre: currentMonthName,
      fechaLabel,
      tipoInteresAplicado: intAnual,
      cuota: Number((amortizacion + pagoInteres).toFixed(2)),
      amortizacionCapital: Number(amortizacion.toFixed(2)),
      pagoIntereses: Number(pagoInteres.toFixed(2)),
      saldoRestante: Number(saldo.toFixed(2)),
      esPasado
    });
  }

  // Agrupación anual / Resumen año a año
  const resumenAnualMap = {};
  scheduleMensual.forEach(item => {
    if (!resumenAnualMap[item.ano]) {
      resumenAnualMap[item.ano] = {
        ano: item.ano,
        cuotasPagadas: 0,
        capitalAmortizado: 0,
        interesesPagados: 0,
        saldoFinAno: item.saldoRestante,
        tipoInteres: item.tipoInteresAplicado,
        mesesContabilizados: 0
      };
    }
    const y = resumenAnualMap[item.ano];
    y.cuotasPagadas += item.cuota;
    y.capitalAmortizado += item.amortizacionCapital;
    y.interesesPagados += item.pagoIntereses;
    y.saldoFinAno = item.saldoRestante;
    y.mesesContabilizados += 1;
  });

  const resumenAnual = Object.values(resumenAnualMap).map(y => ({
    ...y,
    cuotasPagadas: Number(y.cuotasPagadas.toFixed(2)),
    capitalAmortizado: Number(y.capitalAmortizado.toFixed(2)),
    interesesPagados: Number(y.interesesPagados.toFixed(2)),
    saldoFinAno: Number(y.saldoFinAno.toFixed(2))
  }));

  return {
    capitalInicial: capInicial,
    capitalPendiente: capPendiente,
    cuotaMensual,
    totalMeses: scheduleMensual.length,
    totalInteresesVida: Number(totalInteresesVida.toFixed(2)),
    totalPagadoVida: Number((totalAmortizadoVida + totalInteresesVida).toFixed(2)),
    interesesPagadosHastaHoy: Number(interesesPagadosHastaHoy.toFixed(2)),
    interesesPendientes: Number((totalInteresesVida - interesesPagadosHastaHoy).toFixed(2)),
    sinInteres,
    resumenAnual,
    scheduleMensual
  };
}

module.exports = {
  getDashboardMetrics,
  calcularAmortizacion,
  simularEscenarioPasivo,
  simularPrestamoFurgoneta,
  simularNuevoCreditoEImpactoGlobal,
  calcularCuadroVidaCompleta
};

