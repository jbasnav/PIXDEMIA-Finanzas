const db = require('../db');
const { computeExactRemainingMonths, computeFechaFinFromDate } = require('./financeCalculator');

function calcularCapitalAmortizado(pasivo, montoImporte, esAmortizacionExtraordinaria = false) {
  const monto = Math.abs(Number(montoImporte) || 0);
  if (monto <= 0 || !pasivo) return 0;

  const sinInteres = pasivo.tipo_interes_modalidad === 'cero' || Number(pasivo.interes_nominal_anual) === 0;
  if (sinInteres || esAmortizacionExtraordinaria) {
    return Math.min(pasivo.capital_pendiente, monto);
  }

  const r = (Number(pasivo.interes_nominal_anual || 0) / 100) / 12;
  const interesMes = pasivo.capital_pendiente * r;
  const capitalPuro = Math.max(0, monto - interesMes);
  return Math.min(pasivo.capital_pendiente, capitalPuro);
}

function applyMovimientoPasivoImpact(mov) {
  if (!mov || !mov.pasivo_id || Number(mov.es_consolidado) !== 1 || Number(mov.importe) >= 0) {
    return;
  }

  const pasivo = db.prepare('SELECT * FROM prestamos_y_pasivos WHERE id = ?').get(mov.pasivo_id);
  if (!pasivo) return;

  const esExtra = mov.etiqueta_especial === 'Amortización Extraordinaria' || 
                  (mov.concepto && mov.concepto.toLowerCase().includes('amortización'));
  
  const amort = calcularCapitalAmortizado(pasivo, mov.importe, esExtra);
  if (amort <= 0) return;

  const nuevoSaldo = Math.max(0, Number((pasivo.capital_pendiente - amort).toFixed(2)));
  const intVal = pasivo.tipo_interes_modalidad === 'cero' ? 0 : (Number(pasivo.interes_nominal_anual) || 0);
  const mesesRest = computeExactRemainingMonths(nuevoSaldo, intVal, pasivo.cuota_mensual);
  const fechaOp = mov.fecha || new Date().toISOString().split('T')[0];
  const nuevaFechaFin = computeFechaFinFromDate(fechaOp, mesesRest) || pasivo.fecha_fin_prevista;

  db.prepare(`
    UPDATE prestamos_y_pasivos
    SET capital_pendiente = ?,
        fecha_fin_prevista = ?,
        fecha_actualizacion_saldo = ?
    WHERE id = ?
  `).run(nuevoSaldo, nuevaFechaFin, fechaOp, pasivo.id);
}

function reverseMovimientoPasivoImpact(mov) {
  if (!mov || !mov.pasivo_id || Number(mov.es_consolidado) !== 1 || Number(mov.importe) >= 0) {
    return;
  }

  const pasivo = db.prepare('SELECT * FROM prestamos_y_pasivos WHERE id = ?').get(mov.pasivo_id);
  if (!pasivo) return;

  const esExtra = mov.etiqueta_especial === 'Amortización Extraordinaria' || 
                  (mov.concepto && mov.concepto.toLowerCase().includes('amortización'));

  const amort = calcularCapitalAmortizado(pasivo, mov.importe, esExtra);
  if (amort <= 0) return;

  const restauradoSaldo = Math.min(pasivo.capital_inicial, Number((pasivo.capital_pendiente + amort).toFixed(2)));
  const intVal = pasivo.tipo_interes_modalidad === 'cero' ? 0 : (Number(pasivo.interes_nominal_anual) || 0);
  const mesesRest = computeExactRemainingMonths(restauradoSaldo, intVal, pasivo.cuota_mensual);
  const fechaOp = mov.fecha || new Date().toISOString().split('T')[0];
  const nuevaFechaFin = computeFechaFinFromDate(fechaOp, mesesRest) || pasivo.fecha_fin_prevista;

  db.prepare(`
    UPDATE prestamos_y_pasivos
    SET capital_pendiente = ?,
        fecha_fin_prevista = ?,
        fecha_actualizacion_saldo = ?
    WHERE id = ?
  `).run(restauradoSaldo, nuevaFechaFin, fechaOp, pasivo.id);
}

module.exports = {
  applyMovimientoPasivoImpact,
  reverseMovimientoPasivoImpact,
  calcularCapitalAmortizado
};
