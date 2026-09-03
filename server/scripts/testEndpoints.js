const db = require('../db');
const { getDashboardMetrics, simularPrestamoFurgoneta } = require('../services/financeCalculator');

async function runTests() {
  await db.ready;
  console.log('🧪 Iniciando verificación de reglas contables y lógica de negocio...\n');

  // Limpiar movimientos de pruebas previas
  db.prepare("DELETE FROM movimientos WHERE concepto LIKE '%Prueba%' OR concepto LIKE '%Nómina Enero%' OR concepto LIKE '%Compra semanal%' OR concepto LIKE '%Ahorro Imprevistos N26%'").run();

  // Test 1: Verificar saldo inicial y KPIs
  const initialMetrics = getDashboardMetrics(2026);
  console.log('1. Saldo Líquido Inicial 2026:', initialMetrics.kpis.saldoLiquido, '€');
  console.log('   Total Invertido Inicial:', initialMetrics.kpis.totalInvertido, '€');
  console.log('   Patrimonio Neto Inicial:', initialMetrics.kpis.patrimonioNeto, '€');

  // Test 2: Inserción de Ingreso (Nómina 3.200 € en Santander)
  const catNomina = db.prepare("SELECT id FROM categorias WHERE nombre = 'Ingresos Trabajo'").get();
  const cuentaSantander = db.prepare("SELECT id FROM cuentas WHERE nombre = 'Santander'").get();
  const cuentaN26 = db.prepare("SELECT id FROM cuentas WHERE nombre = 'N26'").get();

  db.prepare(`
    INSERT INTO movimientos (fecha, cuenta_id, categoria_id, subcategoria, concepto, importe, es_transferencia_interna)
    VALUES ('2026-01-05', ?, ?, 'Nómina', 'Nómina Enero', 3200.00, 0)
  `).run(cuentaSantander.id, catNomina.id);

  // Test 3: Inserción de Gasto de Consumo (Compra Eroski 150 € en Santander)
  const catAlimentacion = db.prepare("SELECT id FROM categorias WHERE nombre = 'Alimentación'").get();
  db.prepare(`
    INSERT INTO movimientos (fecha, cuenta_id, categoria_id, subcategoria, concepto, importe, es_transferencia_interna)
    VALUES ('2026-01-08', ?, ?, 'Eroski', 'Compra semanal', -150.00, 0)
  `).run(cuentaSantander.id, catAlimentacion.id);

  const postMovementMetrics = getDashboardMetrics(2026);
  console.log('\n2. Tras Nómina (+3200€) y Supermercado (-150€):');
  console.log('   Ingresos Netos:', postMovementMetrics.kpis.ingresosNetos, '€ (Esperado: 3200.00 €)');
  console.log('   Gastos Reales:', postMovementMetrics.kpis.gastosReales, '€ (Esperado: 150.00 €)');
  console.log('   Ahorro Neto:', postMovementMetrics.kpis.ahorroNeto, '€ (Esperado: 3050.00 €)');

  if (postMovementMetrics.kpis.ingresosNetos !== 3200 || postMovementMetrics.kpis.gastosReales !== 150) {
    throw new Error('❌ Fallo en cómputo de ingresos/gastos externos');
  }

  // Test 4: REGLA CRÍTICA -> Transferencia Interna (Traspaso de 1000 € de Santander a N26)
  const catTransf = db.prepare("SELECT id FROM categorias WHERE tipo = 'transferencia_interna'").get();
  db.prepare(`
    INSERT INTO movimientos (fecha, cuenta_id, categoria_id, subcategoria, concepto, importe, es_transferencia_interna, cuenta_destino_id)
    VALUES ('2026-01-10', ?, ?, 'Traspaso a N26', 'Ahorro Imprevistos N26', -1000.00, 1, ?)
  `).run(cuentaSantander.id, catTransf.id, cuentaN26.id);

  const postTransferMetrics = getDashboardMetrics(2026);
  console.log('\n3. Tras Transferencia Interna Santander ➔ N26 (-1000 € / +1000 €):');
  console.log('   Ingresos Netos (debe ser idéntico 3200€):', postTransferMetrics.kpis.ingresosNetos, '€');
  console.log('   Gastos Reales (debe ser idéntico 150€):', postTransferMetrics.kpis.gastosReales, '€');
  console.log('   Impacto Neto en P&L Familiar:', (postTransferMetrics.kpis.ingresosNetos - 3200), '€');

  const santanderPost = postTransferMetrics.saldosCuentas.find(c => c.nombre === 'Santander');
  const n26Post = postTransferMetrics.saldosCuentas.find(c => c.nombre === 'N26');
  console.log('   Saldo Santander:', santanderPost.saldoActual, '€ (4500 + 3200 - 150 - 1000 = 6550 €)');
  console.log('   Saldo N26:', n26Post.saldoActual, '€ (8500 + 1000 = 9500 €)');

  if (postTransferMetrics.kpis.ingresosNetos !== 3200 || postTransferMetrics.kpis.gastosReales !== 150) {
    throw new Error('❌ Violación de regla contable: La transferencia interna ha alterado el P&L familiar');
  }
  if (santanderPost.saldoActual !== 6550 || n26Post.saldoActual !== 9500) {
    throw new Error('❌ Fallo en actualización de saldos por cuenta de la transferencia');
  }

  // Test 5: Simulador de Furgoneta Camper
  const sim = simularPrestamoFurgoneta({ importe: 35000, interesAnual: 6.5, plazoAnos: 6 });
  console.log('\n4. Simulador Furgoneta Camper (35.000 €, 6 años, 6.5% TIN):');
  console.log('   Cuota Mensual Furgoneta:', sim.resultados.cuotaMensual, '€/mes');
  console.log('   Intereses Totales:', sim.resultados.totalIntereses, '€');
  console.log('   Ingresos Mensuales Considerados:', sim.resultados.ingresoMensualFamiliar, '€/mes');
  console.log('   Cuotas Totales (Actuales + Furgoneta):', sim.resultados.cuotaTotalFutura, '€/mes');
  console.log('   Ratio Endeudamiento Futuro (DTI):', sim.resultados.ratioEndeudamientoFuturo, '%');
  console.log('   Viabilidad Bancaria (< 35%):', sim.resultados.esViableBancos ? 'APROBADO' : 'CUIDADO (>35%)');

  console.log('\n======================================================');
  console.log('✅ TODAS LAS PRUEBAS DE REGLAS CONTABLES Y SIMULADORES HAN PASADO CON ÉXITO');
  console.log('======================================================\n');
}

runTests().catch(console.error);
