const path = require('path');
const fs = require('fs');
const db = require('../db');
const { parseExcelFile } = require('../services/excelParser');

async function main() {
  await db.ready;

  // Buscar archivo pasado por argumento o en la raíz del proyecto
  const defaultPaths = [
    process.argv[2],
    path.resolve(__dirname, '../../00. Balance 2026 IA.xlsx'),
    path.resolve(__dirname, '../../Balance 2026.xlsx'),
    path.resolve(__dirname, '../data/00. Balance 2026 IA.xlsx'),
    path.resolve(process.cwd(), '00. Balance 2026 IA.xlsx')
  ];

  let targetFile = null;
  for (const p of defaultPaths) {
    if (p && fs.existsSync(p)) {
      targetFile = p;
      break;
    }
  }

  if (!targetFile) {
    console.log('⚠️  No se encontró el archivo Excel en las rutas por defecto.');
    console.log('Uso: node server/scripts/importExcel.js "ruta/a/00. Balance 2026 IA.xlsx"');
    console.log('También puedes importarlo directamente desde la interfaz web.');
    process.exit(0);
  }

  console.log(`📂 Iniciando importación desde: ${targetFile}`);
  try {
    // Limpiar importación previa para evitar duplicados y cálculos erróneos
    db.prepare("DELETE FROM movimientos WHERE origen_importacion = 'Importacion_Balance_2026' OR origen_importacion IS NULL").run();
    console.log('🧹 Limpieza de datos previos completada.');

    const result = parseExcelFile(targetFile);
    console.log('==============================================');
    console.log('✅ IMPORTACIÓN COMPLETADA CON ÉXITO');
    console.log(`- Saldos iniciales de cuentas actualizados: ${result.saldosActualizados}`);
    console.log(`- Movimientos nuevos importados: ${result.movimientosImportados}`);
    console.log(`- Movimientos duplicados ignorados: ${result.movimientosDuplicadosIgnorados}`);
    if (result.errores.length > 0) {
      console.log(`- Errores encontrados: ${result.errores.join(', ')}`);
    }
    console.log('==============================================');
  } catch (error) {
    console.error('❌ Error durante la importación:', error.message);
    process.exit(1);
  }
}

main().catch(console.error);
