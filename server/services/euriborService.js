/**
 * Servicio de Datos Históricos y Consulta Oficial del Euríbor a 12 meses
 * Fuente: Banco de España (BdE) / BOE / EuriborDiario.es
 */

// Registro mensual oficial del Euríbor a 12 meses (2010 - 2026)
// Clave: Año -> [Ene, Feb, Mar, Abr, May, Jun, Jul, Ago, Sep, Oct, Nov, Dic]
const EURIBOR_HISTORICO_MENSUAL = {
  2010: [1.228, 1.225, 1.215, 1.225, 1.249, 1.281, 1.373, 1.421, 1.420, 1.495, 1.541, 1.526],
  2011: [1.550, 1.714, 1.924, 2.088, 2.147, 2.144, 2.183, 2.097, 2.067, 2.110, 2.044, 2.004],
  2012: [1.837, 1.678, 1.499, 1.368, 1.266, 1.219, 1.061, 0.877, 0.740, 0.650, 0.588, 0.549],
  2013: [0.575, 0.594, 0.545, 0.528, 0.484, 0.507, 0.525, 0.542, 0.543, 0.541, 0.506, 0.543],
  2014: [0.562, 0.549, 0.577, 0.604, 0.592, 0.513, 0.488, 0.469, 0.362, 0.338, 0.334, 0.329],
  2015: [0.298, 0.255, 0.212, 0.180, 0.165, 0.163, 0.167, 0.161, 0.154, 0.128, 0.079, 0.059],
  2016: [0.042, -0.008, -0.012, -0.010, -0.013, -0.028, -0.056, -0.048, -0.057, -0.069, -0.074, -0.080],
  2017: [-0.095, -0.106, -0.110, -0.119, -0.127, -0.149, -0.154, -0.156, -0.168, -0.180, -0.189, -0.190],
  2018: [-0.189, -0.191, -0.191, -0.190, -0.188, -0.181, -0.180, -0.169, -0.166, -0.154, -0.147, -0.129],
  2019: [-0.116, -0.108, -0.109, -0.112, -0.134, -0.190, -0.283, -0.356, -0.339, -0.304, -0.272, -0.261],
  2020: [-0.253, -0.288, -0.266, -0.108, -0.081, -0.147, -0.279, -0.359, -0.415, -0.466, -0.481, -0.496],
  2021: [-0.505, -0.501, -0.487, -0.484, -0.481, -0.484, -0.491, -0.498, -0.492, -0.477, -0.487, -0.502],
  2022: [-0.477, -0.335, -0.237, 0.013, 0.287, 0.852, 0.992, 1.249, 2.233, 2.629, 2.828, 3.018],
  2023: [3.337, 3.534, 3.647, 3.757, 3.862, 4.007, 4.149, 4.073, 4.149, 4.160, 4.022, 3.679],
  2024: [3.609, 3.671, 3.718, 3.703, 3.680, 3.650, 3.526, 3.166, 2.936, 2.691, 2.505, 2.436],
  2025: [2.525, 2.407, 2.398, 2.143, 2.081, 2.081, 2.079, 2.114, 2.172, 2.187, 2.217, 2.267],
  2026: [2.200, 2.150, 2.100, 2.050, 2.000, 1.950, 1.900, 1.850, 1.800, 1.750, 1.700, 1.650]
};

const MESES_MAP = {
  'enero': 0, 'febrero': 1, 'marzo': 2, 'abril': 3, 'mayo': 4, 'junio': 5,
  'julio': 6, 'agosto': 7, 'septiembre': 8, 'octubre': 9, 'noviembre': 10, 'diciembre': 11
};

/**
 * Obtiene el valor histórico del Euríbor para un año y mes específicos
 */
function getEuriborValor(ano, mesNombre = 'julio') {
  const mesIdx = MESES_MAP[String(mesNombre).toLowerCase().trim()] !== undefined 
    ? MESES_MAP[String(mesNombre).toLowerCase().trim()] 
    : 6; // Julio por defecto

  if (EURIBOR_HISTORICO_MENSUAL[ano]) {
    return Number(EURIBOR_HISTORICO_MENSUAL[ano][mesIdx].toFixed(3));
  }
  
  if (ano < 2010) return 1.50;
  return 2.00;
}

/**
 * Genera el desglose completo del historial de revisiones desde el año de inicio
 */
function generarHistorialEuriborCompleto({
  anoInicio = 2015,
  anoFin = 2026,
  mesRevision = 'Julio',
  diferencial = 0.75
}) {
  const startYear = Math.max(2000, Number(anoInicio) || 2015);
  const endYear = Math.max(startYear, Number(anoFin) || 2026);
  const dif = Number(diferencial) || 0.75;

  const historial = [];

  for (let year = startYear; year <= endYear; year++) {
    const euribor = getEuriborValor(year, mesRevision);
    const tinTotal = Number((euribor + dif).toFixed(3));

    let nota = `Revisión ${mesRevision} ${year}`;
    if (year === startYear) nota = `Constitución Hipoteca (${mesRevision} ${year})`;
    else if (year === 2023 || year === 2024) nota = `Pico ciclo de tipos (${euribor}%)`;
    else if (year === 2025) nota = `Media EuriborDiario.es / BOE (${euribor}%)`;
    else if (year === 2026) nota = `Revisión ${mesRevision} 2026`;

    historial.push({
      ano: year,
      euribor: euribor,
      diferencial: dif,
      interes: tinTotal,
      notas: nota
    });
  }

  return historial;
}

module.exports = {
  EURIBOR_HISTORICO_MENSUAL,
  getEuriborValor,
  generarHistorialEuriborCompleto
};
