const db = require('../db');

async function main() {
  await db.ready;
  console.log('✅ Base de datos SQLite inicializada correctamente.');
  
  const cuentas = db.prepare('SELECT nombre, tipo, saldo_inicial_2026 FROM cuentas').all();
  console.log('\n--- Cuentas Configuradas ---');
  console.table(cuentas);

  const categorias = db.prepare('SELECT id, nombre, tipo FROM categorias').all();
  console.log(`\nTotal de categorías registradas: ${categorias.length}`);

  const pasivos = db.prepare('SELECT nombre, capital_pendiente, cuota_mensual FROM prestamos_y_pasivos').all();
  console.log('\n--- Pasivos y Préstamos Registrados ---');
  console.table(pasivos);
}

main().catch(console.error);
