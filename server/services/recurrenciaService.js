/**
 * Servicio de Generación y Gestión de Series Repetitivas / Recurrencias
 */

function addMonthsPreservingDay(baseYear, baseMonth, baseDay, monthsToAdd) {
  // baseMonth is 0-indexed (0 = Jan, 11 = Dec)
  const targetYear = baseYear + Math.floor((baseMonth + monthsToAdd) / 12);
  const targetMonth = (baseMonth + monthsToAdd) % 12;
  
  // Maximum days in target month
  const maxDays = new Date(targetYear, targetMonth + 1, 0).getDate();
  const day = Math.min(baseDay, maxDays);
  
  const yStr = String(targetYear);
  const mStr = String(targetMonth + 1).padStart(2, '0');
  const dStr = String(day).padStart(2, '0');
  return `${yStr}-${mStr}-${dStr}`;
}

function addDays(dateStr, daysToAdd) {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + daysToAdd);
  const yStr = d.getFullYear();
  const mStr = String(d.getMonth() + 1).padStart(2, '0');
  const dStr = String(d.getDate()).padStart(2, '0');
  return `${yStr}-${mStr}-${dStr}`;
}

/**
 * Calcula el listado de fechas futuras para una serie repetitiva
 * @param {Object} options
 * @param {string} options.fechaBase - Fecha inicial del movimiento de referencia (YYYY-MM-DD)
 * @param {string} options.frecuencia - 'mensual', 'quincenal', 'semanal', 'bimestral', 'trimestral', 'semestral', 'anual'
 * @param {string} options.modoFin - 'fecha_fin' | 'numero_cuotas' | 'solo_fin'
 * @param {string} [options.fechaFin] - Fecha límite máxima (YYYY-MM-DD)
 * @param {number} [options.numeroCuotas] - Número total de ocurrencias o repeticiones a generar
 * @param {boolean} [options.incluirBase=false] - Si se debe incluir la fecha base en el array resultante
 * @returns {Array<string>} Array de fechas en formato YYYY-MM-DD
 */
function calcularFechasSerie({
  fechaBase,
  frecuencia = 'mensual',
  modoFin = 'fecha_fin',
  fechaFin = null,
  numeroCuotas = 12,
  incluirBase = false
}) {
  if (!fechaBase) return [];

  const [startY, startM, startD] = fechaBase.split('-').map(Number);
  const baseYear = startY;
  const baseMonth = startM - 1; // 0-indexed
  const baseDay = startD;

  const fechas = [];
  if (incluirBase) {
    fechas.push(fechaBase);
  }

  const maxSafetyLimit = 240; // Límite máximo de 20 años / 240 cuotas
  let maxOccurrences = maxSafetyLimit;

  if (modoFin === 'numero_cuotas' && numeroCuotas > 0) {
    maxOccurrences = Math.min(Number(numeroCuotas) - (incluirBase ? 1 : 0), maxSafetyLimit);
  }

  let step = 1;
  while (fechas.length < (incluirBase ? maxOccurrences + 1 : maxOccurrences)) {
    let nextDateStr = '';

    switch (frecuencia) {
      case 'semanal':
        nextDateStr = addDays(fechaBase, step * 7);
        break;
      case 'quincenal':
        nextDateStr = addDays(fechaBase, step * 14);
        break;
      case 'bimestral':
        nextDateStr = addMonthsPreservingDay(baseYear, baseMonth, baseDay, step * 2);
        break;
      case 'trimestral':
        nextDateStr = addMonthsPreservingDay(baseYear, baseMonth, baseDay, step * 3);
        break;
      case 'semestral':
        nextDateStr = addMonthsPreservingDay(baseYear, baseMonth, baseDay, step * 6);
        break;
      case 'anual':
        nextDateStr = addMonthsPreservingDay(baseYear, baseMonth, baseDay, step * 12);
        break;
      case 'mensual':
      default:
        nextDateStr = addMonthsPreservingDay(baseYear, baseMonth, baseDay, step);
        break;
    }

    // Comprobar condición de fin por fecha
    if ((modoFin === 'fecha_fin' || modoFin === 'solo_fin') && fechaFin) {
      if (nextDateStr > fechaFin) {
        break; // Alcanzado el límite de fecha
      }
    }

    fechas.push(nextDateStr);
    step++;

    if (step > maxSafetyLimit) break;
  }

  return fechas;
}

module.exports = {
  calcularFechasSerie,
  addMonthsPreservingDay,
  addDays
};
