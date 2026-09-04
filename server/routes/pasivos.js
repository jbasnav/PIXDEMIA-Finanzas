const express = require('express');
const router = express.Router();
const db = require('../db');
const { 
  calcularAmortizacion, 
  simularEscenarioPasivo, 
  simularPrestamoFurgoneta,
  computeExactRemainingMonths,
  computeFechaFinFromDate
} = require('../services/financeCalculator');
const { 
  generarHistorialEuriborCompleto, 
  getEuriborValor 
} = require('../services/euriborService');

// Consultar Historial Oficial del Euríbor
router.get('/consultar-euribor-historico', (req, res) => {
  try {
    const tipoIndice = req.query.tipoIndice || req.query.indice || 'Euríbor 12M';
    const anoInicio = parseInt(req.query.anoInicio) || 2015;
    const anoFin = parseInt(req.query.anoFin) || 2026;
    const mesRevision = req.query.mesRevision || 'Julio';
    const diferencial = parseFloat(req.query.diferencial) || 0.75;

    const historial = generarHistorialEuriborCompleto({
      tipoIndice,
      anoInicio,
      anoFin,
      mesRevision,
      diferencial
    });

    res.json({
      tipoIndice,
      anoInicio,
      anoFin,
      mesRevision,
      diferencial,
      historial
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Listar todos los préstamos y pasivos con su estado en tiempo real y tabla de amortización
router.get('/', (req, res) => {
  try {
    const pasivos = db.prepare(`
      SELECT id, nombre, capital_inicial, capital_pendiente, cuota_mensual,
             interes_nominal_anual, tipo_interes_modalidad, diferencial_euribor,
             historial_intereses_json, mes_revision, frecuencia_revision, proxima_revision_fecha,
             fecha_inicio, fecha_fin_prevista, fecha_actualizacion_saldo, tipo, numero_titulares, notas, created_at
      FROM prestamos_y_pasivos
      ORDER BY id ASC
    `).all();

    const conAmortizacion = pasivos.map(p => {
      const intVal = p.tipo_interes_modalidad === 'cero' ? 0 : (Number(p.interes_nominal_anual) || 0);
      let mesesRestantes = computeExactRemainingMonths(p.capital_pendiente, intVal, p.cuota_mensual);
      if (!mesesRestantes || isNaN(mesesRestantes)) mesesRestantes = 0;

      let historialIntereses = [];
      try {
        historialIntereses = JSON.parse(p.historial_intereses_json || '[]');
      } catch (e) {
        historialIntereses = [];
      }

      if (historialIntereses.length === 0 && p.interes_nominal_anual !== undefined) {
        historialIntereses = [{ ano: 2026, interes: p.interes_nominal_anual, notas: 'Tipo actual' }];
      }

      const totalAmortizado = Math.max(0, p.capital_inicial - p.capital_pendiente);
      const progresoAmortizadoPct = p.capital_inicial > 0 ? (totalAmortizado / p.capital_inicial) * 100 : 0;

      const schedule = calcularAmortizacion(
        p.capital_pendiente,
        p.interes_nominal_anual,
        mesesRestantes,
        p.cuota_mensual
      );

      return {
        ...p,
        totalAmortizado: Number(totalAmortizado.toFixed(2)),
        progresoAmortizadoPct: Number(progresoAmortizadoPct.toFixed(1)),
        historialIntereses,
        mesesRestantes,
        schedule
      };
    });

    res.json(conAmortizacion);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Cuadro de Amortización Completo a lo Largo de Toda la Vida del Préstamo
router.get('/:id/cuadro-vida', (req, res) => {
  try {
    const pasivo = db.prepare('SELECT * FROM prestamos_y_pasivos WHERE id = ?').get(req.params.id);
    if (!pasivo) {
      return res.status(404).json({ error: 'Pasivo no encontrado' });
    }

    const { calcularCuadroVidaCompleta } = require('../services/financeCalculator');
    const cuadro = calcularCuadroVidaCompleta(pasivo);

    res.json({
      pasivo,
      cuadro
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Simulador Integral de Escenarios
router.post('/simular-escenario', (req, res) => {
  try {
    const {
      capitalPendiente,
      interesAnual,
      cuotaMensual,
      mesesRestantes,
      amortizacionExtra = 0,
      modalidadAmortizacion = 'reducir_plazo',
      nuevoInteresAnual = null,
      esViviendaHabitual = false,
      regimenFiscal = 'general',
      numeroTitulares = 1
    } = req.body;

    const resultado = simularEscenarioPasivo({
      capitalPendiente,
      interesAnual,
      cuotaMensual,
      mesesRestantes,
      amortizacionExtra,
      modalidadAmortizacion,
      nuevoInteresAnual,
      esViviendaHabitual,
      regimenFiscal,
      numeroTitulares
    });

    res.json(resultado);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Endpoint del Simulador Universal de Nuevos Créditos y Carga Financiera Global (GET y POST)
// Endpoint del Simulador Universal de Nuevos Créditos y Carga Financiera Global (GET y POST)
router.get('/simulador-nuevo-credito', (req, res) => {
  try {
    const {
      nombre = 'Nuevo Crédito',
      concepto = 'Vehículo / Compra',
      importe = 30000,
      interes = 0,
      plazo = 5,
      cuota = null,
      fechaInicio = '2026-01-01',
      modalidad = 'variable',
      ingresos = null,
      editingId = null
    } = req.query;

    const { simularNuevoCreditoEImpactoGlobal } = require('../services/financeCalculator');
    const simulacion = simularNuevoCreditoEImpactoGlobal({
      nombre,
      concepto,
      importe: req.query.importe !== undefined && req.query.importe !== '' ? parseFloat(req.query.importe) : 30000,
      interesAnual: req.query.interes !== undefined && req.query.interes !== '' ? parseFloat(req.query.interes) : 0,
      plazoAnos: req.query.plazo !== undefined && req.query.plazo !== '' ? parseInt(req.query.plazo) : 5,
      cuotaMensualManual: cuota && cuota !== '' ? parseFloat(cuota) : null,
      fechaInicio: fechaInicio || '2026-01-01',
      modalidadInteres: modalidad || 'variable',
      ingresosMensualesManual: ingresos ? parseFloat(ingresos) : null,
      editingPasivoId: editingId ? parseInt(editingId) : null
    });

    res.json(simulacion);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/simulador-nuevo-credito', (req, res) => {
  try {
    const {
      nombre = 'Nuevo Crédito',
      concepto = 'Vehículo / Compra',
      importe = 30000,
      interes = 0,
      plazo = 5,
      cuota = null,
      fechaInicio = '2026-01-01',
      modalidad = 'variable',
      ingresos = null,
      editingId = null
    } = req.body;

    const { simularNuevoCreditoEImpactoGlobal } = require('../services/financeCalculator');
    const simulacion = simularNuevoCreditoEImpactoGlobal({
      nombre,
      concepto,
      importe: req.body.importe !== undefined && req.body.importe !== '' ? parseFloat(req.body.importe) : 30000,
      interesAnual: req.body.interes !== undefined && req.body.interes !== '' ? parseFloat(req.body.interes) : 0,
      plazoAnos: req.body.plazo !== undefined && req.body.plazo !== '' ? parseInt(req.body.plazo) : 5,
      cuotaMensualManual: cuota && cuota !== '' ? parseFloat(cuota) : null,
      fechaInicio: fechaInicio || '2026-01-01',
      modalidadInteres: modalidad || 'variable',
      ingresosMensualesManual: ingresos ? parseFloat(ingresos) : null,
      editingPasivoId: editingId ? parseInt(editingId) : null
    });

    res.json(simulacion);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Compatibilidad
router.get('/simulador-furgoneta', (req, res) => {
  try {
    const { simularNuevoCreditoEImpactoGlobal } = require('../services/financeCalculator');
    const simulacion = simularNuevoCreditoEImpactoGlobal({
      nombre: req.query.nombre || 'Nuevo Crédito',
      concepto: req.query.concepto || 'Vehículo',
      importe: parseFloat(req.query.importe) || 35000,
      interesAnual: parseFloat(req.query.interes) || 6.5,
      plazoAnos: parseInt(req.query.plazo) || 6,
      ingresosMensualesManual: req.query.ingresos ? parseFloat(req.query.ingresos) : null
    });

    res.json(simulacion);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Registrar Amortización Anticipada Extraordinaria vinculada a Cuenta Bancaria
router.post('/:id/registrar-amortizacion', (req, res) => {
  try {
    const pasivoId = parseInt(req.params.id);
    const {
      cuentaId,
      importe,
      fecha = new Date().toISOString().split('T')[0],
      modalidad = 'reducir_plazo',
      nuevaCuota = null,
      notas = ''
    } = req.body;

    const pasivo = db.prepare('SELECT * FROM prestamos_y_pasivos WHERE id = ?').get(pasivoId);
    if (!pasivo) {
      return res.status(404).json({ error: 'Pasivo / Préstamo no encontrado' });
    }

    const monto = parseFloat(importe);
    if (isNaN(monto) || monto <= 0) {
      return res.status(400).json({ error: 'El importe a amortizar debe ser superior a 0 €' });
    }

    const nuevoSaldo = Math.max(0, Number((pasivo.capital_pendiente - monto).toFixed(2)));
    let finalCuota = pasivo.cuota_mensual;
    let finalFechaFin = pasivo.fecha_fin_prevista;

    const intVal = pasivo.tipo_interes_modalidad === 'cero' ? 0 : (Number(pasivo.interes_nominal_anual) || 0);

    if (modalidad === 'reducir_cuota' && nuevaCuota && parseFloat(nuevaCuota) > 0) {
      finalCuota = parseFloat(nuevaCuota);
    } else if (modalidad === 'reducir_plazo') {
      // Recalcular meses restantes y nueva fecha fin prevista exacta a partir de la fecha de amortización
      const nuevoMesesRest = computeExactRemainingMonths(nuevoSaldo, intVal, finalCuota);
      const baseDate = fecha || new Date().toISOString().split('T')[0];
      finalFechaFin = computeFechaFinFromDate(baseDate, nuevoMesesRest) || pasivo.fecha_fin_prevista;
    }

    // 1. Actualizar el saldo vivo, cuota y fecha de fin prevista del pasivo
    db.prepare(`
      UPDATE prestamos_y_pasivos
      SET capital_pendiente = ?,
          cuota_mensual = ?,
          fecha_fin_prevista = ?,
          fecha_actualizacion_saldo = ?
      WHERE id = ?
    `).run(nuevoSaldo, finalCuota, finalFechaFin, fecha, pasivoId);

    // 2. Buscar categoría adecuada (Vivienda / Hipoteca / Préstamos) o defecto
    let cat = db.prepare("SELECT id FROM categorias WHERE LOWER(nombre) LIKE '%hipoteca%' OR LOWER(nombre) LIKE '%prestamo%' OR LOWER(nombre) LIKE '%vivienda%' LIMIT 1").get();
    const catId = cat ? cat.id : 1;

    // 3. Crear apunte bancario en movimientos
    const cId = parseInt(cuentaId) || 1;
    const descModalidad = modalidad === 'reducir_plazo' ? 'Reducción de Plazo' : 'Reducción de Cuota';
    const concepto = `Amortización Anticipada: ${pasivo.nombre} (${descModalidad})`;
    const notaCompleta = notas 
      ? `${notas} | Amortización de ${monto.toLocaleString('es-ES')} € en ${pasivo.nombre}. Saldo resultante: ${nuevoSaldo.toLocaleString('es-ES')} €`
      : `Amortización extraordinaria de ${monto.toLocaleString('es-ES')} € en ${pasivo.nombre}. Saldo resultante: ${nuevoSaldo.toLocaleString('es-ES')} €`;

    db.prepare(`
      INSERT INTO movimientos (
        cuenta_id, categoria_id, fecha, concepto, importe,
        es_transferencia_interna, es_consolidado, etiqueta_especial, notas, usuario_id
      ) VALUES (?, ?, ?, ?, ?, 0, 1, 'Amortización Extraordinaria', ?, 1)
    `).run(
      cId,
      catId,
      fecha,
      concepto,
      -monto,
      notaCompleta
    );

    res.json({
      success: true,
      message: `¡Amortización de ${monto.toLocaleString('es-ES')} € registrada con éxito y cargada en la cuenta bancaria!`,
      nuevoSaldo,
      nuevaCuota: finalCuota,
      pasivoId
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Crear nuevo pasivo
router.post('/', (req, res) => {
  try {
    const {
      nombre,
      capital_inicial,
      capital_pendiente,
      cuota_mensual,
      interes_nominal_anual = 0,
      tipo_interes_modalidad = 'variable',
      diferencial_euribor = 0,
      indice_referencia = 'Euríbor 12M',
      historial_intereses_json = '[]',
      mes_revision = 'Julio',
      frecuencia_revision = 'Anual',
      proxima_revision_fecha = '',
      fecha_inicio,
      fecha_fin_prevista,
      fecha_actualizacion_saldo,
      tipo = 'personal',
      numero_titulares = 1,
      notas = ''
    } = req.body;

    if (!nombre || capital_inicial === undefined || capital_pendiente === undefined || cuota_mensual === undefined) {
      return res.status(400).json({ error: 'Faltan campos obligatorios (nombre, capital_inicial, capital_pendiente, cuota_mensual)' });
    }

    const jsonStr = typeof historial_intereses_json === 'string' 
      ? historial_intereses_json 
      : JSON.stringify(historial_intereses_json);

    const stmt = db.prepare(`
      INSERT INTO prestamos_y_pasivos (
        nombre, capital_inicial, capital_pendiente, cuota_mensual,
        interes_nominal_anual, tipo_interes_modalidad, diferencial_euribor, indice_referencia,
        historial_intereses_json, mes_revision, frecuencia_revision, proxima_revision_fecha,
        fecha_inicio, fecha_fin_prevista, fecha_actualizacion_saldo, tipo, numero_titulares, notas
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const info = stmt.run(
      nombre,
      Number(capital_inicial),
      Number(capital_pendiente),
      Number(cuota_mensual),
      Number(interes_nominal_anual),
      tipo_interes_modalidad,
      Number(diferencial_euribor || 0),
      indice_referencia || 'Euríbor 12M',
      jsonStr,
      mes_revision || 'Julio',
      frecuencia_revision || 'Anual',
      proxima_revision_fecha || null,
      fecha_inicio || null,
      fecha_fin_prevista || null,
      fecha_actualizacion_saldo || new Date().toISOString().split('T')[0],
      tipo,
      Number(numero_titulares) || 1,
      notas
    );

    const nuevo = db.prepare('SELECT * FROM prestamos_y_pasivos WHERE id = ?').get(info.lastInsertRowid);
    res.status(201).json(nuevo);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Actualizar pasivo
router.put('/:id', (req, res) => {
  try {
    const {
      nombre,
      capital_inicial,
      capital_pendiente,
      cuota_mensual,
      interes_nominal_anual,
      tipo_interes_modalidad,
      diferencial_euribor,
      indice_referencia,
      historial_intereses_json,
      mes_revision,
      frecuencia_revision,
      proxima_revision_fecha,
      fecha_inicio,
      fecha_fin_prevista,
      fecha_actualizacion_saldo,
      tipo,
      numero_titulares,
      notas
    } = req.body;

    const jsonStr = historial_intereses_json !== undefined
      ? (typeof historial_intereses_json === 'string' ? historial_intereses_json : JSON.stringify(historial_intereses_json))
      : null;

    const stmt = db.prepare(`
      UPDATE prestamos_y_pasivos
      SET nombre = COALESCE(?, nombre),
          capital_inicial = COALESCE(?, capital_inicial),
          capital_pendiente = COALESCE(?, capital_pendiente),
          cuota_mensual = COALESCE(?, cuota_mensual),
          interes_nominal_anual = COALESCE(?, interes_nominal_anual),
          tipo_interes_modalidad = COALESCE(?, tipo_interes_modalidad),
          diferencial_euribor = COALESCE(?, diferencial_euribor),
          indice_referencia = COALESCE(?, indice_referencia),
          historial_intereses_json = COALESCE(?, historial_intereses_json),
          mes_revision = COALESCE(?, mes_revision),
          frecuencia_revision = COALESCE(?, frecuencia_revision),
          proxima_revision_fecha = COALESCE(?, proxima_revision_fecha),
          fecha_inicio = COALESCE(?, fecha_inicio),
          fecha_fin_prevista = COALESCE(?, fecha_fin_prevista),
          fecha_actualizacion_saldo = COALESCE(?, fecha_actualizacion_saldo),
          tipo = COALESCE(?, tipo),
          numero_titulares = COALESCE(?, numero_titulares),
          notas = COALESCE(?, notas)
      WHERE id = ?
    `);

    stmt.run(
      nombre,
      capital_inicial !== undefined ? Number(capital_inicial) : null,
      capital_pendiente !== undefined ? Number(capital_pendiente) : null,
      cuota_mensual !== undefined ? Number(cuota_mensual) : null,
      interes_nominal_anual !== undefined ? Number(interes_nominal_anual) : null,
      tipo_interes_modalidad,
      diferencial_euribor !== undefined ? Number(diferencial_euribor) : null,
      indice_referencia,
      jsonStr,
      mes_revision,
      frecuencia_revision,
      proxima_revision_fecha,
      fecha_inicio,
      fecha_fin_prevista,
      fecha_actualizacion_saldo,
      tipo,
      numero_titulares !== undefined ? Number(numero_titulares) : null,
      notas,
      req.params.id
    );

    const actualizado = db.prepare('SELECT * FROM prestamos_y_pasivos WHERE id = ?').get(req.params.id);
    res.json(actualizado);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Eliminar pasivo
router.delete('/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM prestamos_y_pasivos WHERE id = ?').run(req.params.id);
    res.json({ message: 'Pasivo eliminado con éxito' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
