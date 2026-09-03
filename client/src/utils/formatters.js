/**
 * Formateador de moneda en Euros (€) formato estándar español
 */
export function formatCurrency(amount) {
  if (amount === undefined || amount === null || isNaN(amount)) return '0,00 €';
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
}

/**
 * Formateador de porcentajes
 */
export function formatPercent(value) {
  if (value === undefined || value === null || isNaN(value)) return '0.0%';
  return `${Number(value).toFixed(1)}%`;
}

/**
 * Formateador de fechas ISO a formato legible (DD/MM/YYYY o DD de Mes)
 */
export function formatDate(isoString, format = 'short') {
  if (!isoString) return '';
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return isoString;

  if (format === 'short') {
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }

  return date.toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
}

/**
 * Obtener nombre del mes en español
 */
export const MONTHS = [
  { value: 1, label: 'Enero' },
  { value: 2, label: 'Febrero' },
  { value: 3, label: 'Marzo' },
  { value: 4, label: 'Abril' },
  { value: 5, label: 'Mayo' },
  { value: 6, label: 'Junio' },
  { value: 7, label: 'Julio' },
  { value: 8, label: 'Agosto' },
  { value: 9, label: 'Septiembre' },
  { value: 10, label: 'Octubre' },
  { value: 11, label: 'Noviembre' },
  { value: 12, label: 'Diciembre' }
];

export function getMonthName(monthNumber) {
  const m = MONTHS.find(item => item.value === Number(monthNumber));
  return m ? m.label : '';
}
